import Foundation

enum APIError: Error, LocalizedError {
    case invalidResponse
    case http(Int)
    case message(String)
    case missingConfig(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from the server."
        case .http(let code):
            return "Server error (HTTP \(code))."
        case .message(let text):
            return text
        case .missingConfig(let key):
            return "Missing configuration: \(key). Add to Info.plist."
        }
    }
}

/// Native API client mirroring the React Native `api/client.ts` behavior:
/// every request carries a `User-Agent` header (the backend rejects requests
/// without one) and the auth token is injected from the shared Keychain.
struct APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    static let tmdbBaseURL = "https://api.themoviedb.org/3"
    static let tmdbAPIKey: String
    private let userAgent = "ZStream-iOS/1.4.2 (CFNetwork)"

    private init() {
        // Load from Info.plist (set via xcconfig/environment)
        guard let tmdbKey = Bundle.main.infoDictionary?["TMDB_API_KEY"] as? String,
              !tmdbKey.isEmpty else {
            fatalError("TMDB_API_KEY not found in Info.plist. Add it via xcconfig or build settings.")
        }
        Self.tmdbAPIKey = tmdbKey

        let backendURL = Bundle.main.infoDictionary?["BACKEND_URL"] as? String ?? "https://backend.zstream.mov"
        guard let url = URL(string: backendURL) else {
            fatalError("Invalid BACKEND_URL in Info.plist")
        }
        self.baseURL = url
    }

    /// Generic JSON request against the ZStream backend.
    func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        authenticated: Bool = false
    ) async throws -> T {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15

        if authenticated, let token = KeychainAuth.shared.retrieve(forAccount: "auth_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(http.statusCode)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }

    /// POST /auth/password/login { username, password, device }
    func login(username: String, password: String, device: String) async throws -> LoginResponse {
        try await request(
            "/auth/password/login",
            method: "POST",
            body: ["username": username, "password": password, "device": device]
        )
    }

    /// Home rows: trending, popular movies, popular TV (mirrors the site's discovery).
    func homeRows() async throws -> [TMDBRow] {
        async let trending = tmdbResults(path: "/trending/all/week")
        async let movies = tmdbResults(
            path: "/discover/movie",
            query: [("sort_by", "popularity.desc"), ("vote_count.gte", "200")]
        )
        async let shows = tmdbResults(
            path: "/discover/tv",
            query: [("sort_by", "popularity.desc"), ("vote_count.gte", "200")]
        )
        let (t, m, s) = try await (trending, movies, shows)
        return [
            TMDBRow(title: "Trending", items: t.filter { $0.mediaType != "person" }),
            TMDBRow(title: "Popular Movies", items: m),
            TMDBRow(title: "Popular TV", items: s),
        ]
    }

    /// Combined movie + TV search (search/multi drops person results).
    func search(query: String) async throws -> [TMDBItem] {
        let items = try await tmdbResults(path: "/search/multi", query: [("query", query)])
        return items.filter { $0.mediaType == "movie" || $0.mediaType == "tv" }
    }

    func details(type: String, id: Int) async throws -> TMDBItem {
        try await tmdbObject(path: "/\(type)/\(id)")
    }

    func showDetails(id: Int) async throws -> TMDBShowDetails {
        try await tmdbDecode(path: "/tv/\(id)", query: [("append_to_response", "external_ids,credits,content_ratings")])
    }

    func seasonDetails(tvId: Int, seasonNumber: Int) async throws -> TMDBSeasonDetails {
        try await tmdbDecode(path: "/tv/\(tvId)/season/\(seasonNumber)", query: [])
    }

    /// Generate embed URL for playback (uses vidsrc.to)
    func embedURL(for item: TMDBItem, season: Int? = nil, episode: Int? = nil) -> URL? {
        if item.isTV, let season = season, let episode = episode {
            return URL(string: "https://vidsrc.to/embed/tv/\(item.id)/\(season)/\(episode)")
        } else {
            return URL(string: "https://vidsrc.to/embed/movie/\(item.id)")
        }
    }

    private func tmdbResults(path: String, query: [(String, String)] = []) async throws -> [TMDBItem] {
        try await tmdbDecode(path: path, query: query) as TMDBTrendingResponse
    }

    private func tmdbObject(path: String, query: [(String, String)] = []) async throws -> TMDBItem {
        try await tmdbDecode(path: path, query: query) as TMDBItem
    }

    private func tmdbDecode<T: Decodable>(path: String, query: [(String, String)]) async throws -> T {
        var components = URLComponents(string: Self.tmdbBaseURL + path)!
        components.queryItems = [
            URLQueryItem(name: "api_key", value: Self.tmdbAPIKey),
            URLQueryItem(name: "language", value: "en-US"),
        ] + query.map { URLQueryItem(name: $0.0, value: $0.1) }

        guard let url = components.url else { throw APIError.invalidResponse }
        var request = URLRequest(url: url)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        request.timeoutInterval = 15

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(http.statusCode)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }
}
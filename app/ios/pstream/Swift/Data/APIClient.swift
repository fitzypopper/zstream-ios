import Foundation

enum APIError: Error, LocalizedError {
    case invalidResponse
    case http(Int)
    case message(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from the server."
        case .http(let code):
            return "Server error (HTTP \(code))."
        case .message(let text):
            return text
        }
    }
}

/// Native API client mirroring the React Native `api/client.ts` behavior:
/// every request carries a `User-Agent` header (the backend rejects requests
/// without one) and the auth token is injected from the shared Keychain.
struct APIClient {
    static let shared = APIClient()

    private let baseURL = URL(string: "https://backend.zstream.mov")!
    private let tmdbBaseURL = "https://api.themoviedb.org/3"
    private let tmdbAPIKey =
        "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkMGI2OTRhM2IwYjUwMDgxYmIwNzU4MjYyMjAxMzFmNCIsIm5iZiI6MTcyNTQ0OTI3My45OTk5OTksInN1YiI6IjY2ZDFiY2IwMDNhMjM4NzY5MGMwMjVjMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jGqSqoUGQdXMCN0CGnFC9NFHV3D7AlO2lWY00sYfxEk"
    private let userAgent = "ZStream-iOS/1.4.2 (CFNetwork)"

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
        return try JSONDecoder().decode(T.self, from: data)
    }

    /// POST /auth/password/login { username, password, device }
    func login(username: String, password: String) async throws -> LoginResponse {
        try await request(
            "/auth/password/login",
            method: "POST",
            body: ["username": username, "password": password, "device": "zstream-ios"]
        )
    }

    /// Combined TMDB trending movies + TV (mirrors the RN fetchHome slice).
    func trending() async throws -> [TMDBItem] {
        async let movies = tmdb(path: "/trending/movie/week")
        async let shows = tmdb(path: "/trending/tv/week")
        let (movieItems, showItems) = try await (movies, shows)
        return Array((movieItems + showItems).prefix(20))
    }

    private func tmdb(path: String) async throws -> [TMDBItem] {
        var components = URLComponents(string: tmdbBaseURL + path)!
        components.queryItems = [
            URLQueryItem(name: "api_key", value: tmdbAPIKey),
            URLQueryItem(name: "language", value: "en-US"),
        ]

        guard let url = components.url else { throw APIError.invalidResponse }
        var request = URLRequest(url: url)
        request.setValue(userAgent, forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.http(http.statusCode)
        }
        return try JSONDecoder().decode(TMDBTrendingResponse.self, from: data).results
    }
}
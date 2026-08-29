import Foundation

// MARK: - Auth (mirrors app/api/types.ts, live movie-web shapes)

struct LoginResponse: Decodable {
    let token: String
    let session: AuthSession
    let user: AuthUser?
}

struct AuthSession: Decodable {
    let id: String
    /// NOTE: the user-id field is `user`, NOT `userId`, in the live API.
    let user: String
    let device: String
}

struct AuthUser: Decodable {
    let id: String
    let nickname: String?
    let profile: ProfileImage?
}

struct ProfileImage: Decodable {
    let colorA: String?
    let colorB: String?
    let icon: String?
}

// MARK: - TMDB discovery (mirrors app/api/pstream.ts fetchHome)

struct TMDBTrendingResponse: Decodable {
    let results: [TMDBItem]
}

struct TMDBItem: Decodable, Identifiable {
    let id: Int
    let title: String?
    let name: String?
    let posterPath: String?
    let backdropPath: String?
    let overview: String?
    let releaseDate: String?
    let firstAirDate: String?
    let voteAverage: Double?
    let mediaType: String?

    enum CodingKeys: String, CodingKey {
        case id, title, name, overview
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case releaseDate = "release_date"
        case firstAirDate = "first_air_date"
        case voteAverage = "vote_average"
        case mediaType = "media_type"
    }

    var displayTitle: String {
        title ?? name ?? "Unknown"
    }

    var year: Int? {
        guard let raw = releaseDate ?? firstAirDate, raw.count >= 4 else { return nil }
        return Int(raw.prefix(4))
    }

    var isTV: Bool {
        mediaType == "tv" || (mediaType == nil && name != nil)
    }

    var posterURL: URL? {
        guard let posterPath = posterPath else { return nil }
        return URL(string: "https://image.tmdb.org/t/p/w500\(posterPath)")
    }
}
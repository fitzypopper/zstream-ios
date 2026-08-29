import Foundation

// MARK: - Auth (mirrors app/api/types.ts, live movie-web shapes)

struct LoginResponse: Decodable {
    let token: String
    let session: AuthSession
    let user: AuthUser?
}

struct AuthSession: Decodable {
    let id: String
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

// MARK: - TMDB discovery

struct TMDBRow: Identifiable {
    let title: String
    let items: [TMDBItem]
    var id: String { title }
}

struct TMDBTrendingResponse: Decodable {
    let results: [TMDBItem]
}

struct TMDBItem: Decodable, Identifiable, Hashable {
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
    let genreIds: [Int]?

    enum CodingKeys: String, CodingKey {
        case id, title, name, overview
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case releaseDate = "release_date"
        case firstAirDate = "first_air_date"
        case voteAverage = "vote_average"
        case mediaType = "media_type"
        case genreIds = "genre_ids"
    }

    var displayTitle: String { title ?? name ?? "Unknown" }

    var year: Int? {
        guard let raw = releaseDate ?? firstAirDate, raw.count >= 4 else { return nil }
        return Int(raw.prefix(4))
    }

    var isTV: Bool { mediaType == "tv" || (mediaType == nil && name != nil) }
    var kind: String { isTV ? "tv" : "movie" }

    var posterURL: URL? {
        guard let posterPath = posterPath else { return nil }
        var components = URLComponents(string: "https://image.tmdb.org/t/p/w500/")!
        components.path.append(posterPath)
        return components.url
    }

    var backdropURL: URL? {
        guard let backdropPath = backdropPath else { return nil }
        var components = URLComponents(string: "https://image.tmdb.org/t/p/w780/")!
        components.path.append(backdropPath)
        return components.url
    }
}

// MARK: - TMDB TV Details (Seasons & Episodes)

struct TMDBSeason: Decodable, Identifiable, Hashable {
    let id: Int
    let seasonNumber: Int
    let name: String?
    let episodeCount: Int?
    let posterPath: String?
    let airDate: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case seasonNumber = "season_number"
        case episodeCount = "episode_count"
        case posterPath = "poster_path"
        case airDate = "air_date"
    }

    var displayName: String { name ?? "Season \(seasonNumber)" }
}

struct TMDBEpisode: Decodable, Identifiable, Hashable {
    let id: Int
    let episodeNumber: Int
    let name: String?
    let overview: String?
    let stillPath: String?
    let airDate: String?
    let voteAverage: Double?

    enum CodingKeys: String, CodingKey {
        case id, name, overview
        case episodeNumber = "episode_number"
        case stillPath = "still_path"
        case airDate = "air_date"
        case voteAverage = "vote_average"
    }

    var stillURL: URL? {
        guard let stillPath = stillPath else { return nil }
        var components = URLComponents(string: "https://image.tmdb.org/t/p/w300/")!
        components.path.append(stillPath)
        return components.url
    }
}

struct TMDBShowDetails: Decodable {
    let seasons: [TMDBSeason]?
    let id: Int
    let name: String?
    let overview: String?
    let firstAirDate: String?
    let posterPath: String?
    let backdropPath: String?
    let voteAverage: Double?
    let numberOfSeasons: Int?
    let numberOfEpisodes: Int?

    enum CodingKeys: String, CodingKey {
        case seasons, id, name, overview
        case firstAirDate = "first_air_date"
        case posterPath = "poster_path"
        case backdropPath = "backdrop_path"
        case voteAverage = "vote_average"
        case numberOfSeasons = "number_of_seasons"
        case numberOfEpisodes = "number_of_episodes"
    }
}

struct TMDBSeasonDetails: Decodable {
    let episodes: [TMDBEpisode]
    let id: Int
    let name: String?
    let overview: String?
    let airDate: String?
    let posterPath: String?

    enum CodingKeys: String, CodingKey {
        case episodes, id, name, overview
        case airDate = "air_date"
        case posterPath = "poster_path"
    }
}

// MARK: - Playback Source

struct PlaySource: Identifiable, Hashable {
    let id: String
    let title: String
    let url: URL
    let type: String // "embed", "hls", "mp4"
    let quality: String?
}
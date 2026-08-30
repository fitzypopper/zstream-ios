import SwiftUI
import WebKit

struct HomeView: View {
    @EnvironmentObject private var store: ZStreamStore

    var body: some View {
        NavigationView {
            Group {
                if store.isLoadingHome && store.homeRows.isEmpty {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if store.homeRows.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "film")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("Nothing to show right now.")
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 28) {
                            ForEach(store.homeRows) { row in
                                SectionRow(row: row)
                            }
                        }
                        .padding(.vertical, 16)
                    }
                    .refreshable {
                        await store.loadHome()
                    }
                }
            }
            .background(ZStreamTheme.background.ignoresSafeArea())
            .navigationTitle("Home")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task { await store.loadHome() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(store.isLoadingHome)
                }
            }
        }
    }
}

struct SectionRow: View {
    let row: TMDBRow

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(row.title)
                .font(.title2.bold())
                .foregroundColor(.primary)
                .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 16) {
                    ForEach(row.items) { item in
                        NavigationLink(destination: DetailsView(item: item)) {
                            PosterCard(item: item)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }
}

// HomeViewWrapper removed - using NavigationView with inline NavigationLink destinations

struct PosterCard: View {
    let item: TMDBItem

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AsyncImage(url: item.posterURL) { phase in
                if let image = phase.image {
                    image
                        .resizable()
                        .aspectRatio(2 / 3, contentMode: .fill)
                } else if phase.error != nil {
                    placeholder
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .aspectRatio(2 / 3, contentMode: .fit)
                }
            }
            .frame(width: 130, height: 195)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)

            Text(item.displayTitle)
                .font(.footnote.weight(.medium))
                .lineLimit(2)
                .frame(width: 130, alignment: .leading)

            Text(detailLine)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
                .frame(width: 130, alignment: .leading)
        }
    }

    private var placeholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(ZStreamTheme.surface)
            Text(String(item.displayTitle.prefix(1)).uppercased())
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(.secondary)
        }
        .aspectRatio(2 / 3, contentMode: .fit)
        .frame(width: 130, height: 195)
    }

    private var detailLine: String {
        var parts: [String] = []
        if let year = item.year { parts.append("\(year)") }
        parts.append(item.isTV ? "TV" : "Movie")
        if let rating = item.voteAverage {
            parts.append(String(format: "%.1f", rating))
        }
        return parts.joined(separator: " · ")
    }
}

// MARK: - Search View

struct SearchView: View {
    @EnvironmentObject private var store: ZStreamStore
    @State private var query = ""
    @State private var debounceTask: Task<Void, Never>?

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search bar
                HStack(spacing: 12) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.secondary)
                    TextField("Search movies & shows…", text: $query)
                        .textInputAutocapitalization(.never)
                        .onChange(of: query) { newValue in
                            debounceTask?.cancel()
                            debounceTask = Task {
                                try? await Task.sleep(nanoseconds: 300_000_000)
                                if !Task.isCancelled {
                                    await store.search(query: newValue)
                                }
                            }
                        }
                    if !query.isEmpty {
                        Button { query = "" } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.secondarySystemBackground))
                )
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .onDisappear {
                    debounceTask?.cancel()
                }

                // Results
                Group {
                    if store.isSearching {
                        ProgressView("Searching…")
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if query.isEmpty {
                        VStack(spacing: 16) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            Text("Search for movies or TV shows")
                                .font(.headline)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if store.searchResults.isEmpty {
                        VStack(spacing: 16) {
                            Image(systemName: "film")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            Text("No results for \"\(query)\"")
                                .font(.headline)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(store.searchResults) { item in
                                    NavigationLink(destination: DetailsView(item: item)) {
                                        SearchResultRow(item: item)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 16)
                        }
                    }
                }
            }
            .background(ZStreamTheme.background.ignoresSafeArea())
            .navigationTitle("Search")
        }
    }
}

struct SearchResultRow: View {
    let item: TMDBItem

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: item.posterURL) { phase in
                if let image = phase.image {
                    image.resizable().aspectRatio(2/3, contentMode: .fill)
                } else {
                    Rectangle().fill(ZStreamTheme.surface)
                }
            }
            .frame(width: 70, height: 105)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(item.displayTitle)
                    .font(.subheadline.weight(.medium))
                    .lineLimit(2)
                Text(detailLine)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(ZStreamTheme.tertiaryText)
        }
        .padding(.vertical, 4)
    }

    private var detailLine: String {
        var parts: [String] = []
        if let year = item.year { parts.append("\(year)") }
        parts.append(item.isTV ? "TV" : "Movie")
        if let rating = item.voteAverage { parts.append(String(format: "%.1f", rating)) }
        return parts.joined(separator: " · ")
    }
}

// MARK: - Details View (will be defined in separate file for clarity, but keeping here to avoid new file registration)
// DetailsView is in a separate file - see below

// MARK: - Player View (WKWebView embed)

struct PlayerView: View {
    let item: TMDBItem
    let season: Int?
    let episode: Int?
    @Environment(\.dismiss) private var dismiss

    @State private var isLoading = true

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let url = APIClient.shared.embedURL(for: item, season: season, episode: episode) {
                WebView(url: url, isLoading: $isLoading)
                    .ignoresSafeArea()
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 48))
                        .foregroundColor(.red)
                    Text("Unable to load player")
                        .font(.headline)
                        .foregroundColor(.white)
                }
            }

            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.5)
            }

            // Close button overlay
            VStack {
                HStack {
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white.opacity(0.8))
                            .shadow(radius: 4)
                    }
                    .padding(16)
                }
                Spacer()
            }
        }
        .navigationBarHidden(true)
    }
}

// MARK: - WebView Wrapper

import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false

        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.setValue("ZStream-iOS/1.4.2", forHTTPHeaderField: "User-Agent")
        webView.load(request)

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(isLoading: $isLoading)
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        @Binding var isLoading: Bool

        init(isLoading: Binding<Bool>) { _isLoading = isLoading }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            isLoading = true
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            isLoading = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            isLoading = false
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            isLoading = false
        }
    }
}

// MARK: - Details View

struct DetailsView: View {
    let item: TMDBItem
    @EnvironmentObject private var store: ZStreamStore

    @State private var showDetails: TMDBShowDetails?
    @State private var seasons: [TMDBSeason] = []
    @State private var selectedSeason: TMDBSeason?
    @State private var episodes: [TMDBEpisode] = []
    @State private var isLoadingSeasons = false
    @State private var isLoadingEpisodes = false
    @State private var errorMessage: String?
    @State private var detailTask: Task<Void, Never>?

    var body: some View {
        ZStack {
            ZStreamTheme.background.ignoresSafeArea()

            if item.isTV {
                tvDetailView
            } else {
                movieDetailView
            }
        }
        .navigationTitle(item.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            detailTask = Task { await loadDetails() }
        }
        .onDisappear {
            detailTask?.cancel()
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
    }

    private var movieDetailView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Backdrop
                AsyncImage(url: item.backdropURL) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .aspectRatio(16/9, contentMode: .fill)
                    } else {
                        ZStreamTheme.surface
                            .aspectRatio(16/9, contentMode: .fit)
                    }
                }
                .frame(maxWidth: .infinity)
                .clipped()

                VStack(alignment: .leading, spacing: 16) {
                    headerInfo
                    playButton
                    overviewSection
                }
                .padding(16)
            }
        }
    }

    private var tvDetailView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Backdrop
                AsyncImage(url: item.backdropURL) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .aspectRatio(16/9, contentMode: .fill)
                    } else {
                        ZStreamTheme.surface
                            .aspectRatio(16/9, contentMode: .fit)
                    }
                }
                .frame(maxWidth: .infinity)
                .clipped()

                VStack(alignment: .leading, spacing: 16) {
                    headerInfo
                    if let selectedSeason = selectedSeason {
                        seasonEpisodesView(season: selectedSeason)
                    } else {
                        seasonsGridView
                    }
                }
                .padding(16)
            }
        }
    }

    private var headerInfo: some View {
        HStack(alignment: .top, spacing: 16) {
            AsyncImage(url: item.posterURL) { phase in
                if let image = phase.image {
                    image.resizable().aspectRatio(2/3, contentMode: .fill)
                } else { ZStreamTheme.surface }
            }
            .frame(width: 120, height: 180)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)

            VStack(alignment: .leading, spacing: 8) {
                Text(item.displayTitle)
                    .font(.title2.bold())
                    .foregroundColor(.primary)
                Text(detailLine)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
    }

    private var playButton: some View {
        NavigationLink {
            PlayerView(item: item, season: nil, episode: nil)
        } label: {
            Label("Play", systemImage: "play.fill")
                .font(.headline)
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(ZStreamTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var overviewSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Overview")
                .font(.headline)
                .foregroundColor(.primary)
            Text(item.overview ?? "No overview available.")
                .font(.body)
                .foregroundColor(.secondary)
        }
    }

    private var seasonsGridView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Seasons")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                if isLoadingSeasons {
                    ProgressView()
                }
            }

            if seasons.isEmpty {
                Text("No seasons available")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 24)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                    ForEach(seasons) { season in
                        Button { selectedSeason = season } label: {
                            SeasonCard(season: season)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func seasonEpisodesView(season: TMDBSeason) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(season.displayName)
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                Button { selectedSeason = nil } label: {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundColor(ZStreamTheme.accent)
                }
                if isLoadingEpisodes { ProgressView() }
            }

            if episodes.isEmpty {
                Text("No episodes available")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 24)
            } else {
                LazyVStack(spacing: 8) {
                    ForEach(episodes) { episode in
                        EpisodeRow(episode: episode, seasonNumber: season.seasonNumber, item: item)
                    }
                }
            }
        }
    }

    private var detailLine: String {
        var parts: [String] = []
        if let year = item.year { parts.append("\(year)") }
        parts.append(item.isTV ? "TV" : "Movie")
        if let rating = item.voteAverage { parts.append(String(format: "%.1f", rating)) }
        return parts.joined(separator: " · ")
    }

    private func loadDetails() async {
        if item.isTV {
            await loadTVDetails()
        } else {
            do {
                try Task.checkCancellation()
                _ = try await APIClient.shared.details(type: "movie", id: item.id)
            } catch is CancellationError {
                return
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    private func loadTVDetails() async {
        isLoadingSeasons = true
        defer { isLoadingSeasons = false }

        do {
            try Task.checkCancellation()
            let details = try await APIClient.shared.showDetails(id: item.id)
            let validSeasons = details.seasons?.filter { $0.seasonNumber > 0 } ?? []
            seasons = validSeasons
            if let first = validSeasons.first {
                selectedSeason = first
                await loadEpisodes(for: first)
            }
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func loadEpisodes(for season: TMDBSeason) async {
        isLoadingEpisodes = true
        defer { isLoadingEpisodes = false }

        do {
            try Task.checkCancellation()
            let details = try await APIClient.shared.seasonDetails(tvId: item.id, seasonNumber: season.seasonNumber)
            episodes = details.episodes
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct SeasonCard: View {
    let season: TMDBSeason

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack {
                if let posterPath = season.posterPath,
                   let url = URL(string: "https://image.tmdb.org/t/p/w300\(posterPath)") {
                    AsyncImage(url: url) { phase in
                        if let image = phase.image {
                            image.resizable().aspectRatio(16/9, contentMode: .fill)
                        } else { ZStreamTheme.surface }
                    }
                } else {
                    ZStreamTheme.surface
                }
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Text("S\(season.seasonNumber)")
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.black.opacity(0.7))
                            .clipShape(Capsule())
                            .padding(8)
                    }
                }
            }
            .aspectRatio(16/9, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            Text(season.displayName)
                .font(.subheadline.weight(.medium))
                .lineLimit(1)
            if let count = season.episodeCount {
                Text("\(count) episodes")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct EpisodeRow: View {
    let episode: TMDBEpisode
    let seasonNumber: Int
    let item: TMDBItem

    var body: some View {
        NavigationLink {
            PlayerView(item: item, season: seasonNumber, episode: episode.episodeNumber)
        } label: {
            HStack(spacing: 12) {
                AsyncImage(url: episode.stillURL) { phase in
                    if let image = phase.image {
                        image.resizable().aspectRatio(16/9, contentMode: .fill)
                    } else { ZStreamTheme.surface }
                }
                .frame(width: 100, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 4) {
                    Text("E\(episode.episodeNumber)  \(episode.name ?? "Episode \(episode.episodeNumber)")")
                        .font(.subheadline.weight(.medium))
                        .lineLimit(1)
                    if let airDate = episode.airDate, !airDate.isEmpty {
                        Text(airDate)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "play.circle.fill")
                    .font(.title2)
                    .foregroundColor(ZStreamTheme.accent)
            }
        }
        .buttonStyle(.plain)
    }
}
import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: ZStreamStore

    private let columns = [GridItem(.adaptive(minimum: 120), spacing: 12)]

    var body: some View {
        NavigationView {
            Group {
                if store.isLoadingHome && store.trending.isEmpty {
                    ProgressView("Loading…")
                } else if store.trending.isEmpty {
                    Text("Nothing to show right now.")
                        .foregroundColor(.secondary)
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(store.trending) { item in
                                PosterCard(item: item)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Home")
            .task {
                await store.loadHome()
            }
        }
    }
}

struct PosterCard: View {
    let item: TMDBItem

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
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
            .frame(height: 180)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            Text(item.displayTitle)
                .font(.footnote)
                .lineLimit(2)
            Text(detailLine)
                .font(.caption2)
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var placeholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10)
                .fill(ZStreamTheme.surface)
            Text(String(item.displayTitle.prefix(1)).uppercased())
                .font(.largeTitle.bold())
                .foregroundColor(.secondary)
        }
        .aspectRatio(2 / 3, contentMode: .fit)
    }

    private var detailLine: String {
        var parts: [String] = []
        if let year = item.year {
            parts.append("\(year)")
        }
        parts.append(item.isTV ? "TV" : "Movie")
        if let rating = item.voteAverage {
            parts.append(String(format: "%.1f", rating))
        }
        return parts.joined(separator: " · ")
    }
}
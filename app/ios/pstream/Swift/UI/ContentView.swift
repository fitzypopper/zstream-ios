import SwiftUI

/// Main SwiftUI composition root. Shows login when signed out, tabs when in.
struct ContentView: View {
    @EnvironmentObject private var store: ZStreamStore

    var body: some View {
        switch store.authState {
        case .signedOut:
            LoginView()
        case .signedIn:
            AppTabView()
        }
    }
}

struct AppTabView: View {
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection) {
            NavigationStack {
                HomeViewWrapper()
            }
            .tabItem {
                Label("Home", systemImage: "house.fill")
            }
            .tag(0)

            NavigationStack {
                SearchView()
            }
            .tabItem {
                Label("Search", systemImage: "magnifyingglass")
            }
            .tag(1)

            NavigationStack {
                SettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape.fill")
            }
            .tag(2)
        }
        .accentColor(ZStreamTheme.accent)
    }
}
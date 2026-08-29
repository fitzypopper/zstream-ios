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
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
    }
}
import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: ZStreamStore

    @State private var uiSelection: String = UISelection.current.rawValue
    @State private var showRestartAlert = false

    var body: some View {
        NavigationView {
            List {
                Section("Account") {
                    HStack {
                        Text("User")
                        Spacer()
                        Text(nickname)
                            .foregroundColor(.secondary)
                    }
                }

                Section("Interface") {
                    Picker("UI", selection: $uiSelection) {
                        Text("React Native").tag("reactNative")
                        Text("SwiftUI").tag("swiftUI")
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: uiSelection) { value in
                        guard let selection = UISelection(rawValue: value) else { return }
                        UISelection.current = selection
                        showRestartAlert = true
                    }
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        store.logout()
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Restart required", isPresented: $showRestartAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Fully close and reopen ZStream to switch the interface.")
            }
        }
    }

    private var nickname: String {
        if case .signedIn(_, let name) = store.authState {
            return name ?? "Unknown"
        }
        return "—"
    }
}
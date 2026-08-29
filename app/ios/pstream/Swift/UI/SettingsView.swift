import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var store: ZStreamStore

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(ZStreamTheme.primaryGradient)
                                .frame(width: 56, height: 56)
                            Text(nickname.prefix(1).uppercased())
                                .font(.title.bold())
                                .foregroundColor(.white)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text(nickname)
                                .font(.headline)
                            Text("Signed in")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                Section("Playback") {
                    HStack {
                        Label("Default Quality", systemImage: "video.badge.waveform")
                        Spacer()
                        Text("Auto")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Label("Auto-play Next", systemImage: "play.circle")
                        Spacer()
                        Toggle("", isOn: .constant(true))
                    }
                    HStack {
                        Label("Skip Intro", systemImage: "forward.frame")
                        Spacer()
                        Toggle("", isOn: .constant(true))
                    }
                }

                Section("Appearance") {
                    HStack {
                        Label("Theme", systemImage: "paintbrush")
                        Spacer()
                        Text("System")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Label("Compact Rows", systemImage: "rectangle.3.group")
                        Spacer()
                        Toggle("", isOn: .constant(false))
                    }
                }

                Section("Data & Privacy") {
                    HStack {
                        Label("Clear Cache", systemImage: "trash")
                        Spacer()
                        Text("2.4 MB")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Label("Download Quality", systemImage: "arrow.down.circle")
                        Spacer()
                        Text("1080p")
                            .foregroundColor(.secondary)
                    }
                }

                Section("About") {
                    HStack {
                        Label("Version", systemImage: "info.circle")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Label("Source Code", systemImage: "chevron.left.forwardslash.chevron.right")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.tertiary)
                    }
                    HStack {
                        Label("Report Issue", systemImage: "exclamationmark.bubble")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.tertiary)
                    }
                }

                Section {
                    Button(role: .destructive) {
                        store.logout()
                    } label: {
                        HStack {
                            Spacer()
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            Spacer()
                        }
                    }
                }
            }
            .background(ZStreamTheme.background.ignoresSafeArea())
            .navigationTitle("Settings")
        }
    }

    private var nickname: String {
        if case .signedIn(_, let name) = store.authState {
            return name ?? "Unknown"
        }
        return "—"
    }
}
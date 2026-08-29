import Foundation
import Combine

/// @MainActor observable data layer for SwiftUI views. Reads/writes the shared
/// Keychain so login state stays in sync with the React Native UI.
@MainActor
final class ZStreamStore: ObservableObject {
    static let shared = ZStreamStore()

    enum AuthState {
        case signedOut
        case signedIn(userId: String, nickname: String?)
    }

    @Published var authState: AuthState = .signedOut
    @Published var trending: [TMDBItem] = []
    @Published var isLoadingHome = false
    @Published var errorMessage: String?

    private init() {
        refreshAuthFromKeychain()
    }

    func refreshAuthFromKeychain() {
        guard let token = KeychainAuth.shared.retrieve(forAccount: "auth_token"),
              !token.isEmpty else {
            authState = .signedOut
            return
        }

        let userId = KeychainAuth.shared.retrieve(forAccount: "user_id") ?? ""
        var nickname: String? = nil
        if let raw = KeychainAuth.shared.retrieve(forAccount: "user_profile"),
           let data = raw.data(using: .utf8),
           let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] {
            nickname = (json["nickname"] as? String) ?? (json["id"] as? String)
        }

        authState = .signedIn(userId: userId, nickname: nickname)
    }

    func login(username: String, password: String) async {
        errorMessage = nil
        isLoadingHome = false
        do {
            let response = try await APIClient.shared.login(username: username, password: password)
            KeychainAuth.shared.save(response.token, forAccount: "auth_token")
            KeychainAuth.shared.save(response.session.user, forAccount: "user_id")

            var profileUser: [String: Any] = ["id": response.session.user]
            if let user = response.user {
                profileUser["nickname"] = user.nickname ?? ""
                profileUser["id"] = user.id
                if let profile = user.profile {
                    profileUser["profile"] = [
                        "colorA": profile.colorA ?? "",
                        "colorB": profile.colorB ?? "",
                        "icon": profile.icon ?? "",
                    ]
                }
            }
            if let profileData = try? JSONSerialization.data(withJSONObject: profileUser),
               let profileJSON = String(data: profileData, encoding: .utf8) {
                KeychainAuth.shared.save(profileJSON, forAccount: "user_profile")
            }

            refreshAuthFromKeychain()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() {
        KeychainAuth.shared.delete(forAccount: "auth_token")
        KeychainAuth.shared.delete(forAccount: "user_id")
        KeychainAuth.shared.delete(forAccount: "user_profile")
        trending = []
        errorMessage = nil
        authState = .signedOut
    }

    func loadHome() async {
        guard !isLoadingHome else { return }
        isLoadingHome = true
        errorMessage = nil
        defer { isLoadingHome = false }

        do {
            trending = try await APIClient.shared.trending()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
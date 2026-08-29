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
    @Published var homeRows: [TMDBRow] = []
    @Published var searchResults: [TMDBItem] = []
    @Published var isSearching = false
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

    func login(username: String, password: String, device: String) async {
        errorMessage = nil
        do {
            let response = try await APIClient.shared.login(username: username, password: password, device: device)
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
            await loadHome()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() {
        KeychainAuth.shared.delete(forAccount: "auth_token")
        KeychainAuth.shared.delete(forAccount: "user_id")
        KeychainAuth.shared.delete(forAccount: "user_profile")
        homeRows = []
        searchResults = []
        errorMessage = nil
        authState = .signedOut
    }

    func loadHome() async {
        guard !isLoadingHome else { return }
        isLoadingHome = true
        errorMessage = nil
        defer { isLoadingHome = false }

        do {
            homeRows = try await APIClient.shared.homeRows()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func search(query: String) async {
        guard !query.isEmpty else {
            searchResults = []
            return
        }
        isSearching = true
        defer { isSearching = false }
        do {
            searchResults = try await APIClient.shared.search(query: query)
        } catch {
            errorMessage = error.localizedDescription
            searchResults = []
        }
    }
}
import Foundation
import Security

/// Shared Keychain-backed storage for the app's three auth keys.
/// Thread-safe; called from both the React Native bridge and the SwiftUI app,
/// so auth state is shared across UI modes.
final class KeychainAuth {
    static let shared = KeychainAuth()

    private let service = "com.zstream.ios.auth"

    private init() {}

    @discardableResult
    func save(_ value: String, forAccount account: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        let baseQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]

        let statusUpdate = SecItemUpdate(
            baseQuery as CFDictionary,
            [kSecValueData as String: data] as CFDictionary
        )
        if statusUpdate == errSecSuccess {
            return true
        }
        if statusUpdate == errSecItemNotFound {
            var addQuery = baseQuery
            addQuery[kSecValueData as String] = data
            addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
            return SecItemAdd(addQuery as CFDictionary, nil) == errSecSuccess
        }
        return false
    }

    func retrieve(forAccount account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func delete(forAccount account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

/// React Native native module (bridged via ZStreamAuth.m).
/// Exposes the Keychain-backed auth keys and the UI selection preference so the
/// RN and SwiftUI sides share the same session and UI switch.
@objc(ZStreamAuth)
final class ZStreamAuth: NSObject {
    @objc(getItem:resolver:rejecter:)
    func getItem(
        _ key: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        resolver(KeychainAuth.shared.retrieve(forAccount: key))
    }

    @objc(setItem:value:resolver:rejecter:)
    func setItem(
        _ key: String,
        value: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        resolver(KeychainAuth.shared.save(value, forAccount: key))
    }

    @objc(removeItem:resolver:rejecter:)
    func removeItem(
        _ key: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        KeychainAuth.shared.delete(forAccount: key)
        resolver(NSNull())
    }

    @objc(getUISelection:rejecter:)
    func getUISelection(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        resolver(UISelection.current.rawValue)
    }

    @objc(setUISelection:resolver:rejecter:)
    func setUISelection(
        _ value: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        if let selection = UISelection(rawValue: value) {
            UISelection.current = selection
        }
        resolver(true)
    }
}
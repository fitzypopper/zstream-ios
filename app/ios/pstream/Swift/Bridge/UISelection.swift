import Foundation

/// Which UI the app launches into. Stored in UserDefaults on a shared key so
/// both the React Native bridge and the SwiftUI app can read/write it.
enum UISelection: String {
    case reactNative = "reactNative"
    case swiftUI = "swiftUI"

    static let storageKey = "zstream_ui_selection"
    static let defaultValue: UISelection = .reactNative

    static var current: UISelection {
        get {
            guard let raw = UserDefaults.standard.string(forKey: storageKey) else {
                return defaultValue
            }
            return UISelection(rawValue: raw) ?? defaultValue
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: storageKey)
        }
    }
}
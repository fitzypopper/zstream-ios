import SwiftUI

/// Design tokens matching the RN app's `app/theme/colors.ts` dark palette.
enum ZStreamTheme {
    static let accent = Color(red: 0.00, green: 0.48, blue: 1.00)   // #007AFF
    static let destructive = Color(red: 1.00, green: 0.23, blue: 0.19) // #FF3B30
    static let background = Color(uiColor: .systemBackground)
    static let surface = Color(uiColor: .secondarySystemBackground)
    static let card = Color(uiColor: .secondarySystemGroupedBackground)
    static let separator = Color(uiColor: .separator)
}
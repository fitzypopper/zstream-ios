import SwiftUI

/// Design tokens matching the RN app's `app/theme/colors.ts` dark palette.
enum ZStreamTheme {
    static let accent = Color(red: 0.00, green: 0.48, blue: 1.00)   // #007AFF
    static let accentSecondary = Color(red: 0.35, green: 0.34, blue: 0.84) // #5A56D6
    static let destructive = Color(red: 1.00, green: 0.23, blue: 0.19) // #FF3B30

    // Adaptive colors for both light/dark mode
    static let background = Color(uiColor: .systemBackground)
    static let surface = Color(uiColor: .secondarySystemBackground)
    static let card = Color(uiColor: .tertiarySystemBackground)
    static let separator = Color(uiColor: .separator)

    // Text colors
    static let primaryText = Color(uiColor: .label)
    static let secondaryText = Color(uiColor: .secondaryLabel)
    static let tertiaryText = Color(uiColor: .tertiaryLabel)

    // Gradients
    static let primaryGradient = LinearGradient(
        colors: [accent, accentSecondary],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let cardGradient = LinearGradient(
        colors: [surface, card],
        startPoint: .top,
        endPoint: .bottom
    )
}
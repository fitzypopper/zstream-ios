# ZStream SwiftUI Integration Plan

## Architecture

```
┌─────────────────────────────────────────┐
│              iOS App                     │
├─────────────────────────────────────────┤
│  Settings Toggle (UserDefaults)         │
│    ↓                    ↓               │
│  SwiftUI UI          React Native UI   │
│    ↓                    ↓               │
│  Shared Data Layer (API + Auth + Storage)│
└─────────────────────────────────────────┘
```

## Phase 1: Shared Data Layer

1. **Create `SharedDataBridge`** - React Native native module exposing API/auth to Swift
   - File: `ios/Bridge/SharedDataBridge.m` (ObjC bridge header)
   - File: `ios/Bridge/SharedDataBridge.swift` (Swift implementation)
   - Exposes: `login()`, `fetchHome()`, `search()`, `getBookmarks()`, `getProgress()`, etc.

2. **Create `SharedStorage`** - Bridge for MMKV/AsyncStorage → UserDefaults/CoreData
   - File: `ios/Bridge/SharedStorage.swift`
   - Exposes: `getAuthToken()`, `setAuthToken()`, `getUserProfile()`, etc.

3. **Create `DataLayer.swift`** - Swift side consuming the bridge
   - File: `ios/Bridge/DataLayer.swift`
   - ObservableObject that SwiftUI views can use with @StateObject/@ObservedObject

## Phase 2: SwiftUI Screens

4. **TabView** - Main navigation (Home, Latest, Search, Library, Settings)
   - File: `ios/SwiftUI/ContentView.swift`
   - SF Symbols for tab icons
   - iOS-native tab bar styling

5. **HomeView** - Hero + horizontal rows
   - File: `ios/SwiftUI/Home/HomeView.swift`
   - File: `ios/SwiftUI/Home/HeroView.swift`
   - File: `ios/SwiftUI/Home/MediaRow.swift`
   - AsyncImage for posters
   - Large title navigation

6. **LatestView** - Grid of latest movies/shows
   - File: `ios/SwiftUI/Latest/LatestView.swift`
   - LazyVGrid with poster cards
   - Pull-to-refresh

7. **SearchView** - Native search bar + results
   - File: `ios/SwiftUI/Search/SearchView.swift`
   - `.searchable` modifier (iOS 15+)
   - Debounced search

8. **LibraryView** - User's saved content
   - File: `ios/SwiftUI/Library/LibraryView.swift`
   - Segmented control (Bookmarks / Progress / Watch History)
   - Grouped list style

9. **PlayerView** - AVKit video player
   - File: `ios/SwiftUI/Player/PlayerView.swift`
   - AVPlayerViewController wrapper
   - Subtitle support
   - Quality selector

10. **SettingsView** - iOS-style grouped list with UI toggle
    - File: `ios/SwiftUI/Settings/SettingsView.swift`
    - UI Mode toggle (SwiftUI / React Native)
    - Account info
    - Paired TVs list

## Phase 3: UI Switching

11. **`UISelection` enum** - `.swiftUI` or `.reactNative`
    - File: `ios/Bridge/UISelection.swift`
    - Stored in UserDefaults

12. **`AppDelegate`** - Check preference, launch appropriate UI
    - File: `ios/AppDelegate.swift` (modify)
    - Check UserDefaults for UI preference
    - Launch SwiftUI or React Native root view

13. **Settings toggle** - Persists to UserDefaults, triggers app restart
    - Alert: "Switching UI requires app restart"

## File Structure

```
ios/
├── Bridge/
│   ├── SharedDataBridge.m          # React Native bridge (ObjC)
│   ├── SharedDataBridge.swift      # Swift implementation
│   ├── SharedStorage.swift         # Storage bridge
│   ├── DataLayer.swift             # Observable data layer
│   └── UISelection.swift           # UI mode enum
├── SwiftUI/
│   ├── ZStreamApp.swift            # SwiftUI app entry (@main)
│   ├── ContentView.swift           # Main TabView
│   ├── Home/
│   │   ├── HomeView.swift
│   │   ├── HeroView.swift
│   │   └── MediaRow.swift
│   ├── Latest/
│   │   └── LatestView.swift
│   ├── Search/
│   │   └── SearchView.swift
│   ├── Library/
│   │   └── LibraryView.swift
│   ├── Player/
│   │   └── PlayerView.swift
│   ├── Settings/
│   │   └── SettingsView.swift
│   └── Theme/
│       └── ZStreamTheme.swift      # iOS system colors, SF Pro
├── ReactNative/
│   └── RCTRootView+Manager.swift   # RN container wrapper
└── pstream/                        # Existing RN iOS files
    ├── AppDelegate.swift
    ├── Info.plist
    └── ...
```

## SwiftUI Design Tokens

```swift
// ZStreamTheme.swift
enum ZStreamColors {
    static let background = Color(.systemBackground)
    static let secondaryBackground = Color(.secondarySystemBackground)
    static let card = Color(.secondarySystemGroupedBackground)
    static let accent = Color(.systemBlue)      // #007AFF
    static let destructive = Color(.systemRed)  // #FF3B30
    static let textPrimary = Color(.label)
    static let textSecondary = Color(.secondaryLabel)
    static let separator = Color(.separator)
}

enum ZStreamFont {
    static let largeTitle = Font.largeTitle.bold()
    static let title1 = Font.title1
    static let title2 = Font.title2
    static let title3 = Font.title3
    static let headline = Font.headline
    static let body = Font.body
    static let callout = Font.callout
    static let subheadline = Font.subheadline
    static let footnote = Font.footnote
    static let caption = Font.caption
}
```

## Dependencies (for SwiftUI build)

- No additional SPM packages needed (AVKit, SwiftUI are built-in)
- React Native native modules for data bridge
- Consider: `Kingfisher` or `Nuke` for advanced image caching (optional)

## Notes

- SwiftUI requires iOS 14+ (recommend iOS 15+ for `.searchable`, async/await)
- RN native modules require ObjC bridge file
- UserDefaults for UI preference is simplest; could use Keychain for security
- App restart required for UI switch (no hot-reload for UI framework change)
- Shared auth state between both UIs via native module

---

*Created: 2026-08-29*
*Status: Planned - Not started*

# ZStream iOS Architecture

## Overview

ZStream is a native SwiftUI iOS app for streaming movies and TV shows. It replaced a React Native shell with a fully native implementation for better performance and iOS integration.

## Technology Stack

- **Language**: Swift 5.9+
- **Framework**: SwiftUI + Combine
- **Minimum iOS**: 15.1
- **Build**: Xcode 16.4, macOS 15 CI
- **Dependencies**: CocoaPods (React Native bridge), WebKit (WKWebView)
- **Authentication**: Keychain-backed, shared with RN bridge

## Project Structure

```
app/
├── ios/
│   ├── pstream/
│   │   ├── Swift/
│   │   │   ├── Data/
│   │   │   │   ├── APIClient.swift      # TMDB + Backend API
│   │   │   │   ├── Models.swift         # TMDB/TV models
│   │   │   │   └── ZStreamStore.swift   # Observable state
│   │   │   ├── UI/
│   │   │   │   ├── ContentView.swift    # Root + tabs
│   │   │   │   ├── HomeView.swift       # Home, Search, Details, Player
│   │   │   │   ├── LoginView.swift      # Auth UI
│   │   │   │   ├── SettingsView.swift   # Settings UI
│   │   │   │   └── Theme.swift          # Design tokens
│   │   │   └── Bridge/
│   │   │       ├── ZStreamAuth.swift    # Keychain + RN bridge
│   │   │       └── UISelection.swift    # UI mode switch
│   │   └── pstream.xcworkspace
│   ├── Podfile
│   └── Config.xcconfig
└── config/
    └── defaults.ts                       # RN TMDB key (synced)
```

## Key Components

### APIClient (`APIClient.swift`)
- **TMDB Integration**: Uses v3 API key from `Info.plist` (`TMDB_API_KEY`)
- **Endpoints**: Trending, Discover (movies/TV), Search, Details, Seasons, Episodes
- **Timeout**: 15s for all requests
- **Decoding**: `convertFromSnakeCase` for TMDB snake_case → Swift camelCase
- **Backend**: `backend.zstream.mov` (auth, user data)

### ZStreamStore (`ZStreamStore.swift`)
- `@MainActor` ObservableObject
- **Auth State**: `.signedOut` / `.signedIn(userId, nickname)`
- **Home**: `homeRows` = [Trending, Popular Movies, Popular TV]
- **Search**: Debounced (300ms), `searchResults`
- **Keychain**: Persists token, user_id, profile

### Authentication Flow
1. `LoginView` → user enters credentials + device name
2. `POST /auth/password/login` → backend
3. Token + session saved to Keychain via `KeychainAuth`
4. `refreshAuthFromKeychain()` → updates `authState`
5. `ContentView` switches to `AppTabView`

### UI Selection (RN ↔ SwiftUI)
- `UISelection` enum: `.reactNative` / `.swiftUI`
- Stored in `UserDefaults` with `NSLock` for thread safety
- `AppDelegate` reads at launch to choose root view
- RN bridge (`ZStreamAuth.m`) exposes get/set for sync

### Playback Pipeline
- **Metadata**: TMDB (posters, details, seasons/episodes)
- **Embed**: `vidsrc.to/embed/movie|tv/{id}[/season/episode]`
- **Player**: `WKWebView` with `allowsInlineMediaPlayback`
- **Fallback**: Error UI if embed URL unavailable

### Data Models
- `TMDBItem`: Movies/TV from TMDB (id, title, poster, year, type)
- `TMDBRow`: Section title + items (Home carousels)
- `TMDBSeason` / `TMDBEpisode`: TV hierarchy with images
- `PlaySource`: Future native stream support

## Build & CI

### Requirements
- Xcode 16.4+
- macOS 15 (CI runner)
- CocoaPods
- Node 20 (for RN bridge)

### Configuration (Info.plist)
```xml
<key>TMDB_API_KEY</key>
<string>$(TMDB_API_KEY)</string>
<key>BACKEND_URL</key>
<string>$(BACKEND_URL)</string>
```

### CI Workflow (`.github/workflows/ios-build.yml`)
1. Checkout + npm deps
2. Select Xcode 16.4
3. Install CocoaPods + `pod install`
4. Build with xcodebuild from repo root:
   ```bash
   xcodebuild \
     -workspace app/ios/pstream.xcworkspace \
     -scheme ZStream \
     -configuration Release \
     -sdk iphoneos \
     CODE_SIGNING_ALLOWED=NO \
     CODE_SIGNING_REQUIRED=NO \
     OTHER_LDFLAGS="$(inherited) -framework WebKit" \
     TMDB_API_KEY="${{ secrets.TMDB_API_KEY }}" \
     BACKEND_URL="${{ secrets.BACKEND_URL }}" \
     build
   ```
5. Package IPA (ad-hoc signed)
6. Upload artifact + draft release

### Required GitHub Secrets
- `TMDB_API_KEY`: v3 API key (e.g., `1865f43a0549ca50d341dd9ab8b29f49`)
- `BACKEND_URL`: `https://backend.zstream.mov`

## Concurrency & Thread Safety

### UISelection
```swift
private static let lock = NSLock()
static var current: UISelection {
    get { lock.lock(); defer { lock.unlock() }; ... }
    set { lock.lock(); defer { lock.unlock() }; ... }
}
```
- `UserDefaults` auto-syncs in iOS 13+, no `synchronize()`

### KeychainAuth
```swift
private let lock = NSLock()
func save(...) { lock.lock(); defer { lock.unlock() }; ... }
func retrieve(...) { lock.lock(); defer { lock.unlock() }; ... }
```
- Accessibility: `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`

### Task Cancellation
- `SearchView`: debounce task cancelled on `.onDisappear`
- `DetailsView`: `detailTask` cancelled on `.onDisappear` + `Task.checkCancellation()` in load methods

## Known Limitations & Future Work

1. **Playback**: Currently WKWebView embed; native AVPlayer with HLS parsing planned
2. **Sources**: No native scraper; uses vidsrc.to embed
3. **Offline**: Downloads not yet implemented
4. **Settings**: Mostly UI stubs; need persistence + actual functionality
5. **Error Handling**: Could add retry logic + user-facing error recovery

## Security Notes

- **No hardcoded secrets**: All API keys via build settings/secrets
- **Keychain**: `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
- **Network**: 15s timeout, TLS enforced via ATS
- **User Agent**: Custom `ZStream-iOS/1.4.2` for backend compatibility
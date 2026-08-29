# ZStream iOS - Critical Fixes Summary

## Issues Fixed (Commits 96af7a9 → cf95618)

### 1. APIClient Static Property Bug (CRITICAL)
**Problem**: `static let tmdbAPIKey` assigned in `init()` — won't compile (static let can't be set in instance init).

**Fix**: Changed to computed property reading from `Bundle.main.infoDictionary`:
```swift
static var tmdbAPIKey: String {
    guard let key = Bundle.main.infoDictionary?["TMDB_API_KEY"] as? String, !key.isEmpty else {
        fatalError("TMDB_API_KEY not found in Info.plist")
    }
    return key
}
```

### 2. Hardcoded Secrets → Build Settings
**Problem**: TMDB API key hardcoded in source.

**Fix**:
- `Info.plist`: `<string>$(TMDB_API_KEY)</string>`
- CI workflow passes `TMDB_API_KEY`/`BACKEND_URL` from GitHub Secrets to `xcodebuild`
- Removed literal key from `defaults.ts` (RN) and `APIClient.swift`

### 3. Concurrency Bugs

#### UISelection (UserDefaults Race)
```swift
// Before: No synchronization
// After: NSLock + removed deprecated synchronize()
private static let lock = NSLock()
static var current: UISelection {
    get { lock.lock(); defer { lock.unlock() }; ... }
    set { lock.lock(); defer { lock.unlock() }; ... }
}
```

#### KeychainAuth (Keychain Race)
```swift
// Added NSLock to all methods
private let lock = NSLock()
// Better security:
kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
```

### 4. URL Construction (Encoding Bug)
**Problem**: `components.path.append(posterPath)` doesn't encode properly.

**Fix**: Use `URLComponents` with explicit path:
```swift
var components = URLComponents()
components.scheme = "https"
components.host = "image.tmdb.org"
components.path = "/t/p/w500\(posterPath)"
```

### 5. SearchView Structure Corruption
**Problem**: Malformed `.onDisappear` + duplicated code blocks.

**Fix**: Clean single structure with proper `.onDisappear { debounceTask?.cancel() }` on search bar container.

### 5. Task Cancellation
- **SearchView**: `debounceTask?.cancel()` on `.onDisappear`
- **DetailsView**: `detailTask?.cancel()` + `Task.checkCancellation()` in all load methods
- Prevents stale API calls after navigation

### 6. Unused State Removal
- `PlayerView`: Removed unused `@State private var webView: WKWebView?`

### 7. WebView Improvements
- Timeout: 30s → 15s
- Added `didFailProvisionalNavigation` handler
- Custom User-Agent

### 8. APIClient Enhancements
- 15s timeout on all requests
- `keyDecodingStrategy = .convertFromSnakeCase`
- Proper `URLQueryItem` encoding

### 9. CI Configuration
- Build from repo root (fixes `SOURCE_ROOT` paths)
- `TMDB_API_KEY`/`BACKEND_URL` from GitHub Secrets → xcodebuild
- Created `Config.xcconfig` for reference

## Files Changed

| File | Changes |
|------|---------|
| `APIClient.swift` | Static key fix, timeouts, snake_case decoding |
| `Models.swift` | URLComponents for all image URLs |
| `ZStreamAuth.swift` | Keychain lock, better accessibility |
| `UISelection.swift` | NSLock, removed synchronize() |
| `HomeView.swift` | SearchView fix, PlayerView cleanup, DetailsView cancellation |
| `ContentView.swift` | Verified navigation structure |
| `Info.plist` | Build setting placeholders |
| `ios-build.yml` | Secrets → build settings, root build |
| `Config.xcconfig` | New reference file |

## Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `TMDB_API_KEY` | v3 API key (e.g., `1865f43a0549ca50d341dd9ab8b29f49`) |
| `BACKEND_URL` | `https://backend.zstream.mov` |

## Verification

All fixes maintain iOS 15.1 compatibility:
- NavigationView (not NavigationStack)
- .task/.onDisappear (iOS 15+)
- Task/async-await (iOS 15+)
- NSLock (all versions)
- URLComponents (all versions)
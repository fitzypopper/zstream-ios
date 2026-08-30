# ZStream iOS - Critical Fixes Summary

## CI Fix Round 4 (Commits 1c48500 → 47dac1c, 33306336161 ✅ GREEN)

### 14. OTHER_LDFLAGS CLI Override Dropped -ObjC/-lc++ (CRITICAL — final link failure)
**Problem**: Final link command was missing `-ObjC`/`-lc++`, so symbols from static ObjC libs weren't force-loaded:
```
Undefined symbols:
  "_OBJC_CLASS_$_RCTAppDependencyProvider"
  "_OBJC_CLASS_$_RCTDefaultReactNativeFactoryDelegate"
  "_OBJC_CLASS_$_RCTReactNativeFactory"
  "_RCTRegisterModule"
```

**Root cause**: CI passed `OTHER_LDFLAGS="$(inherited) -framework WebKit"` on the `xcodebuild` command line. A command-line setting **replaces** the project's `OTHER_LDFLAGS = ($(inherited), -ObjC, -lc++)`. The expanded value inherited the pod flags but NOT `-ObjC`/`-lc++`, so the React static libs' ObjC metadata (module registration) was stripped during link.

**Fix**: Link WebKit the native way instead of via an LDFLAGS override:
- `project.pbxproj`: added `WebKit.framework` as a `PBXFileReference` (SDKROOT) + `PBXBuildFile` entry in the Frameworks build phase.
- Removed the `OTHER_LDFLAGS=...` flag from `ios-build.yml` entirely — the project's `-ObjC -lc++` now applies again, and CocoaPods' own link flags are preserved.

**Result**: Build succeeded, `ZStream.ipa` (6.0M) built and uploaded as draft release. The `git...exit code 128` bash warning in the Create-draft-release step is benign (non-fatal; softprops tries a tag push that's not permitted in this private repo).

**Lesson**: Never override `OTHER_LDFLAGS` on the xcodebuild command line for an RN app — it silently drops `-ObjC`. Add frameworks via the Xcode project's Frameworks phase instead.

### 13. .foregroundColor(.tertiary) Type Error
**Problem**: `ForegroundStyleModifier` — `.tertiary` is a `HierarchicalShapeStyle`, not a `Color`, so `foregroundColor` failed to compile (`cannot convert value of type 'HierarchicalShapeStyle'`), and the cascade produced a generic-parameter-inference error in SettingsView.

**Fix**: Replaced all 3 uses of `.foregroundColor(.tertiary)` with `.foregroundColor(ZStreamTheme.tertiaryText)`.

---

## CI Fix Round 3 (Commits 651e5a5 → 2657f1e, e3602ae)

### 10. pbxproj Duplicate Path Bug (CRITICAL — blocked all CI builds)
**Problem**: All 11 Swift file references used `path = app/ios/pstream/Swift/...` with `sourceTree = SOURCE_ROOT`. `SOURCE_ROOT` = the `.xcodeproj`'s directory (`app/ios`), so Xcode resolved `app/ios + app/ios/pstream/...` → `Build input files cannot be found`.

**Fix**: Stripped the `app/ios/` prefix — paths now `pstream/Swift/...`, resolving correctly relative to `SOURCE_ROOT`:
```
path = app/ios/pstream/Swift/UI/ContentView.swift   →   path = pstream/Swift/UI/ContentView.swift
```
(The other references like `Info.plist`/`Images.xcassets` already used `pstream/...`; only the Swift files were broken.)

### 11. Missing `import React` in ZStreamAuth bridge (CRITICAL)
**Problem**: After the path fix, compilation failed with `cannot find type 'RCTPromiseResolveBlock'/'RCTPromiseRejectBlock' in scope` — the RN-bridged Swift module didn't import React.

**Fix**: Added `import React` to `ZStreamAuth.swift`. The app still bootstraps React Native (AppDelegate), so the bridge needs the RCT types.

### 12. BACKEND_URL Now Runtime-Configurable
**Problem**: BACKEND_URL was a CI build secret, baked in at build time and hidden.

**User decision**: The backend URL should be user-editable in Settings, not a build secret.

**Fix**:
- `APIClient` reads `UserDefaults` key `backend_url` first, falls back to Info.plist default.
- `SettingsView` → new **Backend** section with a text field; saved on navigate-away (`onDisappear`).
- CI no longer passes `BACKEND_URL`; Info.plist now uses a static default `https://backend.zstream.mov`.
- Only `TMDB_API_KEY` remains a GitHub secret.

---

## Earlier Fixes (Commits 96af7a9 → cf95618)

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
- `TMDB_API_KEY` from GitHub Secrets → xcodebuild (BACKEND_URL is no longer a secret — runtime-configurable)
- Created `Config.xcconfig` for reference

## Files Changed

| File | Changes |
|------|---------|
| `project.pbxproj` | Fixed 11 Swift file refs (removed `app/ios/` prefix); added `WebKit.framework` to Frameworks phase |
| `ZStreamAuth.swift` | Added `import React` (RCTPromise types), Keychain lock, better accessibility |
| `APIClient.swift` | Static key fix, timeouts, snake_case decoding, runtime backend URL + TMDB response unwrap |
| `SettingsView.swift` | New Backend section (URL text field, saved onDisappear); tertiary color fix |
| `HomeView.swift` | SearchView fix, PlayerView cleanup, DetailsView cancellation, tertiary color fix |
| `Models.swift` | URLComponents for all image URLs |
| `UISelection.swift` | NSLock, removed synchronize() |
| `ContentView.swift` | Verified navigation structure |
| `Info.plist` | `TMDB_API_KEY` build setting; static `BACKEND_URL` default |
| `ios-build.yml` | Root build, TMDB_API_KEY secret only; removed BACKEND_URL; **removed OTHER_LDFLAGS override** |
| `Config.xcconfig` | New reference file |
| `scripts/preflight.sh` | Local pre-flight: validates pbxproj paths, Info.plist XML, Swift sources, `.tertiary` usage |
| `docs/` | CI round 3/4 fix summaries |

## Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `TMDB_API_KEY` | v3 API key (e.g., `1865f43a0549ca50d341dd9ab8b29f49`) |

> `BACKEND_URL` is NOT a secret. Default `https://backend.zstream.mov` lives in Info.plist and is user-editable in Settings → Backend.

## Verification

All fixes maintain iOS 15.1 compatibility:
- NavigationView (not NavigationStack)
- .task/.onDisappear (iOS 15+)
- Task/async-await (iOS 15+)
- NSLock (all versions)
- URLComponents (all versions)
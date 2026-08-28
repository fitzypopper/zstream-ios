# **⚠️ build is broken do not download ⚠️** #


# ZStream

Open-source iOS client for ZStream (formerly P-Stream), built with React Native (TypeScript) and tuned for a native Apple feel.

## Features

- **Home / Latest / Search**: browse movies and TV with TMDB-backed posters and hero carousels.
- **Details**: rich media details, bookmark (add/remove) toggle, and cast.
- **Player**: streaming player with quality and subtitle selection, plus periodic watch-progress and history saving.
- **Library**: segmented Bookmarks / In Progress / History views backed by real backend data (pull-to-refresh, long-press to remove).
- **TV Sync**: pair your phone to a TV and cast/sync playback (Bonjour/mDNS discovery).
- **Trakt**: device-flow OAuth authorization and profile sync.
- **Auth**: passphrase and passkey login against the ZStream backend.

## Architecture

- Bare React Native app with a custom theme system (`ThemedView`, `ThemedText`, `ThemeProvider`) for an Apple-native look — no third-party UI library.
- Default mode connects to a hosted ZStream instance (`https://backend.zstream.mov/`); supports user-switchable instance URLs.

## Backend

ZStream API v2.1.5. Most endpoints require a Bearer token obtained by logging in. Some protocol details (streaming sources, phone-to-TV sync, Trakt OAuth) were reverse-engineered from the closed-source Android APK.

## Development

```bash
cd app
npm install
npm start        # Metro dev server
npm run ios      # run on iOS simulator
```

Requires Node `>=20`. Running on Android is not the target; the app is built for iOS.

## iOS Build (GitHub Actions)

An unsigned/ad-hoc-signed IPA is produced automatically by the `ios-build.yml` workflow on macOS runners:

```bash
gh workflow run ios-build.yml   # manual trigger
```

The build uses XcodeGen/CocoaPods (`ZStream.xcworkspace`, scheme `ZStream`) with signing disabled, then packages `ZStream.ipa` and uploads it as a workflow artifact.

## Features Roadmap

- Full SwiftUI rewrite with a Settings toggle between SwiftUI and React Native UIs (plan saved in `SWIFTUI_PLAN.md`).

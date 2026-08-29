# ZStream iOS (RN port) — Project State & Handoff

> Purpose: survive context windows. New char/session: read this first, then `docs/AUTH_FLOW_REVERSE_ENGINEERING.md` and `docs/IOS_BUILD_OPTIMIZATION_REPORT.md`. Everything here is up to date as of **2026-08-29**.

---

## 1. What this project is

A from-scratch **iOS app** (React Native) that ports the closed-source Android **ZStream** app (renamed from "P-Stream"). Goal: match the Android app's features with **Apple-native styling and behavior**. Automated **iOS IPAs** are built via **GitHub Actions** (no local Mac available — local dev machine is Arch Linux, no Xcode/CocoaPods).

- Specifically mobile iOS app.
- This is the actual objective: build a working, ad-hoc-signed iOS `.ipa`.

## 2. Repo & identity

- Repository: **`https://github.com/fitzypopper/zstream-ios`** (origin, `main`).
- Local checkout: **`/home/sigge/pstream-app`** — BUT the app lives in `/home/sigge/pstream-app/app/` (subdir). Package json / node_modules are in `app/`.
- GitHub identity: **fitzypopper**.
- iOS project: **`app/ios/`** — `.xcodeproj` = `pstream.xcodeproj`; CocoaPods names the workspace `pstream.xcworkspace`; scheme = `ZStream` (target `ZStream`, app `ZStream.app`).

## 3. Backend contract (live-verified)

- Backend: **`https://backend.zstream.mov/`** (API v2.1.5).
- **Auth switched to movie-web-style**: Ed25519 challenge + **username/password**. Backend now validates with **Zod** schemas (movie-web style) — the old PStream contracts are gone.
- User decision: **Username + password ONLY** (`POST /auth/password/login`). No passkey/passphrase implementation.

### Confirmed live shapes (ground-truthed 2026-08-29 with real creds)
- `POST /auth/password/login` body `{username, password, device}` → `{ user, session, token }`.
  - `session` = `{ id, user, created..., device, userAgent }` — **the user-id field is `session.user`, NOT `session.userId`!**
  - `user` = `{ id, publicKey, namespace, nickname, profile{icon,colorA,colorB}, permissions }`.
- `GET /users/@me` → `{ user, session }` (NOT a flat user; the app's `getCurrentUser()` type is stale).
- **Bookmark item**: `{ tmdbId, meta:{type:'movie'|'show',year,title,poster}, group[], favoriteEpisodes[], updatedAt }`.
  - `POST /users/{id}/bookmarks/{tmdbId}` body `{title, type:'movie'|'show'}` (required — 400 otherwise).
  - `DELETE` works.
- **Progress item**: `{ id, tmdbId, episode:{id,number}?, season:{id,number}?, meta:{...}, duration, watched, updatedAt }` (movie-web stores watched/duration as strings).
  - `PUT /users/{id}/progress/{tmdbId}` body `{tmdbId, meta, watched, duration, episode?, season?}` (watched/duration must be **numbers** in body).
  - `DELETE` works.
- `GET /users/{id}/settings` → `{id, applicationTheme, customTheme, ...}` works. `GET /users/{id}/group-order` → `{groupOrder:[]}` works.
- `PUT /users/{id}/watch-history/{tmdbId}` — **NOT a server bug**. The backend requires a `User-Agent` header on every request; without it, all writes (and login) get 500/403. Root cause found 2026-08-29: the iOS axios client sent none. FIXED in `app/api/client.ts` (`User-Agent: ZStream-iOS/1.4.2 (CFNetwork)`). With UA + full `WatchHistoryInput` body (`{tmdbId, meta:{type,title,year}, watched, duration, watchedAt, completed}`) → **200, verified live with real creds**.
- Normalize postman via `GET /users/{id}/watch-history` → returns `[]` (empty; fine).

## 4. What WORKS right now (verified end-to-end)

- **Login** with real username/password → returns token + session + user. ✅ (fixed from `session.userId` → `session.user`)
- **Library GET data**: bookmarks, progress, settings, group-order all load. ✅
- **Remove bookmark / clear progress** mutations work. ✅
- **iOS build produces a valid IPA** (ad-hoc signed, ~5.3 MB). ✅
- **51/51 Jest tests pass** (9 suites); `tsc --noEmit` clean.

## 5. What was changed in THIS session (uncommitted — READ THIS NEXT)

Working tree has **uncommitted** edits (see `git status`). These align the data layer to the movie-web backend AND fix type errors. Summary:

- `app/api/types.ts`: fixed `AuthSession.userId` → `user`. Added `MediaMeta`, rewrote `Bookmark`/`ProgressItem`/`WatchHistoryItem` to the live movie-web shapes (`meta`-based).
- `app/api/auth.ts`:
  - `addBookmark(userId, tmdbId, {title, type})` now sends the required body.
  - `updateProgress` sends movie-web body `{tmdbId, meta, watched, duration, episode?, season?}`.
  - `updateWatchHistory` sends `{tmdbId, meta, duration?, watched?}`.
- `app/hooks/useLibraryData.ts`: replaced the old TMDB-enriching `enrichItem()` with a `fromMeta()` mapper that reads the new `meta` field directly (no per-item TMDB call — faster and correct). Maps `'show'` → `'tv'`; reads `p.season.number`/`p.episode.number` (was `seasonNumber`/`episodeNumber`). Removed dead `enrichItem` + unused `fetchDetails` import.
- `app/screens/LoginScreen.tsx`: `session.user` not `session.userId` for storing the user id.
- `app/screens/DetailsScreen.tsx`: `addBookmark` now passes `{title, type: item.type==='tv'?'show':'movie'}`.
- `app/screens/PlayerScreen.tsx`: `updateProgress` and `updateWatchHistory` now send the movie-web meta bodies.
- `.gitignore`: added `.secrets.ignore` + `/tmp/harness/`.

**Status:** `tsc --noEmit` **clean**. Lint has 3 pre-existing errors in `App.tsx` (unused `useState`/`useEffect`) and `__tests__/apiClient.test.ts` (unused `CLIENT_IDENTIFIER`) — NOT caused by this session, do not block the IPA build. **These changes are NOT yet committed or pushed, and NOT yet re-built in CI** → the last IPA (run `33243945481`) contains the login fix but NOT the data-layer/meta fixes.

### Next actions (priority order)
1. **Verify Jest tests still pass** after the data-layer changes (`cd app && npm test`).
2. **Commit + push** the working-tree changes.
3. **Trigger a build** — confirm the data-layer changes compile in RN and the IPA is still produced. Because caches are now warm (see §7), this build should be faster than the ~13 min cold one.
4. (Blocked) `checkAuthStatus()` and `getCurrentUser()` still typed for the OLD backend:
   - `checkAuthStatus()` expects `{authenticated, userId}`; real is `{isLegacyPassphrase, hasPassword, username?, hasPasskey}`.
   - `getCurrentUser()` types `GET /users/@me` as `UserProfile`; real returns `UserWithSession {user, session}`.
   - Not called by any wired screen; safe to fix later.
5. ~~(Backend bug)~~ **RESOLVED**: watch-history `PUT` 500 was caused by the missing `User-Agent` header — fixed in `app/api/client.ts`, verified live (200).

## 6. Login flow specification

`POST /auth/password/login` `{username, password, device}`.
- `device` is a free-form string the app picks (currently `'zstream-ios'`; I used `'zstream-ios-harness'` in probes).
- Success → `{token, session, user}`. Store:
  - `setAuthToken(token)`
  - `setUserId(session.user)`
  - `setUserProfile(JSON {id, userId, nickname, profile})`
  - `notifyAuthChanged()`
- Most endpoints require `Authorization: Bearer <token>`.

Registration (implemented, not UI-wired): `POST /auth/password/register` `{username, password, device, namespace:'movie-web', profile:null}`.

## 7. iOS build & GitHub Actions

- Workflow: **`.github/workflows/ios-build.yml`** (`apps/…` no — it's `app/`). Runs on `macos-15`, no-signing `xcodebuild -workspace pstream.xcworkspace -scheme ZStream`, packages ad-hoc-signed `ZStream.ipa`, uploads artifact `ZStream-ipa`.
- Last successful build: run **`33243945481`** (13m16s cold) → IPA artifact **id `9712367566`** (~5.47 MB, SHA256 `39c5c1...`).
- **Caches added (commit `00dd573`)**: node_modules, CocoaPods spec repo, `Pods/` + CocoaPods cache, DerivedData; dropped `pod install --repo-update`. First run saved them (cold); **next run should be faster (~4-6 min warm)**.
- Harmless annotation: `git submodule foreach` posts a warning `fatal: No url found for submodule path 'backend'` (a stray `.gitmodules` entry) — it does NOT fail the build.
- `Podfile.lock` is NOT committed (generated by `pod install` in CI).
- Node 20 deprecation warnings on some GH actions — cosmetic.

## 8. Local verification harness (how "fake use the app" was done)

Node scripts in `/home/sigge/pstream-app/app/tmp/harness/` (git-ignored) that hit the live backend exactly like the app, using real credentials:
- `verify.js` — login + GET library + mutations, reports ✅/❌ per endpoint.
- `probe.js`, `probe3.js`, `wh.js` — shape discovery.
- Credentials live in `/home/sigge/pstream-app/.secrets.ignore` (git-ignored, `chmod 600`): `USERNAME=fitzy`, `PASSWORD=...`.
- **Important**: the harness needs a `User-Agent` header, else the backend 500s on login.
- Always clean up test items you create in the user's real account (bookmark/progress `DELETE`).

## 9. Repo layout & important files

```
app/                                          # the RN app (package.json here)
  .github/workflows/ios-build.yml             # iOS CI build (cached)
  app/                                        # RN source
    api/auth.ts  api/types.ts  api/pstream.ts # API layer (types/aligned in this session)
    screens/LoginScreen.tsx  DetailsScreen.tsx PlayerScreen.tsx ...
    hooks/useLibraryData.ts                   # library hook (rewritten this session)
    config/env.ts                             # setAuthToken/setUserId/setUserProfile/notifyAuthChanged
    ios/...                                   # Xcode project (pstream.xcodeproj), scheme ZStream
  docs/AUTH_FLOW_REVERSE_ENGINEERING.md       # auth contract + implementation status
  docs/IOS_BUILD_OPTIMIZATION_REPORT.md       # build-speed research & what was applied
  SWIFTUI_PLAN.md                             # future: full SwiftUI app + RN toggle (not started)
  README.md                                   # ZStream branding
  tmp/harness/                                # live-backend probe scripts (git-ignored)
.secrets.ignore                               # real creds (git-ignored)
```

Note the paths: the git repo root is `/home/sigge/pstream-app`, and the RN app + package.json is at `/home/sigge/pstream-app/app/`. `app/` contains both the RN `app/` source dir AND the Xcode `ios/` dir (confusing double `app/app`).

Other reference dirs (not in repo):
- `/home/sigge/zstream-decompiled/` — decompiled Android APK (jadx) used to reverse-engineer the auth flow.
- `/home/sigge/pstream-app/dist/ZStream.ipa` — a downloaded earlier IPA.

## 10. Long-term plan (not started)

Full **SwiftUI** app with a Settings toggle to switch between the SwiftUI UI and the React Native UI — see `SWIFTUI_PLAN.md`.

## 11. Key gotchas / lessons

- The backend answers the **user-id field under `session.user`**, not `session.userId`. Easy to trip up migration.
- Bookmark/progress/watching bodies are **Zod-validated** — missing required fields → 400 with a detailed JSON error listing `path[]` + `expected`. Use those messages to reverse contracts.
- iOS can't be built locally (Arch, no Xcode); all iOS validation happens in GitHub Actions.
- The repo root path ≠ app path (double `app`). Run checks as `cd /home/sigge/pstream-app/app && npm …`.
- Never commit `.secrets.ignore` or anything with real credentials.
- Remove test data you create in the real user account.

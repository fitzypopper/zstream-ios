# ZStream Auth Flow — Reverse-Engineering Report

Source: decompiled Android APK at `/home/sigge/zstream-decompiled/sources/`
Target: fix ported iOS app at `/home/sigge/pstream-app/app/api/` after the backend switched login systems.

## Backend
- Base URL: `https://backend.zstream.mov/` (`com/zstream/android/data/remote/BackendApiKt.java`)
- Auth `namespace` default = `"movie-web"` (set in LoginCompleteBody / RegisterCompleteBody default args)
- HTTP client is Retrofit-style; obfuscated annotations: `@ks5`=POST, `@t33`=GET, `@ls5`=PUT, `@qb1`/`@ja3`=DELETE, `@kc3`=@Header("Authorization"), `@k80`=@Body, `@ix5`=@Path, `@to6`=@Query
- All auth bodies serialized with Gson using field names straight from Kotlin data classes (see JSON shapes below)
- Auth token header: `Authorization: Bearer <token>` (confirmed: `dd0.i("Bearer ", token)` in i5.java method `o()`)

## Main orchestration
- `defpackage/i5.java` = the AccountRepository (the real `com/zstream/android/data/AccountRepository.java` was NOT emitted by the decompiler; only its nested TypeToken class survived)
  - Saves one guest/account session to shared UserDefaults-backed store (`saved_profiles`)
  - Holds active session in-memory + persists via `i()` helper and c5/di6 DataStore-backed store
  - Log tags: "AccountRepo"

## Crypto (all in `defpackage/oc0.java` + `c40.java`, uses BouncyCastle)
- `oc0.s(challenge, privateKey)`: Ed25519 signature over the challenge string bytes -> base64 (no padding) with `s48.x0(...,'=')` trimming trailing '='
- `oc0.p(seed)`: expands a 32-byte seed to Ed25519Keys(privateKey, publicKey, seed) via `Ed25519PrivateKeyParameters`
- `oc0.t(publicKeyBytes)`: base64 (no padding) of the Ed25519 public key
- `oc0.o(deviceName, aesKey)`: AES/GCM/NoPadding encrypt device name (128-bit tag) -> `iv.ciphertext.tag` base64 joined by '.'
- `oc0.n(...)`: the inverse (decrypt) of `o`
- `oc0.r(n)`: random n bytes, base64 no padding (used for WebAuthn challenges)
- Secret derivation: PBKDF2-HMAC-SHA256, salt = literal `"mnemonic"`, 2048 iterations, 256-bit key (`PKCS5S2ParametersGenerator(new SHA256Digest())`)
- Base64: `c40.b(c40.g, bytes)` = standard base64 alphabet (NOT url-safe), then `s48.x0(base64, '=')` strips trailing '=' (base64-no-padding)

### Passkey helper (WebAuthn / androidx.credentials)
- `oc0.k(context)` -> GET credential: builds `{challenge, timeout:60000, userVerification:"preferred", rpId:"zstream.mov"}`, calls CredentialManager getCredential, returns credential **id** (from response JSON "id")
- `oc0.l(context, name)` -> CREATE credential: builds PublicKeyCredentialCreationOptions JSON with rp `{name:"Z-Stream", id:"zstream.mov"}`, user `{id,r(8), name, displayName}`, `pubKeyCredParams` alg -7 (Ed25519) and -257 (RS256), `authenticatorSelection.authenticationAttachment:"platform"`, `userVerification:"preferred"`, `timeout:60000`, `attestation:"none"`; returns credential **id** from `androidx.credentials.BUNDLE_KEY_REGISTRATION_RESPONSE_JSON`

## Login flows (i5.java)
### A) Passkey login  -> method `h()` -> `e()` -> `a(...)` (uses guest_id flow)
1. `publicKey` = base64-no-padding of Ed25519 public key derived via PBKDF2(seed, "mnemonic", 2048) where seed is the credential **id** returned by `oc0.k(context)`
2. POST `/auth/login/start` Body `{ publicKey }` -> `ChallengeResponse { challenge: string }`
3. signer = the derived Ed25519 private key; signature = `oc0.s(challenge, privateKey)`
4. device = `oc0.o(deviceName, aesKey)` where aesKey is the derived key
5. POST `/auth/login/complete` Body `{ publicKey, challenge: { code, signature }, device, namespace:"movie-web" }` -> `LoginResponse`

### B) Passkey register -> method `j()` -> `b(...)`
1. `publicKey` = base64 Ed25519 public key derived via PBKDF2(seed=WebAuthn credential id from `oc0.l(context,"Z-Stream User")`, "mnemonic", 2048)
2. POST `/auth/register/start` Body `{ captchaToken: null }` -> `ChallengeResponse`
3. Build signature + encrypted device same as A
4. POST `/auth/register/complete` Body `{ publicKey, challenge:{code,signature}, device, profile:{colorA,colorB,icon}, namespace:"movie-web" }` -> `RegisterResponse`

### C) Password login -> method `f(username, password, device)`
- POST `/auth/password/login` Body `{ username, password, device }` -> `LoginResponse` (no namespace field)
- Result `k5(..., usesPasskey=false)`

### D) Password register -> method `k(username, password, device)`
- POST `/auth/password/register` Body `{ username, password, device, namespace:"movie-web", profile:null }` -> `LoginResponse`

### E) Legacy passphrase login -> method `d(passphrase, deviceName)`
- PBKDF2(passphrase, "mnemonic", 2048) -> Ed25519 -> then same start/complete challenge flow as A
- This is the NEW password-style backend; passphrase still maps to Ed25519 via the same PBKDF2

### F) Add/migrate password (authenticated)
- POST `/auth/password/add` Header Auth, Body `{ username, password }` -> `SimpleSuccessResponse { success }`
- POST `/auth/password/migrate` Header Auth, Body `{ username, password }` -> `SimpleSuccessResponse { success }`

## Endpoints + exact JSON (from BackendApi + Gson field names)
- GET  `auth/status` (Header Auth) -> `AuthStatusResponse { isLegacyPassphrase:bool, hasPassword:bool, username?:string, hasPasskey:bool }`
- POST `auth/login/start` (Body `{ publicKey: string }`) -> `ChallengeResponse { challenge: string }`
- POST `auth/login/complete` (Body `{ publicKey, challenge:{code,signature}, device, namespace }`) -> `LoginResponse { token, session:{id,userId,device}, user?:{id,nickname,profile:{colorA,colorB,icon},permissions:[]} }`
- POST `auth/password/login` (Body `{ username, password, device }`) -> `LoginResponse`
- POST `auth/password/register` (Body `{ username, password, device, namespace, profile }`) -> `LoginResponse`
- POST `auth/password/add` (Header Auth, `{ username, password }`) -> `{ success }`
- POST `auth/password/migrate` (Header Auth, `{ username, password }`) -> `{ success }`
- POST `auth/register/start` (Body `{ captchaToken? }`) -> `ChallengeResponse`
- POST `auth/register/complete` (Body `{ publicKey, challenge, device, profile, namespace }`) -> `RegisterResponse { token, session, user }`
- Profile colors: `colorA`, `colorB`, `icon` (strings)
- UserResponse: `{ id, nickname, profile, permissions: string[] }`

## Session persistence (k5 = AccountSession)
`k5(userId, token, nickname, deviceName, usesPasskey)`
- SavedProfile stored fields: `id, userId, token, nickname, deviceName, usesPasskey(bool), lastActiveAt(long), kidsModeEnabled(bool)`

## Ported iOS app CURRENT (wrong) assumptions vs reality
Files: `/home/sigge/pstream-app/app/api/auth.ts`, `client.ts`, `types.ts`, `config/defaults.ts`, `config/env.ts`, `screens/LoginScreen.tsx`
- BASE_API_URL correct: `https://backend.zstream.mov` (env default is overridable via STORAGE_KEYS.INSTANCE_URL)
- WRONG: `startPasskeyLogin()` posts `POST /auth/login/start {}` (empty). Real: needs body `{ publicKey }` (base64 Ed25519 pubkey derived from a passkey/hardware credential).
- WRONG: `completePasskeyLogin(sessionId, credential)` posts `{ sessionId, credential }`. Real endpoint takes `{ publicKey, challenge:{code,signature}, device, namespace }`. No sessionId field at all. The challenge value is NOT a sessionId — it's a string challenge from login/start that must be Ed25519-signed.
- WRONG: register start/complete also use `sessionId`/`credential` shape. Real uses publicKey + signed challenge + encrypted device + profile.
- WRONG: `loginWithPassphrase(passphrase)` posts `POST /auth/password/login { passphrase }`. Real: `{ username, password, device }` (password login, not passphrase), and requires the full username/password + a device name; passphrase maps to Ed25519 challenge flow instead (method E), not this endpoint.
- WRONG: `registerWithPassphrase(passphrase)` posts `{ passphrase }`. Real password/register: `{ username, password, device, namespace, profile }`.
- WRONG: `checkAuthStatus()` expects `{ authenticated, userId }`. Real: `{ isLegacyPassphrase, hasPassword, username?, hasPasskey }` (Boolean flags, no `authenticated`/`userId`).
- WRONG: `getCurrentUser()` GET `/users/@me` type `UserProfile`; real returns `UserWithSession { user, session }` (via `getMe`).
- Ported app stores only token + userId + profile string. Real SessionResponse has `{id, userId, device}` and SplashScreen/roots select a saved profile (deviceName + usesPasskey). Uses an `X-ZStream-Client: zstream-ios` header (not present in decompiled client; harmless extra).
- AuthSuccess handling in LoginScreen writes `response.userId` and `response.profile` — real LoginResponse has no `userId`/`profile` top-level; it has `token`, `session`, `user`.
- Client sends `Authorization: Bearer <token>` (correct).

## Gaps to fix in iOS port (no WebAuthn/CryptoKit present)
- Ported project has NO passkey/WebAuthn SDK and NO Ed25519/PBKDF2 crypto (no native toolkit wired in). LoginScreen passkey branch just alerts "coming soon".
- To match backend, iOS needs (a) native passkey (ASAuthorizationController) OR the simpler password path; (b) Ed25519 signing + PBKDF2-HMAC-SHA256(mnemonic salt,2048) + AES-GCM device encryption; (c) correct JSON field names.

## Implementation status (2026-08-29)

Decided (with user): implement **Username + password** login only (simplest; user has real creds; no passkey/WebAuthn/crypto needed).

Implemented:
- `app/api/auth.ts`: replaced `loginWithPassphrase`/`registerWithPassphrase` with
  - `loginWithPassword(username, password, device='zstream-ios')` -> `POST /auth/password/login { username, password, device }` returning `LoginResponse`
  - `registerWithPassword(username, password, device?)` -> `POST /auth/password/register { username, password, device, namespace:'movie-web', profile:null }`
- `app/api/types.ts`: added `AuthSession { id, userId, device }`, `AuthUser { id, nickname, profile?, permissions? }`, `LoginResponse { token, session, user? }`
- `app/screens/LoginScreen.tsx`: removed passphrase/passkey toggle; now username + password fields; on success stores `setAuthToken(response.token)`, `setUserId(response.session.userId)`, `setUserProfile(JSON { id, userId, nickname, profile })`.

Live-verified: `POST /auth/password/login {username,password,device}` -> "Invalid username or password" (dummy creds), proving the request shape/field names are correct (not "Invalid request body").

Still open (documented, NOT implemented):
- `startPasskeyLogin`/`completePasskeyLogin` shapes are still the OLD contract (need `{publicKey}` + Ed25519 signature). Native passkey/Ed25519/PBKDF2/AES-GCM crypto NOT wired in (needs CryptoKit/CryptoKit bridge + ed25519 lib).
- `checkAuthStatus()` currently expects `{authenticated,userId}` but real `/auth/status` returns `{isLegacyPassphrase,hasPassword,username?,hasPasskey}`. Not called by UI (auth is token-based locally).
- `getCurrentUser()` GET `/users/@me` typed as `UserProfile`; real `getMe` returns `UserWithSession {user, session}`. Not called by UI.

## Key decompiled files
- `sources/defpackage/i5.java` — AccountRepository (login/register/password/passphrase orchestration)
- `sources/defpackage/oc0.java` — crypto + WebAuthn helpers (m,h-l,p,r,s,t,o,n)
- `sources/defpackage/c40.java`, `s48.java` — base64 (std alphabet) + padding trim
- `sources/defpackage/k5.java` — AccountSession
- `sources/defpackage/sa2.java` — Ed25519Keys
- `sources/com/zstream/android/data/remote/BackendApi.java` — endpoint interface
- `sources/com/zstream/android/data/remote/*.java` — all request/response bodies
- `resources/res/values/strings.xml` — login UI strings (passkey vs passphrase vs username/password)

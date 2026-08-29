/**
 * Type definitions for ZStream API responses.
 */

/**
 * Video/audio source information
 */
export interface Source {
  url: string;
  provider: string;
  quality: string;
  type: 'hls' | 'mp4' | 'dash' | 'unknown';
}

/**
 * Media item (movie, TV show, episode, etc.)
 */
export interface MediaItem {
  id: string;
  tmdbId?: string;
  title: string;
  poster: string | null;
  backdrop?: string | null;
  overview: string;
  type: 'movie' | 'tv' | 'episode' | 'unknown';
  year?: number;
  rating?: number;
  progress?: number;
  runtimeSeconds?: number;
  watchedSeconds?: number;
  sources?: Source[];
  season?: number;
  episode?: number;
  genres?: string[];
  // ZStream-specific fields
  mediaType?: string;
  releaseDate?: string;
  voteAverage?: number;
  voteCount?: number;
  popularity?: number;
  originalLanguage?: string;
  adult?: boolean;
  video?: boolean;
}

/**
 * Home page response structure
 */
export interface HomeResponse {
  items: MediaItem[];
  sections?: {
    title: string;
    items: MediaItem[];
  }[];
}

/**
 * Search response structure
 */
export interface SearchResponse {
  items: MediaItem[];
  totalResults?: number;
  page?: number;
  totalPages?: number;
}

/**
 * Sources response structure
 */
export interface SourcesResponse {
  sources: Source[];
  subtitles?: Subtitle[];
}

/**
 * Subtitle information
 */
export interface Subtitle {
  url: string;
  language: string;
  label: string;
}

/**
 * Backend API error response shape
 */
export interface BackendErrorResponse {
  error?: string;
  message?: string;
  status?: number;
}

/**
 * User profile from ZStream backend
 */
export interface UserProfile {
  id: string;
  userId?: string;
  token?: string;
  nickname?: string;
  deviceName?: string;
  usesPasskey?: boolean;
  lastActiveAt?: string;
  kidsModeEnabled?: boolean;
}

/**
 * Auth login start response
 */
export interface AuthLoginStartResponse {
  sessionId: string;
  codeLength?: number;
  salt?: string;
}

/**
 * Auth login complete response
 */
export interface AuthLoginCompleteResponse {
  token: string;
  userId: string;
  profile?: UserProfile;
}

/**
 * Session returned by the ZStream backend on login.
 * NOTE: the user-id field is `user` (not `userId`) in the live API.
 */
export interface AuthSession {
  id: string;
  user: string;
  device: string;
}

/**
 * User object returned by the ZStream backend on login.
 */
export interface AuthUser {
  id: string;
  nickname?: string;
  profile?: {
    colorA?: string;
    colorB?: string;
    icon?: string;
  };
  permissions?: string[];
}

/**
 * Login response (movie-web-style auth).
 * Shape: { token, session: { id, userId, device }, user? }
 */
export interface LoginResponse {
  token: string;
  session: AuthSession;
  user?: AuthUser;
}

/**
 * Auth status response.
 * Shape: { isLegacyPassphrase, hasPassword, username?, hasPasskey }
 */
export interface AuthStatus {
  isLegacyPassphrase: boolean;
  hasPassword: boolean;
  username?: string;
  hasPasskey: boolean;
}

/**
 * GET /users/@me response (movie-web backend).
 * Shape: { user: { id, nickname, profile, permissions }, session }
 */
export interface UserWithSession {
  user: AuthUser;
  session: AuthSession;
}

/**
 * Media metadata embedded by the movie-web-style backend.
 * Shape: { type: 'movie' | 'show', year?, title, poster? }
 */
export interface MediaMeta {
  type: 'movie' | 'show';
  year?: number;
  title: string;
  poster?: string | null;
}

/**
 * Bookmark item (movie-web backend).
 * Shape: { tmdbId, meta, group[], favoriteEpisodes[], updatedAt }
 */
export interface Bookmark {
  tmdbId: string;
  meta: MediaMeta;
  group?: string[];
  favoriteEpisodes?: unknown[];
  updatedAt?: string;
  type: 'movie' | 'tv';
}

/**
 * Progress item (movie-web backend).
 * Shape: { id, tmdbId, episode?, season?, meta, duration?, watched?, updatedAt }
 */
export interface ProgressItem {
  id: string;
  tmdbId: string;
  episode?: { id: string; number: number };
  season?: { id: string; number: number };
  meta: MediaMeta;
  duration?: number | string;
  watched?: number | string;
  updatedAt?: string;
  type: 'movie' | 'tv';
}

/**
 * Watch history item (movie-web backend).
 */
export interface WatchHistoryItem {
  tmdbId: string;
  meta: MediaMeta;
  watchedAt?: string;
  duration?: number;
  type: 'movie' | 'tv';
}

/**
 * Paired TV device
 */
export interface PairedTV {
  id: string;
  tvDeviceId: string;
  tvName: string;
  nickname?: string;
  host: string;
  port: number;
  token: string;
  secretBase64: string;
  pairedAt: string;
  releaseOwnerId?: string;
  releaseOwnerName?: string;
}

/**
 * TV Sync pairing session
 */
export interface TVPairingSession {
  sessionId: string;
  tvName: string;
  tvDeviceId: string;
  salt: string;
  codeLength: number;
  port: number;
  ips: string[];
}

/**
 * TV Sync transfer payload
 */
export interface TVSyncPayload {
  tvName: string;
  tmdbApiKey?: string;
  debridToken?: string;
  debridService?: string;
  passphrase?: string;
  accountDeviceName?: string;
  passkeySession?: string;
  traktSession?: string;
}

/**
 * TV Cast request
 */
export interface TVCastRequest {
  requestId: string;
  issuedAt: string;
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}

/**
 * Subtitle track returned by a subtitle provider.
 */
export interface SubtitleTrack {
  url: string;
  language: string;
  label: string;
  format: 'vtt' | 'srt' | 'ass' | 'sami' | 'txt';
  provider: string;
  isHi?: boolean;
  isDefault?: boolean;
}

/**
 * Settings from ZStream backend.
 * Field names mirror the Android app's SettingsResponse (com.zstream.android).
 */
export interface UserSettings {
  id?: string;
  userId?: string;

  // Appearance
  applicationTheme?: string;
  customTheme?: Record<string, unknown>;
  applicationFont?: string;
  applicationLanguage?: string;
  enableImageLogos?: boolean;
  enableMinimalCards?: boolean;
  enableCarouselView?: boolean;
  gridRows?: number;
  homeSectionCarouselLimit?: number;

  // Home
  enableDiscover?: boolean;
  enableFeatured?: boolean;
  enableThumbnails?: boolean;
  enableLowPerformanceMode?: boolean;
  homeSectionOrder?: string[];
  groupOrder?: string[];
  proxyTmdb?: boolean;

  // Playback
  enableAutoplay?: boolean;
  enableSkipCredits?: boolean;
  enableAutoSkipSegments?: boolean;
  enableAutoResumeOnPlaybackError?: boolean;
  enableDoubleClickToSeek?: boolean;
  enableHoldToBoost?: boolean;
  enableNumberKeySeeking?: boolean;
  enablePauseOverlay?: boolean;
  enableSideGestures?: boolean;
  defaultPlaybackSpeed?: number;
  videoScaleMode?: string;
  tvPipPosition?: string;
  autoPipEnabled?: boolean;
  enableBackgroundPlaybackOnScreenLock?: boolean;

  // Subtitles
  enableNativeSubtitles?: boolean;
  defaultSubtitleLanguage?: string;

  // Sources (VOD / debrid)
  sourceOrder?: string[];
  enableSourceOrder?: boolean;
  embedOrder?: string[];
  enableEmbedOrder?: boolean;
  manualSourceSelection?: boolean;
  lastSuccessfulSource?: string;
  enableLastSuccessfulSource?: boolean;
  debridToken?: string;
  debridService?: string;
  febboxKey?: string;
  febboxKeys?: string[];
  tidbKey?: string;
  wyzieKey?: string;
  tmdbApiKey?: string;
  proxyUrls?: string[];

  // Misc
  trailersOpenInApp?: boolean;
  enableNativeKeyboard?: boolean;
  forceCompactEpisodeView?: boolean;
  kidsMode?: boolean;

  [key: string]: unknown;
}

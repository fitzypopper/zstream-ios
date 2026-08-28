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
 * Bookmark item
 */
export interface Bookmark {
  tmdbId: string;
  type: 'movie' | 'tv';
  title?: string;
  posterPath?: string;
  addedAt?: string;
}

/**
 * Progress item
 */
export interface ProgressItem {
  tmdbId: string;
  type: 'movie' | 'tv';
  seasonNumber?: number;
  episodeNumber?: number;
  progress: number;
  duration: number;
  updatedAt?: string;
}

/**
 * Watch history item
 */
export interface WatchHistoryItem {
  tmdbId: string;
  type: 'movie' | 'tv';
  title?: string;
  posterPath?: string;
  watchedAt?: string;
  progress?: number;
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
 * Settings from ZStream backend
 */
export interface UserSettings {
  id?: string;
  userId?: string;
  defaultDebridService?: string;
  debridToken?: string;
  debridService?: string;
  febboxKey?: string;
  febboxKeys?: string[];
  tmdbApiKey?: string;
  tidbKey?: string;
  wyzieKey?: string;
  sourceOrder?: string[];
  autoPlay?: boolean;
  skipCredits?: boolean;
  kidsMode?: boolean;
  theme?: string;
  [key: string]: unknown;
}

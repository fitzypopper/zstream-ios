/**
 * ZStream Auth API - Authentication and user management.
 */

import { get, post, put, patch, del } from './client';
import type {
  AuthLoginStartResponse,
  AuthLoginCompleteResponse,
  LoginResponse,
  AuthStatus,
  AuthUser,
  UserWithSession,
  UserSettings,
  Bookmark,
  ProgressItem,
  WatchHistoryItem,
} from './types';

/**
 * Start passkey login flow.
 * POST /auth/login/start
 */
export async function startPasskeyLogin(): Promise<AuthLoginStartResponse> {
  return post<AuthLoginStartResponse>('/auth/login/start', {});
}

/**
 * Complete passkey login.
 * POST /auth/login/complete
 */
export async function completePasskeyLogin(
  sessionId: string,
  credential: string,
): Promise<AuthLoginCompleteResponse> {
  return post<AuthLoginCompleteResponse>('/auth/login/complete', {
    sessionId,
    credential,
  });
}

/**
 * Start passkey registration.
 * POST /auth/register/start
 */
export async function startPasskeyRegister(): Promise<AuthLoginStartResponse> {
  return post<AuthLoginStartResponse>('/auth/register/start', {});
}

/**
 * Complete passkey registration.
 * POST /auth/register/complete
 */
export async function completePasskeyRegister(
  sessionId: string,
  credential: string,
): Promise<AuthLoginCompleteResponse> {
  return post<AuthLoginCompleteResponse>('/auth/register/complete', {
    sessionId,
    credential,
  });
}

/**
 * Login with username + password.
 * POST /auth/password/login
 * Body: { username, password, device }
 * Returns: { token, session: { id, userId, device }, user? }
 */
export async function loginWithPassword(
  username: string,
  password: string,
  device?: string,
): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/password/login', {
    username,
    password,
    device: device ?? 'zstream-ios',
  });
}

/**
 * Register with username + password.
 * POST /auth/password/register
 * Body: { username, password, device, namespace, profile }
 * The backend requires a real ProfileBody object (not null) and 400s otherwise.
 */
export async function registerWithPassword(
  username: string,
  password: string,
  device?: string,
): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/password/register', {
    username,
    password,
    device: device ?? 'zstream-ios',
    namespace: 'movie-web',
    profile: { colorA: 'purple', colorB: 'indigo', icon: 'userdefault' },
  });
}

/**
 * Check authentication status.
 * GET /auth/status
 * Returns: { isLegacyPassphrase, hasPassword, username?, hasPasskey }
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  return get<AuthStatus>('/auth/status');
}

/**
 * Get current user + session.
 * GET /users/@me
 * Returns: { user: { id, nickname, profile, permissions }, session }
 */
export async function getCurrentUser(): Promise<UserWithSession> {
  return get<UserWithSession>('/users/@me');
}

/**
 * Update user profile.
 * PATCH /users/{id}
 * movie-web body: { nickname }
 */
export async function updateUser(
  userId: string,
  data: { nickname: string },
): Promise<AuthUser> {
  return patch<AuthUser>(`/users/${userId}`, data);
}

/**
 * Get user settings.
 * GET /users/{id}/settings
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  return get<UserSettings>(`/users/${userId}/settings`);
}

/**
 * Update user settings.
 * PUT /users/{id}/settings
 */
export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>,
): Promise<UserSettings> {
  return put<UserSettings>(`/users/${userId}/settings`, settings);
}

/**
 * Get user bookmarks.
 * GET /users/{id}/bookmarks
 */
export async function getBookmarks(
  userId: string,
  limit = 50,
  cursor?: string,
): Promise<{ items: Bookmark[]; nextCursor?: string }> {
  const params: Record<string, unknown> = { limit };
  if (cursor) params.cursor = cursor;
  return get<{ items: Bookmark[]; nextCursor?: string }>(
    `/users/${userId}/bookmarks`,
    params,
  );
}

/**
 * Add bookmark.
 * POST /users/{id}/bookmarks/{tmdbId}
 * Body requires { title: string, type: 'movie' | 'show' } (movie-web contract).
 */
export async function addBookmark(
  userId: string,
  tmdbId: string,
  data: { title: string; type: 'movie' | 'show' },
): Promise<void> {
  return post(`/users/${userId}/bookmarks/${tmdbId}`, data);
}

/**
 * Remove bookmark.
 * DELETE /users/{id}/bookmarks/{tmdbId}
 */
export async function removeBookmark(
  userId: string,
  tmdbId: string,
): Promise<void> {
  return del(`/users/${userId}/bookmarks/${tmdbId}`);
}

/**
 * Get watch progress.
 * GET /users/{id}/progress
 */
export async function getProgress(
  userId: string,
  limit = 50,
  cursor?: string,
): Promise<{ items: ProgressItem[]; nextCursor?: string }> {
  const params: Record<string, unknown> = { limit };
  if (cursor) params.cursor = cursor;
  return get<{ items: ProgressItem[]; nextCursor?: string }>(
    `/users/${userId}/progress`,
    params,
  );
}

/**
 * Update watch progress.
 * PUT /users/{id}/progress/{tmdbId}
 * Full movie-web ProgressInput body:
 * { tmdbId, meta: {type:'movie'|'tv',year?,title,poster?}, watched, duration,
 *   seasonId?, seasonNumber?, episodeId?, episodeNumber? }
 * `watched` and `duration` are integer SECONDS.
 */
export async function updateProgress(
  userId: string,
  tmdbId: string,
  progress: Partial<ProgressItem> & {
    watched: number;
    meta: { type: 'movie' | 'show'; year?: number; title: string; poster?: string | null };
  },
): Promise<void> {
  const { watched, duration, episode, season, meta } = progress;
  return put(`/users/${userId}/progress/${tmdbId}`, {
    tmdbId,
    meta: {
      type: meta.type === 'show' ? 'tv' : meta.type,
      title: meta.title,
      ...(meta.year !== undefined ? { year: meta.year } : {}),
      ...(meta.poster ? { poster: meta.poster } : {}),
    },
    watched,
    ...(duration !== undefined ? { duration } : {}),
    ...(season?.id ? { seasonId: season.id } : {}),
    ...(season?.number !== undefined ? { seasonNumber: season.number } : {}),
    ...(episode?.id ? { episodeId: episode.id } : {}),
    ...(episode?.number !== undefined ? { episodeNumber: episode.number } : {}),
  });
}

/**
 * Delete watch progress.
 * DELETE /users/{id}/progress/{tmdbId}
 */
export async function deleteProgress(
  userId: string,
  tmdbId: string,
): Promise<void> {
  return del(`/users/${userId}/progress/${tmdbId}`);
}

/**
 * Get watch history.
 * GET /users/{id}/watch-history
 */
export async function getWatchHistory(
  userId: string,
): Promise<WatchHistoryItem[]> {
  return get<WatchHistoryItem[]>(`/users/${userId}/watch-history`);
}

/**
 * Update watch history.
 * PUT /users/{id}/watch-history/{tmdbId}
 * Full movie-web WatchHistoryInput body:
 * { tmdbId, meta: {type,title,year?,poster?}, watched, duration, watchedAt, completed,
 *   seasonId?, seasonNumber?, episodeId?, episodeNumber? }
 * NOTE: this endpoint (like all backend endpoints) requires a User-Agent header,
 * which the API client now always sends.
 */
export async function updateWatchHistory(
  userId: string,
  tmdbId: string,
  data: {
    meta: { type: 'movie' | 'show'; title: string; year?: number; poster?: string | null };
    duration?: number;
    watched?: number;
    completed?: boolean;
    seasonId?: string;
    seasonNumber?: number;
    episodeId?: string;
    episodeNumber?: number;
  },
): Promise<void> {
  return put(`/users/${userId}/watch-history/${tmdbId}`, {
    tmdbId,
    meta: {
      type: data.meta.type === 'show' ? 'tv' : data.meta.type,
      title: data.meta.title,
      ...(data.meta.year !== undefined ? { year: data.meta.year } : {}),
      ...(data.meta.poster ? { poster: data.meta.poster } : {}),
    },
    watched: data.watched ?? 0,
    duration: data.duration ?? 0,
    watchedAt: new Date().toISOString(),
    completed: data.completed ?? false,
    ...(data.seasonId ? { seasonId: data.seasonId } : {}),
    ...(data.seasonNumber !== undefined ? { seasonNumber: data.seasonNumber } : {}),
    ...(data.episodeId ? { episodeId: data.episodeId } : {}),
    ...(data.episodeNumber !== undefined ? { episodeNumber: data.episodeNumber } : {}),
  });
}

/**
 * Get group order (content sections).
 * GET /users/{id}/group-order
 * Returns: { groupOrder: [...] }
 */
export async function getGroupOrder(
  userId: string,
): Promise<{ groupOrder: Array<{ id: string; order: number; title: string }> }> {
  return get<{ groupOrder: Array<{ id: string; order: number; title: string }> }>(
    `/users/${userId}/group-order`,
  );
}

/**
 * Update group order.
 * PUT /users/{id}/group-order
 * Body: { groupOrder: [...] }
 */
export async function updateGroupOrder(
  userId: string,
  order: Array<{ id: string; order: number; title: string }>,
): Promise<void> {
  return put(`/users/${userId}/group-order`, { groupOrder: order });
}

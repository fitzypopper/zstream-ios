/**
 * ZStream Auth API - Authentication and user management.
 */

import { get, post, put, patch, del } from './client';
import type {
  AuthLoginStartResponse,
  AuthLoginCompleteResponse,
  LoginResponse,
  UserProfile,
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
    profile: null,
  });
}

/**
 * Check authentication status.
 * GET /auth/status
 */
export async function checkAuthStatus(): Promise<{ authenticated: boolean; userId?: string }> {
  return get<{ authenticated: boolean; userId?: string }>('/auth/status');
}

/**
 * Get current user profile.
 * GET /users/@me
 */
export async function getCurrentUser(): Promise<UserProfile> {
  return get<UserProfile>('/users/@me');
}

/**
 * Update user profile.
 * PATCH /users/{id}
 */
export async function updateUser(
  userId: string,
  data: Partial<UserProfile>,
): Promise<UserProfile> {
  return patch<UserProfile>(`/users/${userId}`, data);
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
 */
export async function addBookmark(
  userId: string,
  tmdbId: string,
): Promise<void> {
  return post(`/users/${userId}/bookmarks/${tmdbId}`);
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
 */
export async function updateProgress(
  userId: string,
  tmdbId: string,
  progress: Partial<ProgressItem>,
): Promise<void> {
  return put(`/users/${userId}/progress/${tmdbId}`, progress);
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
 */
export async function updateWatchHistory(
  userId: string,
  tmdbId: string,
  data: Partial<WatchHistoryItem>,
): Promise<void> {
  return put(`/users/${userId}/watch-history/${tmdbId}`, data);
}

/**
 * Get group order (content sections).
 * GET /users/{id}/group-order
 */
export async function getGroupOrder(
  userId: string,
): Promise<Array<{ id: string; order: number; title: string }>> {
  return get<Array<{ id: string; order: number; title: string }>>(
    `/users/${userId}/group-order`,
  );
}

/**
 * Update group order.
 * PUT /users/{id}/group-order
 */
export async function updateGroupOrder(
  userId: string,
  order: Array<{ id: string; order: number; title: string }>,
): Promise<void> {
  return put(`/users/${userId}/group-order`, order);
}

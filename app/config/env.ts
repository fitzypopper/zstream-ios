/**
 * Environment configuration helpers.
 */

import { getItem, setItem, removeItem, STORAGE_KEYS } from '../store/storage';
import { BASE_API_URL } from './defaults';

/**
 * Simple auth change notifier.
 * Screens dispatch events on login/logout; RootNavigator subscribes.
 */
type AuthListener = (authenticated: boolean) => void;

const authListeners: Set<AuthListener> = new Set();

export function addAuthListener(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export async function notifyAuthChanged(): Promise<void> {
  const authenticated = await isAuthenticated();
  authListeners.forEach((listener) => listener(authenticated));
}

/**
 * Get the currently configured ZStream instance URL.
 */
export async function getCurrentInstance(): Promise<string> {
  try {
    const stored = await getItem(STORAGE_KEYS.INSTANCE_URL);
    return stored || BASE_API_URL;
  } catch {
    return BASE_API_URL;
  }
}

/**
 * Set the ZStream instance URL.
 */
export async function setCurrentInstance(url: string): Promise<void> {
  await setItem(STORAGE_KEYS.INSTANCE_URL, url);
}

/**
 * Get the stored authentication token.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

/**
 * Set the authentication token.
 */
export async function setAuthToken(token: string): Promise<void> {
  await setItem(STORAGE_KEYS.AUTH_TOKEN, token);
}

/**
 * Clear the authentication token (logout).
 */
export async function clearAuthToken(): Promise<void> {
  await removeItem(STORAGE_KEYS.AUTH_TOKEN);
}

/**
 * Check if user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return token !== null && token.length > 0;
}

/**
 * Get the stored user profile.
 */
export async function getUserProfile(): Promise<string | null> {
  try {
    return await getItem(STORAGE_KEYS.USER_PROFILE);
  } catch {
    return null;
  }
}

/**
 * Get the current user's ID from the stored profile.
 * Returns null if not authenticated.
 */
export async function getUserId(): Promise<string | null> {
  try {
    const stored = await getItem(STORAGE_KEYS.USER_ID);
    if (stored) return stored;

    const profileRaw = await getUserProfile();
    if (profileRaw) {
      const profile = JSON.parse(profileRaw) as { id?: string; userId?: string };
      const id = profile.id ?? profile.userId ?? null;
      if (id) {
        await setItem(STORAGE_KEYS.USER_ID, id);
      }
      return id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set the current user's ID.
 */
export async function setUserId(userId: string): Promise<void> {
  await setItem(STORAGE_KEYS.USER_ID, userId);
}

/**
 * Set the user profile.
 */
export async function setUserProfile(profile: string): Promise<void> {
  await setItem(STORAGE_KEYS.USER_PROFILE, profile);
}

/**
 * Clear user data (logout).
 */
export async function clearUserData(): Promise<void> {
  await removeItem(STORAGE_KEYS.AUTH_TOKEN);
  await removeItem(STORAGE_KEYS.USER_PROFILE);
  await removeItem(STORAGE_KEYS.USER_ID);
}

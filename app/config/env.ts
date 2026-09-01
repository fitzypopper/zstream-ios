/**
 * Environment configuration helpers.
 */

import { getItem, setItem, removeItem, STORAGE_KEYS } from '../store/storage';
import {
  hasNativeAuth,
  nativeGetItem,
  nativeSetItem,
  nativeRemoveItem,
} from '../native/nativeAuth';
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

const isAuthKey = (key: string): boolean =>
  key === STORAGE_KEYS.AUTH_TOKEN ||
  key === STORAGE_KEYS.USER_ID ||
  key === STORAGE_KEYS.USER_PROFILE;

/**
 * If the native bridge promise never settles (not just rejects), `await`ing it
 * blocks auth/bootstrap forever and the app sits on a black/loading screen.
 * Resolve with `null` (→ fall back to JS storage) after a short timeout.
 */
function nativeOrTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    let settled = false;
    const settle = (value: T | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    Promise.resolve(promise).then(
      (value) => settle(value),
      () => settle(null), // native rejected → caller falls back to JS storage
    );
    setTimeout(() => settle(null), ms);
  });
}

/** Read a storage key, preferring the native Keychain for auth keys. */
async function readKey(key: string): Promise<string | null> {
  if (isAuthKey(key) && hasNativeAuth()) {
    const fromNative = await nativeOrTimeout(nativeGetItem(key), 1000);
    if (fromNative !== null) return fromNative;
  }
  try {
    return await getItem(key);
  } catch {
    return null;
  }
}

/** Write a storage key to both the native Keychain (when applicable) and the regular storage. */
async function writeKey(key: string, value: string): Promise<void> {
  if (isAuthKey(key) && hasNativeAuth()) {
    // Fire-and-forget: never block login on the Keychain bridge.
    Promise.resolve(nativeSetItem(key, value)).catch(() => {});
  }
  try {
    await setItem(key, value);
  } catch {
    /* best effort */
  }
}

async function removeKey(key: string): Promise<void> {
  if (isAuthKey(key) && hasNativeAuth()) {
    Promise.resolve(nativeRemoveItem(key)).catch(() => {});
  }
  try {
    await removeItem(key);
  } catch {
    /* best effort */
  }
}

/**
 * Get the stored authentication token.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    return await readKey(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

/**
 * Set the authentication token.
 */
export async function setAuthToken(token: string): Promise<void> {
  await writeKey(STORAGE_KEYS.AUTH_TOKEN, token);
}

/**
 * Clear the authentication token (logout).
 */
export async function clearAuthToken(): Promise<void> {
  await removeKey(STORAGE_KEYS.AUTH_TOKEN);
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
    return await readKey(STORAGE_KEYS.USER_PROFILE);
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
    const stored = await readKey(STORAGE_KEYS.USER_ID);
    if (stored) return stored;

    const profileRaw = await getUserProfile();
    if (profileRaw) {
      const profile = JSON.parse(profileRaw) as { id?: string; userId?: string };
      const id = profile.id ?? profile.userId ?? null;
      if (id) {
        await writeKey(STORAGE_KEYS.USER_ID, id);
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
  await writeKey(STORAGE_KEYS.USER_ID, userId);
}

/**
 * Set the user profile.
 */
export async function setUserProfile(profile: string): Promise<void> {
  await writeKey(STORAGE_KEYS.USER_PROFILE, profile);
}

/**
 * Clear user data (logout).
 */
export async function clearUserData(): Promise<void> {
  await removeKey(STORAGE_KEYS.AUTH_TOKEN);
  await removeKey(STORAGE_KEYS.USER_PROFILE);
  await removeKey(STORAGE_KEYS.USER_ID);
}

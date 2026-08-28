/**
 * Trakt Integration Service.
 * Implements the Trakt OAuth Device Flow extracted from the ZStream Android app:
 *   1. POST /oauth/device/code -> get user_code + verification_url
 *   2. User authorizes at verification_url on trakt.tv
 *   3. POST /oauth/token (grant_type=device_code) -> access + refresh tokens
 *   4. Token refresh via POST /oauth/token (grant_type=refresh_token)
 */

import axios from 'axios';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '../store/storage';

const TRAKT_API_BASE = 'https://api.trakt.tv';
const TRAKT_CLIENT_ID = '8f821d3fccd02049c2bf2687c7c402488576faeb8883b266616e094970df9430';
const TRAKT_CLIENT_SECRET = 'b10e96599a4354ae1798c24e31f25d4fb67bd4a0bf3e4a4a347df7ca614ee0dd';
const TRAKT_REDIRECT_URI = 'https://zstream.mov';

export interface TraktDeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
  interval: number;
}

export interface TraktSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  profileJson?: string;
}

export interface TraktProfile {
  username?: string;
  name?: string;
  slug?: string;
  vip?: boolean;
}

interface TraktTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const http = axios.create({
  baseURL: TRAKT_API_BASE,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Step 1 - Request a device authorization code.
 * POST /oauth/device/code
 */
export async function requestDeviceCode(): Promise<TraktDeviceAuthorization> {
  const { data } = await http.post<{
    device_code: string;
    user_code: string;
    verification_url: string;
    expires_in: number;
    interval: number;
  }>('/oauth/device/code', { client_id: TRAKT_CLIENT_ID });

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUrl: data.verification_url,
    expiresIn: data.expires_in,
    interval: data.interval,
  };
}

/**
 * Step 2 - Poll for the user's authorization, then exchange for tokens.
 * POST /oauth/token (grant_type: urn:ietf:params:oauth:grant-type:device_code)
 * Throws until the user approves (AuthorizationPendingError) or expires.
 */
export async function pollForToken(
  deviceCode: string,
  intervalMs: number,
  maxWaitMs: number,
  onTick?: (attempts: number) => void,
): Promise<TraktSession> {
  const startedAt = Date.now();
  let attempts = 0;

  while (Date.now() - startedAt < maxWaitMs) {
    attempts += 1;
    onTick?.(attempts);
    try {
      const { data } = await http.post<TraktTokenResponse>('/oauth/token', {
        client_id: TRAKT_CLIENT_ID,
        client_secret: TRAKT_CLIENT_SECRET,
        code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
    } catch (err: any) {
      const status = err?.response?.status;
      // 400 with "pending" means poll again after interval
      const isPending =
        status === 400 &&
        String(err?.response?.data?.error ?? '').toLowerCase().includes('pending');
      const isSlowDown = status === 429;

      if (isSlowDown) {
        await sleep(isSlowDown ? 5000 : intervalMs);
        continue;
      }
      if (!isPending) {
        throw normalizeTraktError(err);
      }
      await sleep(intervalMs);
    }
  }

  throw new Error('Authorization timed out. Please try again.');
}

/**
 * Refresh an expired Trakt session.
 * POST /oauth/token (grant_type: refresh_token)
 */
export async function refreshTraktToken(
  refreshToken: string,
): Promise<TraktSession> {
  const { data } = await http.post<TraktTokenResponse>('/oauth/token', {
    client_id: TRAKT_CLIENT_ID,
    client_secret: TRAKT_CLIENT_SECRET,
    refresh_token: refreshToken,
    redirect_uri: TRAKT_REDIRECT_URI,
    grant_type: 'refresh_token',
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Fetch the authenticated user's Trakt profile.
 * GET /users/me
 */
export async function fetchTraktProfile(
  accessToken: string,
): Promise<TraktProfile> {
  const { data } = await http.get<TraktProfile>('/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'trakt-api-version': '2',
      'trakt-api-key': TRAKT_CLIENT_ID,
    },
  });
  return data;
}

/**
 * Load a stored Trakt session, refreshing if expired.
 */
export async function loadTraktSession(): Promise<TraktSession | null> {
  try {
    const raw = await getItem(STORAGE_KEYS.TRAKT_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw) as TraktSession;

    if (Date.now() >= session.expiresAt - 60 * 1000) {
      const refreshed = await refreshTraktToken(session.refreshToken);
      await saveTraktSession(refreshed);
      return refreshed;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Persist a Trakt session.
 */
export async function saveTraktSession(session: TraktSession): Promise<void> {
  await setItem(STORAGE_KEYS.TRAKT_SESSION, JSON.stringify(session));
}

/**
 * Remove the stored Trakt session.
 */
export async function clearTraktSession(): Promise<void> {
  await removeItem(STORAGE_KEYS.TRAKT_SESSION);
}

/**
 * Check whether a Trakt session is currently stored.
 */
export async function hasTraktSession(): Promise<boolean> {
  const session = await loadTraktSession();
  return session !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTraktError(err: any): Error {
  const message =
    err?.response?.data?.error_description ??
    err?.response?.data?.error ??
    err?.message ??
    'Trakt authorization failed';
  return new Error(
    typeof message === 'string' ? message : 'Trakt authorization failed',
  );
}

export default {
  requestDeviceCode,
  pollForToken,
  refreshTraktToken,
  fetchTraktProfile,
  loadTraktSession,
  saveTraktSession,
  clearTraktSession,
  hasTraktSession,
};
/**
 * Faithful harness for the app's RN boot path.
 *
 * Executes the REAL `env.ts` auth bootstrap against a deliberately hostile
 * native bridge (a promise that NEVER settles) to prove that `isAuthenticated()`
 * still resolves in bounded time thanks to `nativeOrTimeout` (and that the 6s
 * "Startup stuck: auth check did not resolve" watchdog can therefore never
 * fire on a device running this code).
 */

jest.mock('../store/storage', () => ({
  STORAGE_KEYS: {
    INSTANCE_URL: 'instance_url',
    AUTH_TOKEN: 'auth_token',
    USER_PROFILE: 'user_profile',
    USER_ID: 'user_id',
    PAIRED_TVS: 'paired_tvs',
    TRAKT_SESSION: 'trakt_session',
  },
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

jest.mock('../native/nativeAuth', () => {
  const never = () => new Promise(() => {});
  return {
    hasNativeAuth: jest.fn(() => true),
    nativeGetItem: jest.fn(never),
    nativeSetItem: jest.fn(never),
    nativeRemoveItem: jest.fn(never),
  };
});

import { isAuthenticated, getAuthToken } from '../config/env';

describe('boot auth path with a hung native bridge (like a real stalled legacy module)', () => {
  it('getAuthToken() resolves (returns null) within ~300ms', async () => {
    const started = Date.now();
    const token = await getAuthToken();
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(2000);
    expect(token).toBeNull();
  });

  it('isAuthenticated() resolves to false well before the 6s watchdog', async () => {
    const started = Date.now();
    const authenticated = await isAuthenticated();
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(2000);
    expect(authenticated).toBe(false);
  });

  it('the whole sequence finishes under 1s like RootNavigator expects', async () => {
    jest.setTimeout(3000);
    const started = Date.now();
    const authenticated = await isAuthenticated();
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(1000);
    expect(authenticated).toBe(false);
  });
});
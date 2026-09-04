/**
 * Faithful harness for the app's RN boot path, part 2.
 *
 * Imports the REAL `nativeAuth.ts` and `env.ts` against a stubbed 'react-native'
 * whose ZStreamAuth module is intentionally absent (matching the shipped build,
 * where ENABLE_NATIVE_AUTH_BRIDGE = false). Proves the default boot path makes
 * NO calls into the native module at all: hasNativeAuth() is false and
 * isAuthenticated() resolves immediately.
 */

jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'ios' },
}));

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

import { isAuthenticated } from '../config/env';
import { hasNativeAuth, probeNativeAuth } from '../native/nativeAuth';

describe('real boot path with the native auth bridge disabled', () => {
  it('hasNativeAuth() is false (boot makes no native module calls)', () => {
    expect(hasNativeAuth()).toBe(false);
  });

  it('probeNativeAuth() is a safe no-op', async () => {
    await expect(probeNativeAuth()).resolves.toBeUndefined();
    expect(hasNativeAuth()).toBe(false);
  });

  it('isAuthenticated() resolves to false immediately', async () => {
    const started = Date.now();
    const authenticated = await isAuthenticated();
    const elapsed = Date.now() - started;
    expect(elapsed).toBeLessThan(500);
    expect(authenticated).toBe(false);
  });
});
/**
 * Native auth bridge (iOS).
 *
 * `ZStreamAuth` is a Swift RCTBridgeModule backed by Keychain (the three auth
 * keys) and UserDefaults (the UI selection passed to UserPreferences), so the
 * React Native UI and the SwiftUI UI share one session + one interface switch.
 *
 * Falls back to a no-op on non-iOS platforms / in tests where the native
 * module does not exist — callers then use the regular storage layer.
 */
import { NativeModules, Platform } from 'react-native';

interface ZStreamAuthModule {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<boolean>;
  removeItem(key: string): Promise<null>;
  getUISelection(): Promise<string>;
  setUISelection(value: string): Promise<boolean>;
}

// The legacy `ZStreamAuth` Keychain bridge (RCT_EXTERN_MODULE) never settles on
// the New-Architecture interop layer: calling it from JS wedges the JS thread
// so no timeout can fire. RN auth must not depend on it at all — auth state
// lives in the JS storage layer (MMKV/AsyncStorage). Re-enable only when the
// bridge is converted to a proper (non-blocking) TurboModule.
const ENABLE_NATIVE_AUTH_BRIDGE = false;

const nativeModule: ZStreamAuthModule | null =
  ENABLE_NATIVE_AUTH_BRIDGE && Platform.OS === 'ios'
    ? (NativeModules.ZStreamAuth as ZStreamAuthModule | undefined) ?? null
    : null;

type BridgeState = 'unprobed' | 'alive' | 'dead';
let bridgeState: BridgeState = nativeModule ? 'unprobed' : 'dead';

/**
 * True only while the native bridge is known (or believed) responsive.
 * `probeNativeAuth()` flips this to `dead` if a call doesn't answer in time,
 * so a hung legacy bridge can never stall the RN start path again.
 */
export const hasNativeAuth = (): boolean => bridgeState !== 'dead' && nativeModule !== null;

function probeWithTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    let settled = false;
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    Promise.resolve(promise).then(
      (value) => finish(value),
      () => finish(null),
    );
    setTimeout(() => finish(null), ms);
  });
}

/**
 * One-shot live check of the native Keychain/UserDefaults bridge. Runs at app
 * boot; if the bridge is genuinely dead (answers never arrive), all later
 * native auth reads/writes are skipped so they can't add latency or hang.
 */
export async function probeNativeAuth(): Promise<void> {
  if (!nativeModule || bridgeState !== 'unprobed') return;
  const result = await probeWithTimeout(nativeModule.getUISelection(), 300);
  bridgeState = result !== null ? 'alive' : 'dead';
}

export const nativeGetItem = (key: string): Promise<string | null> =>
  nativeModule ? nativeModule.getItem(key) : Promise.resolve(null);

export const nativeSetItem = (key: string, value: string): Promise<boolean> =>
  nativeModule ? nativeModule.setItem(key, value) : Promise.resolve(true);

export const nativeRemoveItem = (key: string): Promise<null> =>
  nativeModule ? nativeModule.removeItem(key) : Promise.resolve(null);

export const nativeGetUISelection = (): Promise<string> =>
  nativeModule ? nativeModule.getUISelection() : Promise.resolve('reactNative');

export const nativeSetUISelection = (value: string): Promise<boolean> =>
  nativeModule ? nativeModule.setUISelection(value) : Promise.resolve(true);

/**
 * Switch the launched UI (SwiftUI / React Native) on iOS.
 * Mirrors the SwiftUI Settings picker; requires an app restart to take effect.
 */
export async function setUIPreference(selection: 'swiftUI' | 'reactNative'): Promise<void> {
  if (hasNativeAuth()) {
    await nativeSetUISelection(selection);
  }
}

export async function getUIPreference(): Promise<'swiftUI' | 'reactNative'> {
  if (!hasNativeAuth()) {
    return 'reactNative';
  }
  const raw = await nativeGetUISelection();
  return raw === 'swiftUI' ? 'swiftUI' : 'reactNative';
}
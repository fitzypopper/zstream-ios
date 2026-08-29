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

const nativeModule: ZStreamAuthModule | null =
  Platform.OS === 'ios' ? (NativeModules.ZStreamAuth as ZStreamAuthModule | undefined) ?? null : null;

export const hasNativeAuth = (): boolean => nativeModule !== null;

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
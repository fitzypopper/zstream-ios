/**
 * SettingsService - Loads, normalizes and persists user settings.
 *
 * Settings live on the backend (GET/PUT /users/{id}/settings) and are
 * mirrored against local defaults so the app behaves consistently offline.
 */

import type { UserSettings } from '../api/types';

/**
 * Default settings. Values mirror the Android app's defaults where known.
 */
export const DEFAULT_SETTINGS: UserSettings = {
  applicationTheme: 'dark',
  applicationLanguage: 'en',
  enableAutoplay: true,
  enableSkipCredits: true,
  enableAutoSkipSegments: true,
  enableAutoResumeOnPlaybackError: true,
  enableDoubleClickToSeek: true,
  enableHoldToBoost: true,
  enableNumberKeySeeking: true,
  enablePauseOverlay: true,
  enableSideGestures: true,
  enableThumbnails: true,
  enableCarouselView: true,
  enableDiscover: true,
  enableFeatured: true,
  enableImageLogos: true,
  enableMinimalCards: false,
  enableLowPerformanceMode: false,
  enableNativeSubtitles: true,
  forceCompactEpisodeView: false,
  manualSourceSelection: true,
  enableLastSuccessfulSource: true,
  trailersOpenInApp: false,
  proxyTmdb: false,
  enableNativeKeyboard: false,
  defaultPlaybackSpeed: 1,
  defaultSubtitleLanguage: 'en',
  videoScaleMode: 'contain',
  tvPipPosition: 'center',
  autoPipEnabled: true,
  enableBackgroundPlaybackOnScreenLock: true,
  gridRows: 3,
  homeSectionCarouselLimit: 5,
  homeSectionOrder: ['watching', 'bookmarks'],
  sourceOrder: [],
  embedOrder: [],
  applicationFont: 'system',
  enableSourceOrder: false,
  enableEmbedOrder: false,
  lastSuccessfulSource: '',
  debridToken: '',
  debridService: 'realdebrid',
  febboxKey: '',
  tidbKey: '',
  wyzieKey: '',
  tmdbApiKey: '',
  kidsMode: false,
};

export const THEME_OPTIONS = ['dark', 'light', 'amoled', 'system'] as const;
export const FONT_OPTIONS = ['system', 'roboto', 'serif', 'mono'] as const;
export const VIDEO_SCALE_OPTIONS = ['contain', 'fill'] as const;
export const PLAYBACK_SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export const GRID_ROWS_OPTIONS = [2, 3, 4, 5] as const;
export const DEBRID_SERVICE_OPTIONS = ['realdebrid', 'alldebrid', 'premiumize', 'none'] as const;

export const SUBTITLE_LANGUAGE_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ru', label: 'Russian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'sv', label: 'Swedish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
];

/**
 * Boolean settings keys that can be toggled from the UI.
 */
export const BOOLEAN_SETTINGS: (keyof UserSettings)[] = [
  'enableAutoplay',
  'enableSkipCredits',
  'enableAutoSkipSegments',
  'enableAutoResumeOnPlaybackError',
  'enableDoubleClickToSeek',
  'enableHoldToBoost',
  'enableNumberKeySeeking',
  'enablePauseOverlay',
  'enableSideGestures',
  'enableThumbnails',
  'enableCarouselView',
  'enableDiscover',
  'enableFeatured',
  'enableImageLogos',
  'enableMinimalCards',
  'enableLowPerformanceMode',
  'enableNativeSubtitles',
  'forceCompactEpisodeView',
  'manualSourceSelection',
  'enableLastSuccessfulSource',
  'proxyTmdb',
  'trailersOpenInApp',
  'autoPipEnabled',
  'enableBackgroundPlaybackOnScreenLock',
];

/**
 * Settings whose values are free-form API keys/urls (text inputs).
 */
export const KEY_SETTINGS: { key: keyof UserSettings; label: string }[] = [
  { key: 'tmdbApiKey', label: 'TMDB API Key' },
  { key: 'debridService', label: 'Debrid Service' },
  { key: 'debridToken', label: 'Debrid Token' },
  { key: 'febboxKey', label: 'Febbox Key' },
  { key: 'tidbKey', label: 'Tidb Key' },
  { key: 'wyzieKey', label: 'Wyzie Key' },
];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a raw backend settings payload into a guaranteed-safe object.
 * Missing keys fall back to defaults, values are coerced to their expected type.
 */
export function normalizeSettings(raw: unknown): UserSettings {
  const source = isPlainRecord(raw) ? raw : {};

  const result: UserSettings = { ...DEFAULT_SETTINGS };

  (Object.keys(source) as (keyof UserSettings)[]).forEach((key) => {
    const value = source[key];

    if (value === undefined || value === null) {
      return;
    }

    switch (key) {
      case 'enableAutoplay':
      case 'enableSkipCredits':
      case 'enableAutoSkipSegments':
      case 'enableAutoResumeOnPlaybackError':
      case 'enableDoubleClickToSeek':
      case 'enableHoldToBoost':
      case 'enableNumberKeySeeking':
      case 'enablePauseOverlay':
      case 'enableSideGestures':
      case 'enableThumbnails':
      case 'enableCarouselView':
      case 'enableDiscover':
      case 'enableFeatured':
      case 'enableImageLogos':
      case 'enableMinimalCards':
      case 'enableLowPerformanceMode':
      case 'enableNativeSubtitles':
      case 'forceCompactEpisodeView':
      case 'manualSourceSelection':
      case 'enableLastSuccessfulSource':
      case 'proxyTmdb':
      case 'trailersOpenInApp':
      case 'autoPipEnabled':
      case 'enableBackgroundPlaybackOnScreenLock':
        result[key] = Boolean(value);
        break;

      case 'gridRows':
      case 'homeSectionCarouselLimit':
        if (typeof value === 'number') result[key] = value;
        break;

      case 'defaultPlaybackSpeed':
        if (typeof value === 'number' && value > 0) result[key] = value;
        break;

      case 'sourceOrder':
      case 'embedOrder':
      case 'feBoxKeys':
      case 'proxyUrls':
      case 'homeSectionOrder':
      case 'groupOrder': {
        const listKey = key as keyof UserSettings;
        if (Array.isArray(value)) {
          result[listKey] = value.map(String);
        }
        break;
      }

      case 'debridService':
      case 'debridToken':
      case 'febboxKey':
      case 'tidbKey':
      case 'wyzieKey':
      case 'tmdbApiKey':
      case 'applicationTheme':
      case 'applicationFont':
      case 'applicationLanguage':
      case 'defaultSubtitleLanguage':
      case 'videoScaleMode':
      case 'tvPipPosition':
      case 'lastSuccessfulSource':
        result[key] = String(value);
        break;

      case 'customTheme':
        if (isPlainRecord(value)) result.customTheme = value;
        break;

      default:
        result[key] = value;
    }
  });

  return result;
}

/**
 * Pick the subset of settings that should be sent back to the backend.
 * Sensitive/large values (debrid tokens, keys) are included so they persist.
 */
export function toBackendSettings(settings: UserSettings): Partial<UserSettings> {
  const payload: Partial<UserSettings> = {};

  (Object.keys(settings) as (keyof UserSettings)[]).forEach((key) => {
    if (key === 'id' || key === 'userId') return;
    const value = settings[key];
    if (value === undefined) return;
    payload[key] = value;
  });

  return payload;
}
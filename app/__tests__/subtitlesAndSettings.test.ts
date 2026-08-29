/**
 * Unit tests for subtitle providers & settings normalization.
 */
import {
  parseGraniteSubtitles,
  parseWyzieSubtitles,
  languageFromLabel,
  graniteUrl,
  dedupeTracks,
} from '../api/subtitles';
import {
  normalizeSettings,
  toBackendSettings,
  BOOLEAN_SETTINGS,
  KEY_SETTINGS,
} from '../services/settings';
import type { SubtitleTrack } from '../api/types';

function rawTrack(): SubtitleTrack {
  return {
    url: 'https://example.com/a.vtt',
    language: 'en',
    label: 'English',
    format: 'vtt',
    provider: 'granite',
    isHi: false,
    isDefault: false,
  };
}

describe('languageFromLabel', () => {
  it('maps known language names', () => {
    expect(languageFromLabel('English')).toBe('en');
    expect(languageFromLabel('français')).toBe('fr');
    expect(languageFromLabel('Español')).toBe('es');
    expect(languageFromLabel('영어')).toBe('und');
  });

  it('falls back to a two-letter code-like prefix', () => {
    expect(languageFromLabel('EN SUB')).toBe('en');
  });

  it('returns und for unknown labels', () => {
    expect(languageFromLabel('zzzz')).toBe('und');
  });
});

describe('parseGraniteSubtitles', () => {
  it('parses provider entries into tracks', () => {
    const tracks = parseGraniteSubtitles([
      { label: 'English', file: 'https://subs.example/en.vtt' },
      { label: 'English (SDH)', file: 'https://subs.example/en-sdh.srt' },
      { label: 'Spanish', file: 'https://subs.example/es.srt' },
    ]);

    expect(tracks).toHaveLength(3);
    expect(tracks[0]).toMatchObject({
      language: 'en',
      provider: 'granite',
      isDefault: true,
    });
    expect(tracks[1].isHi).toBe(true);
    expect(tracks[2].language).toBe('es');
  });

  it('ignores invalid entries', () => {
    expect(parseGraniteSubtitles([null, { label: 'x' }, { file: 'y' }, 'bad'])).toEqual([]);
    expect(parseGraniteSubtitles({ not: 'array' })).toEqual([]);
  });
});

describe('parseWyzieSubtitles', () => {
  it('handles the url/lang shapes', () => {
    const tracks = parseWyzieSubtitles([
      { url: 'https://w.example/en.srt', language: 'eng', label: 'English' },
      { file: 'https://w.example/fr.vtt', lang: 'fr' },
    ]);

    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({ language: 'eng', provider: 'wyzie' });
    expect(tracks[1].language).toBe('fr');
  });
});

describe('dedupeTracks', () => {
  it('removes duplicate provider+url pairs', () => {
    const base = rawTrack();
    const es: SubtitleTrack = { ...rawTrack(), url: 'https://example.com/b.vtt', language: 'es', label: 'Spanish', provider: 'wyzie' };
    const tracks = dedupeTracks([base, { ...base }, es]);
    expect(tracks).toHaveLength(2);
  });
});

describe('graniteUrl', () => {
  it('builds movie and tv URLs', () => {
    expect(graniteUrl({ tmdbId: '123', type: 'movie' })).toBe(
      'https://sub.vdrk.site/v1/movie/123',
    );
    expect(graniteUrl({ tmdbId: '123', type: 'tv', season: 1, episode: 2 })).toBe(
      'https://sub.vdrk.site/v1/tv/123/1/2',
    );
  });
});

describe('settings normalization', () => {
  it('coerces partial/wrong-typed settings to the full shape', () => {
    const normalized = normalizeSettings({
      gridRows: 'abc',
      enableAutoplay: 'true',
      applicationTheme: 'light',
    } as any);

    expect(typeof normalized.gridRows).toBe('number');
    expect(normalized.enableAutoplay).toBe(true);
    expect(normalized.applicationTheme).toBe('light');
  });

  it('applies defaults for missing keys', () => {
    const defaults = normalizeSettings(undefined as any);
    expect(defaults.gridRows).toBeDefined();
    for (const key of BOOLEAN_SETTINGS) {
      expect(typeof defaults[key]).toBe('boolean');
    }
    for (const { key } of KEY_SETTINGS) {
      expect(key in defaults).toBe(true);
    }
  });
});

describe('toBackendSettings', () => {
  it('round-trips normalized settings through the live-wire keys', () => {
    const normalized = normalizeSettings(undefined as any);
    const backend = toBackendSettings(normalized);
    expect(backend.gridRows).toBe(normalized.gridRows);
    expect(backend.enableAutoplay).toBe(normalized.enableAutoplay);
  });
});
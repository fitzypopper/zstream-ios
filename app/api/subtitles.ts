/**
 * Subtitles API - Searches and caches subtitles for a title.
 *
 * Providers mirror the Android app:
 *  - "granite" (sub.vdrk.site): no key required, always available.
 *  - "wyzie"   (sub.wyzie.io): requires the user's wyzieKey setting.
 *  - App-only subtitle file fallback: none.
 */

import axios from 'axios';
import type { SubtitleTrack } from './types';
import {
  ensureDir,
  writeFile,
  exists,
  getAppDirectory,
} from '../services/filesystem';

export const GRANITE_BASE_URL = 'https://sub.vdrk.site';
export const WYZIE_BASE_URL = 'https://sub.wyzie.io';

export interface SubtitleSearchParams {
  tmdbId: string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
  wyzieKey?: string;
  src?: string;
}

const SUBTITLE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36';

/**
 * Map a human-readable subtitle label to an ISO-639-1 language code.
 * Mirrors the Android app's label->code helper.
 */
const LANGUAGE_BY_LABEL: Record<string, string> = {
  'english': 'en',
  'english (us)': 'en',
  'english (uk)': 'en',
  'espagnol': 'es',
  'espa\u00f1ol': 'es',
  'spanish': 'es',
  'french': 'fr',
  'fran\u00e7ais': 'fr',
  'german': 'de',
  'deutsch': 'de',
  'italian': 'it',
  'italiano': 'it',
  'portuguese': 'pt',
  'portugu\u00eas': 'pt',
  'portugu\u00eas (brasil)': 'pt-br',
  'portuguese (brazil)': 'pt-br',
  'dutch': 'nl',
  'nederlands': 'nl',
  'polish': 'pl',
  'polski': 'pl',
  'russian': 'ru',
  '\u0440\u0443\u0441\u0441\u043a\u0438\u0439': 'ru',
  'turkish': 'tr',
  't\u00fcrk\u00e7e': 'tr',
  'arabic': 'ar',
  '\u0627\u0644\u0639\u0631\u0628\u064a\u0629': 'ar',
  'hindi': 'hi',
  '\u0939\u093f\u0928\u094d\u0926\u0940': 'hi',
  'japanese': 'ja',
  '\u65e5\u672c\u8a9e': 'ja',
  'korean': 'ko',
  '\ud55c\uad6d\uc5b4': 'ko',
  'chinese': 'zh',
  '\u4e2d\u6587': 'zh',
  'mandarin': 'zh',
  'swedish': 'sv',
  'svenska': 'sv',
  'norwegian': 'no',
  'danish': 'da',
  'finnish': 'fi',
  'suomi': 'fi',
  'greek': 'el',
  '\u03b5\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac': 'el',
  'czech': 'cs',
  'hungarian': 'hu',
  'romanian': 'ro',
  'ukrainian': 'uk',
  'indonesian': 'id',
  'malay': 'ms',
  'thai': 'th',
  'vietnamese': 'vi',
  'hebrew': 'he',
  'bengali': 'bn',
  'persian': 'fa',
  'zulu': 'zu',
  'afrikaans': 'af',
};

const LANGUAGE_NAME_RE = /^([a-z\u00e0-\u024f]+[\s-]?([a-z\u00e0-\u024f]+)?)/i;

/**
 * Extract a 2-letter language code from a subtitle label.
 */
export function languageFromLabel(label: string): string {
  const cleaned = label.toLowerCase().trim();
  const exact = LANGUAGE_BY_LABEL[cleaned];
  if (exact) return exact;
  const match = LANGUAGE_NAME_RE.exec(cleaned);
  if (match) {
    const word = match[1].trim();
    if (LANGUAGE_BY_LABEL[word]) return LANGUAGE_BY_LABEL[word];
  }
  // Fall back to first two letters if they look like a code.
  const short = cleaned.split(/[^a-z]/)[0];
  if (short && short.length === 2) return short;
  return 'und';
}

function inferFormat(url: string): SubtitleTrack['format'] {
  const lower = url.toLowerCase();
  if (lower.includes('.srt')) return 'srt';
  if (lower.includes('.ass') || lower.includes('.ssa')) return 'ass';
  if (lower.includes('.sami') || lower.includes('.smi')) return 'sami';
  if (lower.includes('.txt')) return 'txt';
  return 'vtt';
}

/**
 * Parse the "granite" provider response: an array of { label, file }.
 */
export function parseGraniteSubtitles(
  data: unknown,
  provider: string = 'granite',
): SubtitleTrack[] {
  if (!Array.isArray(data)) return [];
  const tracks: SubtitleTrack[] = [];

  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const label = String((entry as Record<string, unknown>).label ?? '');
    const file = String((entry as Record<string, unknown>).file ?? '');
    if (!label || !file) continue;

    const language = languageFromLabel(label);
    tracks.push({
      url: file,
      language,
      label,
      format: inferFormat(file),
      provider,
      isHi: label.toLowerCase().includes('hi') || label.toLowerCase().includes('sdh'),
      isDefault: language === 'en',
    });
  }

  return tracks;
}

/**
 * Tolerant parser for the "wyzie" provider response, which returns an array of
 * subtitle entries with varying shapes across its versions.
 */
export function parseWyzieSubtitles(data: unknown): SubtitleTrack[] {
  if (!Array.isArray(data)) return [];
  const tracks: SubtitleTrack[] = [];

  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const url = String(record.url ?? record.file ?? '');
    if (!url) continue;

    const label = String(record.label ?? record.language ?? record.name ?? '');
    const language = String(record.lang ?? record.language ?? '') || languageFromLabel(label);
    const formatValue = String(record.format ?? '').toLowerCase() as SubtitleTrack['format'];

    tracks.push({
      url,
      language,
      label: label || language || 'Subtitle',
      format: formatValue === 'vtt' || formatValue === 'srt' || formatValue === 'ass' ? formatValue : inferFormat(url),
      provider: 'wyzie',
      isHi: label.toLowerCase().includes('hi') || label.toLowerCase().includes('sdh'),
      isDefault: language === 'en',
    });
  }

  return tracks;
}

/**
 * Build the granite search URL for a movie or episode.
 */
export function graniteUrl(params: SubtitleSearchParams): string {
  if (params.type === 'tv' && params.season !== undefined && params.episode !== undefined) {
    return `${GRANITE_BASE_URL}/v1/tv/${params.tmdbId}/${params.season}/${params.episode}`;
  }
  return `${GRANITE_BASE_URL}/v1/movie/${params.tmdbId}`;
}

/**
 * Search for subtitles across the available providers.
 * Tolerant of individual provider failures — returns whatever we can find.
 */
export async function searchSubtitles(params: SubtitleSearchParams): Promise<SubtitleTrack[]> {
  const results = await Promise.allSettled([
    searchGranite(params),
    params.wyzieKey ? searchWyzie(params) : Promise.resolve([]),
  ]);

  const tracks: SubtitleTrack[] = [];
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      tracks.push(...result.value);
    } else if (__DEV__) {
      console.warn('[Subtitles] provider error:', result.reason);
    }
  });

  return dedupeTracks(tracks);
}

async function searchGranite(params: SubtitleSearchParams): Promise<SubtitleTrack[]> {
  const url = graniteUrl(params);
  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': SUBTITLE_USER_AGENT },
  });
  return parseGraniteSubtitles(data);
}

async function searchWyzie(params: SubtitleSearchParams): Promise<SubtitleTrack[]> {
  const query: Record<string, string> = {
    id: params.tmdbId,
    key: params.wyzieKey ?? '',
    language: 'all',
    encoding: 'utf-8',
    source: params.src ?? 'all',
  };
  if (params.type === 'tv' && params.season !== undefined && params.episode !== undefined) {
    query.season = String(params.season);
    query.episode = String(params.episode);
  }

  const { data } = await axios.get(`${WYZIE_BASE_URL}/search`, {
    params: query,
    timeout: 15000,
  });
  return parseWyzieSubtitles(data);
}

/**
 * Deduplicate tracks by (provider, url) and sort by language name.
 */
export function dedupeTracks(tracks: SubtitleTrack[]): SubtitleTrack[] {
  const seen = new Set<string>();
  const out: SubtitleTrack[] = [];
  for (const track of tracks) {
    const key = `${track.provider}:${track.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(track);
  }
  return out.sort((a, b) => a.language.localeCompare(b.language));
}

/**
 * Relative/partial subtitle URLs from the granite provider may be hosted on
 * special domains (e.g. maybeoneday.ch) that require Origin/Referer headers.
 * Return the extra headers needed to fetch `url`.
 */
export function extraHeadersForUrl(url: string): Record<string, string> {
  if (url.includes('maybeoneday.ch')) {
    return {
      Origin: 'https://zstream.mov',
      Referer: 'https://zstream.mov/',
    };
  }
  return {};
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Fetch a subtitle file's text content, applying the headers the native
 * player cannot send (UA, Origin/Referer).
 */
export async function fetchSubtitleText(
  url: string,
  headers: Record<string, string> = {},
): Promise<string> {
  const { data } = await axios.get(url, {
    timeout: 30000,
    responseType: 'text',
    headers: {
      'User-Agent': SUBTITLE_USER_AGENT,
      ...headers,
    },
  });
  return typeof data === 'string' ? data : String(data);
}

/**
 * Cache a subtitle file under Documents/<app>/subs and return a local file://
 * URI the player can load (stable, avoids repeating header-ful requests).
 */
export async function cachedSubtitleUri(track: SubtitleTrack): Promise<string> {
  const dir = `${getAppDirectory()}/subs`;
  await ensureDir(dir);

  const ext = track.format === 'srt' ? 'srt' : track.format === 'ass' ? 'ass' : 'vtt';
  const filePath = `${dir}/${hashString(track.url)}.${ext}`;

  if (await exists(filePath)) {
    return `file://${filePath}`;
  }

  const text = await fetchSubtitleText(track.url, extraHeadersForUrl(track.url));
  await writeFile(filePath, text);
  return `file://${filePath}`;
}

export default {
  searchSubtitles,
  cachedSubtitleUri,
  graniteUrl,
  languageFromLabel,
  parseGraniteSubtitles,
  parseWyzieSubtitles,
  extraHeadersForUrl,
};
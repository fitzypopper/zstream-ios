/**
 * Downloads manager - offline HLS/MP4 downloads.
 *
 * Downloads an HLS playlist (or a plain MP4) into Documents/<app>/downloads.
 * For HLS, master/media playlists are parsed in JS, each TS segment is saved
 * via react-native-fs, and a local index.m3u8 is written referencing the
 * downloaded segments so the player can stream them fully offline.
 *
 * Pure parsing helpers are exported for unit testing.
 */

import axios from 'axios';
import type { Source, SubtitleTrack } from '../api/types';
import type { FileDownloadJob } from './filesystem';
import { extraHeadersForUrl } from '../api/subtitles';
import {
  ensureDir,
  writeFile,
  exists,
  unlink,
  moveFile,
  downloadToFile,
  getAppDirectory,
} from './filesystem';
import { getItem, setItem } from '../store/storage';

export const DOWNLOAD_DIRECTORY = 'downloads';
const STORAGE_KEY = 'zstream_downloads';

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error';

export interface DownloadItem {
  id: string;
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  poster?: string | null;
  provider: string;
  quality: string;
  sourceUrl: string;
  format: 'hls' | 'mp4';
  status: DownloadStatus;
  receivedBytes: number;
  totalBytes: number;
  segmentsDone: number;
  segmentsTotal: number;
  localMedia?: string;
  subs?: SubtitleTrack[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewDownload {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
  title: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  poster?: string | null;
  source: Source;
}

interface M3u8Variant {
  bandwidth: number;
  resolution?: string;
  url: string;
}

interface M3u8Segment {
  url: string;
  duration: number;
}

export interface MediaPlaylist {
  segments: M3u8Segment[];
  targetDuration: number;
  encrypted: boolean;
}

type PersistAll = (items: DownloadItem[]) => Promise<void>;

/* ------------------------------------------------------------------ *
 * Pure playlist helpers (unit-testable, no I/O)
 * ------------------------------------------------------------------ */

/**
 * Resolve a possibly-relative URL against a base URL without relying on the
 * WHATWG URL availability inside React Native's JS runtime.
 */
export function resolveUrl(baseUrl: string, relative: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(relative)) return relative;
  if (relative.startsWith('//')) {
    const proto = /^([a-z][a-z0-9+.-]*):/i.exec(baseUrl)?.[1] ?? 'https';
    return `${proto}:${relative}`;
  }

  const base = baseUrl.replace(/\?.*$/, '');
  if (relative.startsWith('/')) {
    const originMatch = /^(https?:\/\/[^/]+)/i.exec(base);
    return `${originMatch ? originMatch[1] : base}${relative}`;
  }

  const proto = /^([a-z][a-z0-9+.-]*):\/\//i.exec(base)?.[1] ?? 'https';
  const baseNoScheme = base.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const dir = baseNoScheme.slice(0, baseNoScheme.lastIndexOf('/') + 1) || `${baseNoScheme}/`;

  const combined = dir + relative;
  const parts = combined.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return `${proto}://${stack.join('/')}`;
}

/**
 * Parse a master playlist (#EXT-X-STREAM-INF) into variant streams.
 */
export function parseMasterPlaylist(playlist: string, baseUrl: string): M3u8Variant[] {
  const variants: M3u8Variant[] = [];
  let pending: Partial<M3u8Variant> | null = null;

  for (const rawLine of playlist.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const bandwidthMatch = /BANDWIDTH=(\d+)/.exec(line);
        const resolutionMatch = /RESOLUTION=(\d+x\d+)/.exec(line);
        pending = {
          bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0,
          resolution: resolutionMatch?.[1],
        };
      }
      continue;
    }

    if (pending) {
      variants.push({ bandwidth: pending.bandwidth ?? 0, resolution: pending.resolution, url: resolveUrl(baseUrl, line) });
      pending = null;
    }
  }
  return variants;
}

/**
 * Pick the variant closest to the requested quality height (or the best one).
 */
export function pickVariant(variants: M3u8Variant[], quality?: string): M3u8Variant {
  const preferredHeight = parseInt(quality ?? '', 10) || null;

  const score = (v: M3u8Variant): number => {
    if (!v.resolution) return v.bandwidth;
    const height = parseInt(v.resolution.split('x')[1] ?? '0', 10) || 0;
    return preferredHeight === null ? height : height;
  };

  return [...variants].sort((a, b) => {
    if (preferredHeight === null) return score(b) - score(a);
    return Math.abs(score(a) - preferredHeight) - Math.abs(score(b) - preferredHeight);
  })[0];
}

/**
 * Parse a media playlist into segments.
 * Returns encrypted:true when an EXT-X-KEY (AES-128) directive is present —
 * those playlists can't be downloaded by this manager (no key exchange).
 */
export function parseMediaPlaylist(playlist: string, baseUrl: string): MediaPlaylist {
  const lines = playlist.split(/\r?\n/);
  let targetDuration = 0;
  let encrypted = false;
  const segments: M3u8Segment[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#')) {
      if (line.startsWith('#EXT-X-TARGETDURATION:')) {
        targetDuration = parseInt(line.split(':')[1] ?? '0', 10) || 0;
      }
      if (line.startsWith('#EXT-X-KEY:')) {
        encrypted = true;
      }
      continue;
    }

    let duration = 0;
    const extInf = lines[i - 1]?.trim();
    if (extInf?.startsWith('#EXTINF:')) {
      const match = /:([\d.]+)/.exec(extInf);
      if (match) duration = parseFloat(match[1]);
    }

    segments.push({ url: resolveUrl(baseUrl, line), duration });
  }

  return { segments, targetDuration, encrypted };
}

/**
 * Build a local media playlist referencing downloaded segment files.
 */
export function buildLocalPlaylist(mediaPlaylist: MediaPlaylist): string {
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${Math.max(mediaPlaylist.targetDuration, 1)}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-PLAYLIST-TYPE:VOD',
    '#EXT-X-ALLOW-CACHE:YES',
  ];

  mediaPlaylist.segments.forEach((segment, index) => {
    const filename = `seg_${String(index).padStart(4, '0')}.ts`;
    lines.push(`#EXTINF:${segment.duration.toFixed(3)},`);
    lines.push(`segments/${filename}`);
  });

  lines.push('#EXT-X-ENDLIST');
  return `${lines.join('\n')}\n`;
}

/* ------------------------------------------------------------------ *
 * I/O & persistence
 * ------------------------------------------------------------------ */

/**
 * Small adapter so callers/tests can control persistence without importing
 * storage directly. Auto-bound to the app's MMKV-backed storage by default.
 */
const persistence: { save?: PersistAll; load?: () => Promise<string | null> } = {};

export function bindStorage(api: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}): void {
  persistence.save = async (items) => {
    await api.setItem(STORAGE_KEY, JSON.stringify(items));
  };
  persistence.load = () => api.getItem(STORAGE_KEY);
}

bindStorage({ getItem, setItem });

/* ------------------------------------------------------------------ *
 * Manager
 * ------------------------------------------------------------------ */

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
};

export type DownloadListener = (items: DownloadItem[]) => void;

export class DownloadsManager {
  private items: DownloadItem[] = [];
  private listeners = new Set<DownloadListener>();
  private rootDir: string | null = null;
  private currentJobs = new Map<string, FileDownloadJob>();
  private stopFlags = new Set<string>();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(private directoryProvider?: () => string) {}

  /**
   * Load persisted items and resolve the root directory. Idempotent.
   */
  async init(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      if (persistence.load) {
        try {
          const raw = await persistence.load();
          if (raw) {
            this.items = JSON.parse(raw) as DownloadItem[];
            // Re-queue in-flight items from a previous session.
            this.items = this.items.map((item) =>
              item.status === 'downloading' || item.status === 'queued'
                ? { ...item, status: 'paused' }
                : item,
            );
          }
        } catch (error) {
          if (__DEV__) console.warn('[Downloads] failed to restore:', error);
        }
      }
      this.rootDir = this.directoryProvider
        ? this.directoryProvider()
        : `${getAppDirectory()}/${DOWNLOAD_DIRECTORY}`;
      await ensureDir(this.rootDir).catch(() => {
        this.rootDir = null;
      });
      this.loaded = true;
    })();

    return this.loadPromise;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getItems(): DownloadItem[] {
    return [...this.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getItem(id: string): DownloadItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  private emit(): void {
    const snapshot = this.getItems();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        /* listener errors must not break the manager */
      }
    }
  }

  private async save(): Promise<void> {
    if (!persistence.save) return;
    try {
      await persistence.save(this.items);
    } catch (error) {
      if (__DEV__) console.warn('[Downloads] persist failed:', error);
    }
  }

  private patch(id: string, changes: Partial<DownloadItem>, emit = true): DownloadItem | undefined {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return undefined;
    Object.assign(item, changes, { updatedAt: new Date().toISOString() });
    if (emit) this.emit();
    void this.save();
    return item;
  }

  /**
   * Start (or re-queue) a download for a source.
   */
  async start(input: NewDownload): Promise<void> {
    await this.init();

    const duplicate = this.items.find(
      (item) =>
        item.tmdbId === input.tmdbId &&
        item.season === input.season &&
        item.episode === input.episode &&
        item.sourceUrl === input.source.url,
    );
    if (duplicate) {
      if (duplicate.status === 'paused' || duplicate.status === 'error') {
        void this.resume(duplicate.id);
      }
      return;
    }

    const now = new Date().toISOString();
    const item: DownloadItem = {
      id: `${input.tmdbId}-${input.mediaType}-${input.season ?? 0}-${input.episode ?? 0}-${Date.now().toString(36)}`,
      tmdbId: input.tmdbId,
      mediaType: input.mediaType,
      title: input.title,
      season: input.season,
      episode: input.episode,
      episodeTitle: input.episodeTitle,
      poster: input.poster ?? null,
      provider: input.source.provider,
      quality: input.source.quality,
      sourceUrl: input.source.url,
      format: input.source.type === 'hls' || input.source.url.includes('.m3u8') ? 'hls' : 'mp4',
      status: 'queued',
      receivedBytes: 0,
      totalBytes: 0,
      segmentsDone: 0,
      segmentsTotal: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.items.push(item);
    this.emit();
    void this.save();
    void this.runDownload(item.id);
  }

  /**
   * Resume a paused or errored download.
   */
  async resume(id: string): Promise<void> {
    const item = this.getItem(id);
    if (!item || (item.status !== 'paused' && item.status !== 'error')) return;
    this.patch(id, { status: 'queued', error: undefined });
    void this.runDownload(id);
  }

  /**
   * Pause an in-flight download.
   */
  pause(id: string): void {
    this.stopFlags.add(id);
    const job = this.currentJobs.get(id);
    if (job?.pause) job.pause();
  }

  /**
   * Cancel and delete a download (including files on disk).
   */
  async remove(id: string): Promise<void> {
    this.stopFlags.add(id);
    const job = this.currentJobs.get(id);
    if (job?.cancel) job.cancel();
    this.currentJobs.delete(id);

    this.items = this.items.filter((item) => item.id !== id);
    this.emit();
    void this.save();

    if (this.rootDir) {
      try {
        await unlink(`${this.rootDir}/${id}`);
      } catch {
        /* best effort */
      }
    }
  }

  /**
   * Remove every download.
   */
  async clear(): Promise<void> {
    const ids = this.items.map((item) => item.id);
    for (const id of ids) {
      await this.remove(id);
    }
  }

  private segmentPath(id: string, index: number): string {
    return `${this.rootDir}/${id}/segments/seg_${String(index).padStart(4, '0')}.ts`;
  }

  private partPath(id: string, index: number): string {
    return `${this.segmentPath(id, index)}.part`;
  }

  /**
   * Single-flight download runner for an item.
   */
  private async runDownload(id: string): Promise<void> {
    const item = this.getItem(id);
    if (!item || !this.rootDir) return;
    if (item.status === 'downloading') return;

    this.stopFlags.delete(id);
    this.patch(id, { status: 'downloading', error: undefined });

    try {
      const dir = `${this.rootDir}/${id}`;
      await ensureDir(dir);
      await ensureDir(`${dir}/segments`);

      if (item.format === 'mp4') {
        await this.downloadMp4(item, `${dir}/media.mp4`);
      } else {
        await this.downloadHls(item, dir);
      }

      if (!this.stopFlags.has(id)) {
        this.patch(id, { status: 'completed' });
      } else {
        this.stopFlags.delete(id);
        this.patch(id, { status: 'paused' });
      }
    } catch (error) {
      if (this.stopFlags.has(id)) {
        this.stopFlags.delete(id);
        this.patch(id, { status: 'paused' });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.patch(id, { status: 'error', error: message });
      if (__DEV__) console.warn(`[Downloads] ${id} failed:`, message);
    }
  }

  private async downloadMp4(item: DownloadItem, toFile: string): Promise<void> {
    const job = downloadToFile(item.sourceUrl, toFile, DEFAULT_HEADERS, {
      begin: (total) => this.patch(item.id, { totalBytes: total }, false),
      progress: (received) => this.patch(item.id, { receivedBytes: received }, false),
    });
    this.currentJobs.set(item.id, job);
    try {
      await job.promise;
    } finally {
      this.currentJobs.delete(item.id);
    }
    if (!this.stopFlags.has(item.id)) {
      this.patch(item.id, { localMedia: `file://${toFile}` });
    }
  }

  private async fetchPlaylist(url: string, headers: Record<string, string>): Promise<string> {
    const resp = await axios.get(url, {
      headers,
      timeout: 30000,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 300,
    });
    return typeof resp.data === 'string' ? resp.data : String(resp.data);
  }

  private async downloadHls(item: DownloadItem, dir: string): Promise<void> {
    const headers = { ...DEFAULT_HEADERS, ...extraHeadersForUrl(item.sourceUrl) };

    const masterText = await this.fetchPlaylist(item.sourceUrl, headers);
    let mediaUrl = item.sourceUrl;
    let mediaText = masterText;

    if (masterText.includes('#EXT-X-STREAM-INF')) {
      const variants = parseMasterPlaylist(masterText, item.sourceUrl);
      if (variants.length === 0) {
        throw new Error('No playable streams in master playlist');
      }
      const variant = pickVariant(variants, item.quality);
      mediaUrl = variant.url;
      mediaText = await this.fetchPlaylist(mediaUrl, headers);
    }

    const playlist = parseMediaPlaylist(mediaText, mediaUrl);
    if (playlist.encrypted) {
      throw new Error('Encrypted (DRM) streams cannot be downloaded');
    }

    this.patch(item.id, { segmentsTotal: playlist.segments.length, receivedBytes: 0 });

    const done: (M3u8Segment & { index: number })[] = [];

    for (let i = 0; i < playlist.segments.length; i += 1) {
      if (this.stopFlags.has(item.id)) {
        this.patch(item.id, { status: 'paused', segmentsDone: done.length });
        return;
      }

      const segPath = this.segmentPath(item.id, i);
      if (await exists(segPath)) {
        done.push({ ...playlist.segments[i], index: i });
        this.patch(item.id, { segmentsDone: done.length });
        continue;
      }

      const partPath = this.partPath(item.id, i);
      const job = downloadToFile(playlist.segments[i].url, partPath, headers);
      this.currentJobs.set(item.id, job);
      try {
        await job.promise;
      } finally {
        this.currentJobs.delete(item.id);
      }
      await moveFile(partPath, segPath);
      done.push({ index: i, ...playlist.segments[i] });
      this.patch(item.id, { segmentsDone: done.length }, done.length % 5 === 0);
    }

    const playlistText = buildLocalPlaylist({ ...playlist, segments: done });
    await writeFile(`${dir}/index.m3u8`, playlistText);

    this.patch(item.id, {
      localMedia: `file://${dir}/index.m3u8`,
      segmentsDone: done.length,
      segmentsTotal: playlist.segments.length,
      receivedBytes: 0,
      totalBytes: 0,
    });
  }
}

let manager: DownloadsManager | null = null;

/**
 * Get the shared downloads manager singleton.
 */
export function getDownloadsManager(): DownloadsManager {
  if (!manager) {
    manager = new DownloadsManager();
  }
  return manager;
}

export default {
  getDownloadsManager,
  DownloadsManager,
  bindStorage,
  parseMasterPlaylist,
  pickVariant,
  parseMediaPlaylist,
  buildLocalPlaylist,
  resolveUrl,
};
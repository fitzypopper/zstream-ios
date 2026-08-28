/**
 * useLibraryData - Hook for ZStream library data.
 * Fetches bookmarks, progress, and watch history from the backend.
 */
import { useState, useEffect, useCallback } from 'react';
import { getUserId } from '../config/env';
import {
  getBookmarks,
  getProgress,
  getWatchHistory,
  removeBookmark,
  deleteProgress,
} from '../api/auth';
import type { Bookmark, ProgressItem, WatchHistoryItem } from '../api/types';
import { fetchDetails } from '../api/pstream';

export type LibraryTab = 'bookmarks' | 'progress' | 'history';

export interface LibraryEntry {
  key: string;
  tmdbId: string;
  type: 'movie' | 'tv';
  title: string;
  poster: string | null;
  subtitle: string;
  progress: number;
  detail: Bookmark | ProgressItem | WatchHistoryItem | null;
}

function buildSubtitle(raw: Record<string, unknown>): string {
  const year = raw.release_date ?? raw.first_air_date;
  const typeLabel = String(raw.media_type ?? raw.type ?? '').toUpperCase();
  const parts: string[] = [];
  if (typeLabel) parts.push(typeLabel);
  if (typeof year === 'string' && year.length >= 4) parts.push(year.slice(0, 4));
  if (typeof raw.vote_average === 'number') parts.push(`★ ${raw.vote_average.toFixed(1)}`);
  return parts.join(' • ');
}

/**
 * Enrich a library item with TMDB metadata (title, poster, year).
 * Falls back gracefully when TMDB is unreachable.
 */
async function enrichItem(
  tmdbId: string,
  type: 'movie' | 'tv',
  subtitle?: string,
  progress = 0,
): Promise<LibraryEntry> {
  try {
    const media = await fetchDetails(tmdbId);
    const posterPath = media.poster;
    const poster = posterPath
      ? posterPath.startsWith('http')
        ? posterPath
        : `https://image.tmdb.org/t/p/w500${posterPath}`
      : null;

    return {
      key: `${type}-${tmdbId}`,
      tmdbId,
      type,
      title: media.title || `Title ${tmdbId}`,
      poster,
      subtitle: subtitle ?? buildSubtitle(media as unknown as Record<string, unknown>),
      progress,
      detail: null,
    };
  } catch {
    return {
      key: `${type}-${tmdbId}`,
      tmdbId,
      type,
      title: `Title ${tmdbId}`,
      poster: null,
      subtitle: subtitle ?? type === 'movie' ? 'Movie' : 'TV Show',
      progress,
      detail: null,
    };
  }
}

/**
 * Main hook - loads all library sections.
 */
export function useLibraryData() {
  const [bookmarks, setBookmarks] = useState<LibraryEntry[]>([]);
  const [progress, setProgress] = useState<LibraryEntry[]>([]);
  const [history, setHistory] = useState<LibraryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setIsError(false);
      try {
        const userId = await getUserId();
        if (!userId) {
          if (!cancelled) {
            setBookmarks([]);
            setProgress([]);
            setHistory([]);
            setIsLoading(false);
          }
          return;
        }

        const [bookmarksRes, progressRes, historyRes] = await Promise.all([
          getBookmarks(userId, 100).catch(() => ({ items: [], nextCursor: undefined })),
          getProgress(userId, 100).catch(() => ({ items: [], nextCursor: undefined })),
          getWatchHistory(userId).catch(() => []),
        ]);

        const bookmarkEntries = await Promise.all(
          (bookmarksRes.items || []).map((b) =>
            enrichItem(b.tmdbId, b.type, undefined, 0),
          ),
        );
        const progressEntries = await Promise.all(
          (progressRes.items || []).map((p) =>
            enrichItem(
              p.tmdbId,
              p.type,
              p.type === 'tv' && p.episodeNumber
                ? `S${p.seasonNumber ?? 1} E${p.episodeNumber}`
                : undefined,
              p.progress,
            ),
          ),
        );
        const historyEntries = await Promise.all(
          (historyRes || []).map((h) =>
            enrichItem(h.tmdbId, h.type, undefined, h.progress ?? 0),
          ),
        );

        if (!cancelled) {
          setBookmarks(bookmarkEntries);
          setProgress(progressEntries);
          setHistory(historyEntries);
        }
      } catch (err) {
        if (!cancelled) {
          setIsError(true);
          if (__DEV__) {
            console.error('[Library] Failed to load library data:', err);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const removeBookmarkItem = useCallback(
    async (tmdbId: string) => {
      const userId = await getUserId();
      if (!userId) return;
      try {
        await removeBookmark(userId, tmdbId);
        setBookmarks((prev) => prev.filter((b) => b.tmdbId !== tmdbId));
      } catch (err) {
        if (__DEV__) console.error('[Library] Failed to remove bookmark:', err);
      }
    },
    [],
  );

  const clearProgressItem = useCallback(
    async (tmdbId: string) => {
      const userId = await getUserId();
      if (!userId) return;
      try {
        await deleteProgress(userId, tmdbId);
        setProgress((prev) => prev.filter((p) => p.tmdbId !== tmdbId));
      } catch (err) {
        if (__DEV__) console.error('[Library] Failed to clear progress:', err);
      }
    },
    [],
  );

  return {
    bookmarks,
    progress,
    history,
    isLoading,
    isError,
    reload,
    removeBookmarkItem,
    clearProgressItem,
  };
}
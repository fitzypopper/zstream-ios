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

function buildSubtitle(meta?: { type?: string; year?: number; title?: string }): string {
  const typeLabel = (meta?.type ?? '').toUpperCase();
  const parts: string[] = [];
  if (typeLabel) parts.push(typeLabel);
  if (meta?.year) parts.push(String(meta.year));
  return parts.join(' • ');
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

        const fromMeta = (
          tmdbId: string,
          meta: { type: string; title: string; poster?: string | null } | undefined,
          subtitle: string,
          progress: number,
        ): LibraryEntry => {
          const type = meta?.type === 'show' ? 'tv' : meta?.type === 'movie' ? 'movie' : 'movie';
          const poster = meta?.poster
            ? meta.poster.startsWith('http')
              ? meta.poster
              : `https://image.tmdb.org/t/p/w500${meta.poster}`
            : null;
          return {
            key: `${type}-${tmdbId}`,
            tmdbId,
            type,
            title: meta?.title || `Title ${tmdbId}`,
            poster,
            subtitle,
            progress,
            detail: null,
          };
        };

        const bookmarkEntries = (bookmarksRes.items || []).map((b) =>
          fromMeta(b.tmdbId, b.meta, buildSubtitle(b.meta), 0),
        );
        const progressEntries = (progressRes.items || []).map((p) => {
          const isShow = p.meta?.type === 'show';
          const subtitle = isShow
            ? `S${p.season?.number ?? 1} E${p.episode?.number ?? 1}`
            : buildSubtitle(p.meta);
          const progress = typeof p.watched === 'number'
            ? p.watched
            : parseFloat(String(p.watched ?? 0)) || 0;
          return fromMeta(p.tmdbId, p.meta, subtitle, progress);
        });
        const historyEntries = (historyRes || []).map((h) =>
          fromMeta(h.tmdbId, h.meta, buildSubtitle(h.meta), 0),
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
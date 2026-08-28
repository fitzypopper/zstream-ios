/**
 * ZStream API adapter.
 * Provides typed functions for interacting with the ZStream backend.
 */

import { get } from './client';
import { TMDB_API_KEY } from '../config/defaults';
import {
  MediaItem,
  Source,
  SourcesResponse,
} from './types';

/**
 * Map raw response item to MediaItem type.
 */
function mapToMediaItem(raw: Record<string, unknown>): MediaItem {
  const id = String(raw.id ?? raw._id ?? raw.tmdbId ?? '');
  const tmdbId = raw.tmdbId ?? raw.tmdb_id ?? raw.id;
  const title = String(raw.title ?? raw.name ?? 'Unknown');
  const poster = raw.poster ?? raw.poster_path ?? raw.image ?? null;
  const backdrop = raw.backdrop ?? raw.backdrop_path ?? null;
  const overview = String(raw.overview ?? raw.description ?? raw.plot ?? '');

  let type: MediaItem['type'] = 'unknown';
  if (raw.type === 'movie' || raw.media_type === 'movie') {
    type = 'movie';
  } else if (raw.type === 'tv' || raw.media_type === 'tv' || raw.seasons) {
    type = 'tv';
  } else if (raw.type === 'episode' || raw.episode_number) {
    type = 'episode';
  }

  let year: number | undefined;
  const releaseDate = raw.release_date ?? raw.first_air_date ?? raw.year;
  if (typeof releaseDate === 'string' && releaseDate.length >= 4) {
    year = parseInt(releaseDate.substring(0, 4), 10);
  } else if (typeof releaseDate === 'number') {
    year = releaseDate;
  }

  const rating = typeof raw.rating === 'number'
    ? raw.rating
    : typeof raw.vote_average === 'number'
      ? raw.vote_average
      : undefined;

  let sources: Source[] | undefined;
  if (Array.isArray(raw.sources)) {
    sources = raw.sources.map(mapToSource);
  }

  return {
    id,
    tmdbId: tmdbId ? String(tmdbId) : undefined,
    title,
    poster: poster ? String(poster) : null,
    backdrop: backdrop ? String(backdrop) : null,
    overview,
    type,
    year,
    rating,
    sources,
    season: typeof raw.season === 'number' ? raw.season : undefined,
    episode: typeof raw.episode === 'number' ? raw.episode : undefined,
    genres: Array.isArray(raw.genres)
      ? raw.genres.map((g: unknown) =>
          typeof g === 'string' ? g : String((g as { name?: string })?.name ?? g),
        )
      : undefined,
  };
}

/**
 * Map raw source to Source type.
 */
function mapToSource(raw: Record<string, unknown>): Source {
  const url = String(raw.url ?? raw.file ?? raw.src ?? '');
  const provider = String(raw.provider ?? raw.source ?? 'unknown');
  const quality = String(raw.quality ?? raw.label ?? 'auto');

  let type: Source['type'] = 'unknown';
  const rawType = String(raw.type ?? '').toLowerCase();
  if (rawType.includes('hls') || url.includes('.m3u8')) {
    type = 'hls';
  } else if (rawType.includes('mp4') || url.includes('.mp4')) {
    type = 'mp4';
  } else if (rawType.includes('dash') || url.includes('.mpd')) {
    type = 'dash';
  }

  return { url, provider, quality, type };
}

/**
 * Fetch home page content.
 * Uses TMDB API for discovery.
 */
export async function fetchHome(): Promise<MediaItem[]> {
  try {
    const [moviesRes, tvRes] = await Promise.all([
      get<{ results: Record<string, unknown>[] }>(
        'https://api.themoviedb.org/3/trending/movie/week',
        { api_key: TMDB_API_KEY },
      ).catch(() => ({ results: [] })),
      get<{ results: Record<string, unknown>[] }>(
        'https://api.themoviedb.org/3/trending/tv/week',
        { api_key: TMDB_API_KEY },
      ).catch(() => ({ results: [] })),
    ]);

    const movies = (moviesRes.results || []).map((item) =>
      mapToMediaItem({ ...item, media_type: 'movie' }),
    );
    const tv = (tvRes.results || []).map((item) =>
      mapToMediaItem({ ...item, media_type: 'tv' }),
    );

    return [...movies.slice(0, 10), ...tv.slice(0, 10)];
  } catch (error) {
    if (__DEV__) {
      console.error('[ZStream] fetchHome error:', error);
    }
    throw error;
  }
}

/**
 * Search for media content.
 */
export async function search(query: string): Promise<MediaItem[]> {
  if (!query.trim()) return [];

  try {
    const response = await get<{ results: Record<string, unknown>[] }>(
      'https://api.themoviedb.org/3/search/multi',
      { api_key: TMDB_API_KEY, query },
    );

    return (response.results || [])
      .filter((item) => {
        const mediaType = String(item.media_type ?? '');
        return mediaType === 'movie' || mediaType === 'tv' || mediaType === 'person';
      })
      .filter((item) => String(item.media_type) !== 'person')
      .map((item) => mapToMediaItem(item));
  } catch (error) {
    if (__DEV__) {
      console.error('[ZStream] search error:', error);
    }
    throw error;
  }
}

/**
 * Fetch details for a specific media item.
 */
export async function fetchDetails(id: string): Promise<MediaItem> {
  try {
    // Try TMDB first
    const response = await get<Record<string, unknown>>(
      `https://api.themoviedb.org/3/movie/${id}`,
      { api_key: TMDB_API_KEY },
    ).catch(async () => {
      // Try TV if movie fails
      return get<Record<string, unknown>>(
        `https://api.themoviedb.org/3/tv/${id}`,
        { api_key: TMDB_API_KEY },
      );
    });

    return mapToMediaItem(response);
  } catch (error) {
    if (__DEV__) {
      console.error('[ZStream] fetchDetails error:', error);
    }
    throw error;
  }
}

/**
 * Fetch streaming sources for a media item.
 * Uses ZStream backend for debrid-backed sources.
 */
export async function fetchSources(
  _tmdbId: string,
  _mediaType: 'movie' | 'tv' = 'movie',
): Promise<SourcesResponse> {
  // ZStream backend doesn't expose a direct /sources endpoint in the decompiled code;
  // real sources are provided by the debrid service & TV sync layer.
  return { sources: [], subtitles: [] };
}

/**
 * Fetch latest movies from TMDB.
 */
export async function fetchLatest(): Promise<MediaItem[]> {
  try {
    const response = await get<{ results: Record<string, unknown>[] }>(
      'https://api.themoviedb.org/3/movie/now_playing',
      { api_key: TMDB_API_KEY },
    );

    return (response.results || []).map((item) =>
      mapToMediaItem({ ...item, media_type: 'movie' }),
    );
  } catch (error) {
    if (__DEV__) {
      console.error('[ZStream] fetchLatest error:', error);
    }
    throw error;
  }
}

/**
 * Fetch latest TV shows from TMDB.
 */
export async function fetchLatestTV(): Promise<MediaItem[]> {
  try {
    const response = await get<{ results: Record<string, unknown>[] }>(
      'https://api.themoviedb.org/3/tv/on_the_air',
      { api_key: TMDB_API_KEY },
    );

    return (response.results || []).map((item) =>
      mapToMediaItem({ ...item, media_type: 'tv' }),
    );
  } catch (error) {
    if (__DEV__) {
      console.error('[ZStream] fetchLatestTV error:', error);
    }
    throw error;
  }
}

/**
 * Fetch TV show season details.
 */
export async function fetchSeasonDetails(
  tvId: string,
  seasonNumber: number,
): Promise<Record<string, unknown>> {
  return get<Record<string, unknown>>(
    `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}`,
    { api_key: TMDB_API_KEY },
  );
}

/**
 * Fetch movie recommendations.
 */
export async function fetchRecommendations(
  id: string,
  type: 'movie' | 'tv' = 'movie',
): Promise<MediaItem[]> {
  try {
    const response = await get<{ results: Record<string, unknown>[] }>(
      `https://api.themoviedb.org/3/${type}/${id}/recommendations`,
      { api_key: TMDB_API_KEY },
    );

    return (response.results || []).map((item) =>
      mapToMediaItem({ ...item, media_type: type }),
    );
  } catch {
    return [];
  }
}

export default {
  fetchHome,
  search,
  fetchDetails,
  fetchSources,
  fetchLatest,
  fetchLatestTV,
  fetchSeasonDetails,
  fetchRecommendations,
};

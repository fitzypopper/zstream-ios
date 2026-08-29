/**
 * @format
 * Unit tests for the ZStream auth/data API layer (movie-web contracts).
 */

import {
  loginWithPassword,
  registerWithPassword,
  checkAuthStatus,
  getCurrentUser,
  addBookmark,
  updateProgress,
  updateWatchHistory,
} from '../api/auth';

jest.mock('../api/client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
  patch: jest.fn(),
}));

import { get, post, put } from '../api/client';
const mockedPost = post as jest.Mock;
const mockedGet = get as jest.Mock;
const mockedPut = put as jest.Mock;

describe('auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGet.mockResolvedValue({});
    mockedPost.mockResolvedValue({});
    mockedPut.mockResolvedValue({});
  });

  describe('loginWithPassword', () => {
    it('posts to /auth/password/login with username, password, device', async () => {
      await loginWithPassword('fitzy', 'secret', 'zstream-ios-harness');

      expect(mockedPost).toHaveBeenCalledWith('/auth/password/login', {
        username: 'fitzy',
        password: 'secret',
        device: 'zstream-ios-harness',
      });
    });

    it('defaults the device to zstream-ios', async () => {
      await loginWithPassword('fitzy', 'secret');

      expect(mockedPost).toHaveBeenCalledWith('/auth/password/login', {
        username: 'fitzy',
        password: 'secret',
        device: 'zstream-ios',
      });
    });
  });

  describe('registerWithPassword', () => {
    it('sends the movie-web namespace and a real ProfileBody', async () => {
      await registerWithPassword('fitzy', 'secret');
      const body = mockedPost.mock.calls[0][1];

      expect(mockedPost).toHaveBeenCalledWith('/auth/password/register', expect.any(Object));
      expect(body).toEqual({
        username: 'fitzy',
        password: 'secret',
        device: 'zstream-ios',
        namespace: 'movie-web',
        profile: { colorA: 'purple', colorB: 'indigo', icon: 'userdefault' },
      });
    });
  });

  describe('checkAuthStatus', () => {
    it('GETs /auth/status', async () => {
      await checkAuthStatus();
      expect(mockedGet).toHaveBeenCalledWith('/auth/status');
    });
  });

  describe('getCurrentUser', () => {
    it('GETs /users/@me', async () => {
      await getCurrentUser();
      expect(mockedGet).toHaveBeenCalledWith('/users/@me');
    });
  });

  describe('addBookmark', () => {
    it('sends { title, type } body to /users/{id}/bookmarks/{tmdbId}', async () => {
      await addBookmark('u1', 'tt123', { title: 'Dune', type: 'show' });

      expect(mockedPost).toHaveBeenCalledWith('/users/u1/bookmarks/tt123', {
        title: 'Dune',
        type: 'show',
      });
    });
  });

  describe('updateProgress', () => {
    it('puts the full movie-web ProgressInput body (seconds + flat season/episode)', async () => {
      await updateProgress('u1', 'tt123', {
        watched: 42,
        duration: 8400,
        meta: { type: 'show', title: 'Dune', year: 2021 },
        season: { id: 's1', number: 1 },
        episode: { id: 'e1', number: 1 },
      });

      expect(mockedPut).toHaveBeenCalledWith('/users/u1/progress/tt123', {
        tmdbId: 'tt123',
        meta: { type: 'tv', title: 'Dune', year: 2021 },
        watched: 42,
        duration: 8400,
        seasonId: 's1',
        seasonNumber: 1,
        episodeId: 'e1',
        episodeNumber: 1,
      });
    });
  });

  describe('updateWatchHistory', () => {
    it('puts the full WatchHistoryInput body (type maps show->tv)', async () => {
      await updateWatchHistory('u1', 'tt123', {
        watched: 60,
        duration: 8400,
        meta: { type: 'show', title: 'Dune' },
        seasonId: 's1',
        seasonNumber: 1,
        episodeId: 'e1',
        episodeNumber: 1,
      });

      expect(mockedPut).toHaveBeenCalledWith('/users/u1/watch-history/tt123', expect.any(Object));
      const body = mockedPut.mock.calls[0][1];
      expect(body.tmdbId).toBe('tt123');
      expect(body.meta).toEqual({ type: 'tv', title: 'Dune' });
      expect(body.watched).toBe(60);
      expect(body.duration).toBe(8400);
      expect(body.completed).toBe(false);
      expect(body.seasonId).toBe('s1');
      expect(body.seasonNumber).toBe(1);
      expect(body.episodeId).toBe('e1');
      expect(body.episodeNumber).toBe(1);
      expect(typeof body.watchedAt).toBe('string');
      expect(new Date(body.watchedAt).getTime()).not.toBeNaN();
    });
  });
});
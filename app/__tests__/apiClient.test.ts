/**
 * @format
 * Unit tests for API client
 */

import axios from 'axios';
import { createApiClient, getBaseApiUrl } from '../api/client';
import { BASE_API_URL, CLIENT_IDENTIFIER } from '../config/defaults';

// Mock config/env
jest.mock('../config/env', () => ({
  getCurrentInstance: jest.fn(),
  getAuthToken: jest.fn(),
}));
import { getCurrentInstance, getAuthToken } from '../config/env';
const mockedGetCurrentInstance = getCurrentInstance as jest.Mock;
const mockedGetAuthToken = getAuthToken as jest.Mock;

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  request: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  defaults: { headers: { common: {} } },
};

jest.mock('axios', () => jest.fn());
const mockedAxios = axios as unknown as jest.Mock;
const mockedCreate = jest.fn(() => mockAxiosInstance);
(mockedAxios as any).create = mockedCreate;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentInstance.mockResolvedValue(BASE_API_URL);
    mockedGetAuthToken.mockResolvedValue(null);
  });

  describe('getBaseApiUrl', () => {
    it('should return base API URL when no instance is provided', () => {
      expect(getBaseApiUrl()).toBe(BASE_API_URL);
    });
  });

  describe('createApiClient', () => {
    it('should create an axios instance', () => {
      const client = createApiClient();
      expect(mockedCreate).toHaveBeenCalledTimes(1);
      expect(client).toBeDefined();
    });
  });
});

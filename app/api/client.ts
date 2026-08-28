/**
 * API Client - Secure HTTP client for ZStream app.
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import {
  BASE_API_URL,
  API_TIMEOUT,
  API_RETRY_COUNT,
  CLIENT_IDENTIFIER,
} from '../config/defaults';
import { getCurrentInstance, getAuthToken } from '../config/env';
import { normalizeError } from './errors';

export interface NormalizedErrorResponse {
  code: number;
  message: string;
  meta?: Record<string, unknown>;
}

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

function logRequest(method: string, url: string): void {
  if (!__DEV__) return;
  let path = url;
  try {
    if (url.startsWith('http')) {
      const match = url.match(/^https?:\/\/[^/]+(\/[^?]*)?/);
      path = match?.[1] ?? '/';
    }
    path = path.split('?')[0];
  } catch {
    path = '/[parse-error]';
  }
  console.log(`[API] ${method.toUpperCase()} ${path}`);
}

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_API_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const currentUrl = await getCurrentInstance();
      config.baseURL = currentUrl;

      const token = await getAuthToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }

      config.headers.set('X-ZStream-Client', CLIENT_IDENTIFIER);

      logRequest(config.method ?? 'GET', config.url ?? '/');

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(normalizeError(error));
    },
  );

  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const config = error.config as ExtendedAxiosRequestConfig | undefined;

      if (config && shouldRetry(error, config)) {
        config._retryCount = (config._retryCount ?? 0) + 1;
        if (__DEV__) {
          console.log(`[API] Retrying request (attempt ${config._retryCount})`);
        }
        await sleep(1000 * config._retryCount);
        return client.request(config);
      }

      throw normalizeError(error);
    },
  );

  return client;
}

function shouldRetry(
  error: AxiosError,
  config: ExtendedAxiosRequestConfig,
): boolean {
  const retryCount = config._retryCount ?? 0;
  if (retryCount >= API_RETRY_COUNT) return false;
  if (!error.response) return true;
  if (error.response.status >= 500) return true;
  if (error.code === 'ECONNABORTED') return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let apiClient: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!apiClient) {
    apiClient = createApiClient();
  }
  return apiClient;
}

export async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await getApiClient().get<T>(path, { params });
  return response.data;
}

export async function post<T>(path: string, data?: unknown): Promise<T> {
  const response = await getApiClient().post<T>(path, data);
  return response.data;
}

export async function put<T>(path: string, data?: unknown): Promise<T> {
  const response = await getApiClient().put<T>(path, data);
  return response.data;
}

export async function del<T>(path: string, data?: unknown): Promise<T> {
  const response = await getApiClient().delete<T>(path, { data });
  return response.data;
}

export async function patch<T>(path: string, data?: unknown): Promise<T> {
  const response = await getApiClient().patch<T>(path, data);
  return response.data;
}

export function getBaseApiUrl(): string {
  return BASE_API_URL;
}

export default {
  createApiClient,
  getApiClient,
  get,
  post,
  put,
  del,
  patch,
  getBaseApiUrl,
};

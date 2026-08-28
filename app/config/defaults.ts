/**
 * Default configuration values for the ZStream app.
 */

/**
 * Base API URL - the ZStream backend.
 */
export const BASE_API_URL = 'https://backend.zstream.mov';

/**
 * TMDB API key for metadata lookups.
 */
export const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkMGI2OTRhM2IwYjUwMDgxYmIwNzU4MjYyMjAxMzFmNCIsIm5iZiI6MTcyNTQ0OTI3My45OTk5OTksInN1YiI6IjY2ZDFiY2IwMDNhMjM4NzY5MGMwMjVjMCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.jGqSqoUGQdXMCN0CGnFC9NFHV3D7AlO2lWY00sYfxEk';

/**
 * API request timeout in milliseconds
 */
export const API_TIMEOUT = 15000;

/**
 * Number of retry attempts for failed network requests
 */
export const API_RETRY_COUNT = 1;

/**
 * Client identifier sent with all API requests
 */
export const CLIENT_IDENTIFIER = 'zstream-ios';


/**
 * Navigation types for ZStream app.
 */

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Details: { id: string } | undefined;
  Player: { tmdbId: string; type: 'movie' | 'tv'; title?: string; poster?: string };
  Settings: undefined;
  TVSync: undefined;
  Trakt: undefined;
};

export type TabParamList = {
  Home: undefined;
  Latest: undefined;
  LatestTV: undefined;
  Search: undefined;
  Library: undefined;
};

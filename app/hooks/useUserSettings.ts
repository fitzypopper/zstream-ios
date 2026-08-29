/**
 * useUserSettings - React Query hooks for the user's backend settings.
 * Resolves the current user id once, then loads/updates their settings.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { getUserSettings, updateUserSettings } from '../api/auth';
import { getUserId } from '../config/env';
import type { UserSettings } from '../api/types';
import { normalizeSettings, toBackendSettings, DEFAULT_SETTINGS } from '../services/settings';

export const SETTINGS_KEY = ['settings'] as const;

/**
 * Resolve the currently authenticated user's id (cacheable).
 */
function useAuthUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUserId().then((id) => {
      if (cancelled) return;
      setUserId(id);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;
  return userId;
}

/**
 * Load user settings, normalized against local defaults.
 */
export function useUserSettings(): {
  settings: UserSettings;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const userId = useAuthUserId();
  const query = useQuery({
    queryKey: [...SETTINGS_KEY, userId],
    queryFn: () => getUserSettings(userId as string),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const settings = React.useMemo(
    () => normalizeSettings(query.data ?? DEFAULT_SETTINGS),
    [query.data],
  );

  return {
    settings,
    isLoading: query.isLoading || !userId,
    isError: query.isError,
    refetch: query.refetch as () => void,
  };
}

/**
 * Update user settings (optimistic local update, then PUT to backend).
 * The user id is resolved at call time.
 */
export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      const userId = await getUserId();
      if (!userId) {
        throw new Error('Not authenticated');
      }
      return updateUserSettings(userId, patch);
    },
    onMutate: async (patch) => {
      const userId = await getUserId();
      const queryKey = [...SETTINGS_KEY, userId];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<UserSettings | undefined>(queryKey);
      queryClient.setQueryData<UserSettings | undefined>(queryKey, (old) => {
        const current = normalizeSettings(old);
        return { ...current, ...patch };
      });
      return { userId, previous };
    },
    onError: (_error, _patch, context) => {
      if (!context?.userId) return;
      queryClient.setQueryData<UserSettings | undefined>(
        [...SETTINGS_KEY, context.userId],
        context.previous,
      );
    },
    onSettled: (_data, _error, _patch, context) => {
      if (!context?.userId) return;
      void queryClient.invalidateQueries({ queryKey: [...SETTINGS_KEY, context.userId] });
    },
  });
}

/**
 * Convenience hook combining load + save for a single screen.
 */
export function useSettingsActions() {
  const { settings, isLoading, isError, refetch } = useUserSettings();
  const update = useUpdateUserSettings();

  return {
    settings,
    isLoading,
    isError,
    refetch,
    update: (patch: Partial<UserSettings>) => update.mutate(patch),
    save: async (patch: Partial<UserSettings>) => {
      await update.mutateAsync(patch);
    },
    toBackendSettings,
  };
}
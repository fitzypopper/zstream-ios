/**
 * useDownloads - React hook wrapping the downloads manager.
 */

import { useEffect, useState } from 'react';
import {
  getDownloadsManager,
  type DownloadItem,
  type NewDownload,
} from '../services/downloads';

export function useDownloads(): {
  items: DownloadItem[];
  loading: boolean;
  start: (input: NewDownload) => Promise<void>;
  pause: (id: string) => void;
  resume: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
} {
  const manager = getDownloadsManager();
  const [items, setItems] = useState<DownloadItem[]>(manager.getItems());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // Ensure the manager has restored persisted items before subscribing.
    manager
      .init()
      .then(() => {
        if (mounted) {
          setItems(manager.getItems());
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const unsubscribe = manager.subscribe(setItems);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [manager]);

  return {
    items,
    loading,
    start: (input) => manager.start(input),
    pause: (id) => manager.pause(id),
    resume: (id) => manager.resume(id),
    remove: (id) => manager.remove(id),
    clear: () => manager.clear(),
  };
}
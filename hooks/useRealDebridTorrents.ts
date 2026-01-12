import { useCallback, useEffect, useMemo, useState } from "react";
import { createRealDebridClient } from "@/lib/api/realdebrid";
import { useApiKeyStore } from "@/stores/api-keys";

const DEFAULT_REFRESH_INTERVAL_MS = 15000;
const CACHING_STATUSES = new Set([
  "magnet_conversion",
  "waiting_files_selection",
  "queued",
  "downloading",
  "uploading",
  "compressing",
]);

interface UseRealDebridTorrentsOptions {
  enabled?: boolean;
  refreshIntervalMs?: number;
}

interface RealDebridTorrentState {
  hash: string;
  status: string;
}

interface UseRealDebridTorrentsResult {
  torrents: Record<string, RealDebridTorrentState>;
  cachingHashes: Set<string>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRealDebridTorrents(
  options: UseRealDebridTorrentsOptions = {}
): UseRealDebridTorrentsResult {
  const { enabled = true, refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS } = options;
  const realDebridApiKey = useApiKeyStore((s) => s.realDebridApiKey);
  const [torrents, setTorrents] = useState<Record<string, RealDebridTorrentState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTorrents = useCallback(async () => {
    if (!realDebridApiKey || !enabled) {
      setTorrents({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = createRealDebridClient(realDebridApiKey);
      const items = await client.getTorrents();
      const nextTorrents = items.reduce<Record<string, RealDebridTorrentState>>(
        (acc, item) => {
          const hash = item.hash?.toLowerCase();
          if (!hash) return acc;
          acc[hash] = { hash, status: item.status };
          return acc;
        },
        {}
      );
      setTorrents(nextTorrents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Real-Debrid torrents");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, realDebridApiKey]);

  useEffect(() => {
    if (!realDebridApiKey || !enabled) return;
    fetchTorrents();

    const interval = setInterval(fetchTorrents, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, fetchTorrents, realDebridApiKey, refreshIntervalMs]);

  const cachingHashes = useMemo(() => {
    const next = new Set<string>();
    for (const torrent of Object.values(torrents)) {
      if (CACHING_STATUSES.has(torrent.status)) {
        next.add(torrent.hash);
      }
    }
    return next;
  }, [torrents]);

  return {
    torrents,
    cachingHashes,
    isLoading,
    error,
    refetch: fetchTorrents,
  };
}

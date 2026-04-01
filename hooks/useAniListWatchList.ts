import * as React from "react";
import { type AniListMediaListEntry, createAniListClient } from "@/lib/api/anilist";
import { useAniListStore } from "@/stores/anilist";
import { useSettingsStore } from "@/stores/settings";

export function useAniListWatchList() {
  const { accessToken } = useAniListStore();
  const { enableAnilistSync } = useSettingsStore();
  const isAvailable = enableAnilistSync && accessToken !== null;

  const [items, setItems] = React.useState<AniListMediaListEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Keep a ref to the debounce timers for each media ID
  const debounceTimers = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  // Keep a ref to the client so we reuse the cached viewer ID
  const clientRef = React.useRef<ReturnType<typeof createAniListClient> | null>(null);

  const getClient = React.useCallback(() => {
    if (!accessToken) return null;
    if (!clientRef.current) {
      clientRef.current = createAniListClient(accessToken);
    }
    return clientRef.current;
  }, [accessToken]);

  // Reset client when token changes
  React.useEffect(() => {
    clientRef.current = null;
  }, [accessToken]);

  const fetchList = React.useCallback(async () => {
    if (!isAvailable) {
      setItems([]);
      return;
    }

    const client = getClient();
    if (!client) return;

    setIsLoading(true);
    setError(null);

    try {
      const entries = await client.getWatchingList();
      setItems(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch watch list");
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, getClient]);

  const updateProgress = React.useCallback(
    (mediaId: number, newProgress: number, totalEpisodes: number | null) => {
      if (newProgress < 0) return;
      if (totalEpisodes !== null && newProgress > totalEpisodes) return;

      // Optimistic update
      setItems((prev) =>
        prev.map((entry) =>
          entry.media.id === mediaId ? { ...entry, progress: newProgress } : entry
        )
      );

      // Debounce the API call
      const existing = debounceTimers.current.get(mediaId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        debounceTimers.current.delete(mediaId);

        const client = getClient();
        if (!client) return;

        try {
          const status =
            totalEpisodes !== null && newProgress >= totalEpisodes ? "COMPLETED" : "CURRENT";
          await client.saveProgress({ mediaId, progress: newProgress, status });

          // If completed, remove from currently watching list
          if (status === "COMPLETED") {
            setItems((prev) => prev.filter((entry) => entry.media.id !== mediaId));
          }
        } catch {
          // Revert optimistic update by refetching
          await fetchList();
          setError("Failed to update progress");
        }
      }, 1500);

      debounceTimers.current.set(mediaId, timer);
    },
    [getClient, fetchList]
  );

  // Cleanup debounce timers on unmount
  React.useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return { items, isLoading, error, refetch: fetchList, updateProgress, isAvailable };
}

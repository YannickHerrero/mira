import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { eq } from "drizzle-orm";
import { useDatabase } from "@/db/provider";
import { listsTable, listItemsTable } from "@/db/schema";
import { useApiKeyStore } from "@/stores/api-keys";
import { useLanguageStore } from "@/stores/language";
import { createTMDBClient } from "@/lib/api/tmdb";
import { exportRecentReleasesToWidget } from "@/lib/widget";
import type { UpcomingRelease } from "@/lib/api/tmdb";

interface UseRecentReleasesReturn {
  releases: UpcomingRelease[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch last 5 released TV episodes from the user's watchlist
 * Only returns episodes that have already aired (releaseDate < today)
 */
export function useRecentReleases(): UseRecentReleasesReturn {
  const { db } = useDatabase();
  const { tmdbApiKey } = useApiKeyStore();
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage);

  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchData = useCallback(async (force = false) => {
    if (!db || !tmdbApiKey) {
      setIsLoading(false);
      setError(tmdbApiKey ? "Database not ready" : "TMDB API key not configured");
      return;
    }

    // Prevent concurrent fetches and re-fetches unless forced
    if (isFetchingRef.current || (hasFetchedRef.current && !force)) {
      return;
    }

    isFetchingRef.current = true;

    try {
      setError(null);

      // Get the default watchlist
      const defaultList = await db
        .select()
        .from(listsTable)
        .where(eq(listsTable.isDefault, true))
        .limit(1);

      if (defaultList.length === 0) {
        setReleases([]);
        setIsLoading(false);
        return;
      }

      const listId = defaultList[0].id;

      // Get all TV items in the default list
      const listItems = await db
        .select()
        .from(listItemsTable)
        .where(eq(listItemsTable.listId, listId));

      // Filter to only TV shows
      const tvItems = listItems.filter((item) => item.mediaType === "tv");

      if (tvItems.length === 0) {
        setReleases([]);
        setIsLoading(false);
        return;
      }

      // Create TMDB client
      const tmdbClient = createTMDBClient(tmdbApiKey, resolvedLanguage);

      // Fetch last episode info for each TV show
      const allReleases: UpcomingRelease[] = [];

      for (const item of tvItems) {
        try {
          const lastRelease = await tmdbClient.getTvLastEpisode(item.tmdbId);
          if (lastRelease) {
            allReleases.push(lastRelease);
          }
        } catch (err) {
          console.error(`Failed to fetch last episode for ${item.tmdbId}:`, err);
        }
      }

      // Filter to only past releases (already aired)
      const now = new Date();
      const pastReleases = allReleases.filter((release) => {
        const releaseDate = new Date(release.releaseDate);
        return releaseDate <= now;
      });

      // Sort by release date descending (most recent first)
      pastReleases.sort(
        (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      );

      // Limit to 5 items
      const limitedReleases = pastReleases.slice(0, 5);
      setReleases(limitedReleases);
      hasFetchedRef.current = true;

      // Export to widget
      exportRecentReleasesToWidget(pastReleases);
    } catch (err) {
      console.error("Failed to fetch recent releases:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch recent releases");
      setReleases([]);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [db, tmdbApiKey, resolvedLanguage]);

  useFocusEffect(
    useCallback(() => {
      if (db && tmdbApiKey) {
        fetchData();
      }
    }, [db, tmdbApiKey, fetchData])
  );

  const refetch = useCallback(async () => {
    setIsLoading(true);
    hasFetchedRef.current = false;
    await fetchData(true);
  }, [fetchData]);

  return {
    releases,
    isLoading,
    error,
    refetch,
  };
}

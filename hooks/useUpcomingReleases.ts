import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { eq } from "drizzle-orm";
import { useDatabase } from "@/db/provider";
import { listsTable, listItemsTable } from "@/db/schema";
import { useApiKeyStore } from "@/stores/api-keys";
import { useLanguageStore } from "@/stores/language";
import { createTMDBClient } from "@/lib/api/tmdb";
import { exportUpcomingReleasesToWidget } from "@/lib/widget";
import {
  generateWatchlistHash,
  isCacheValid,
  getCachedReleases,
  setCachedReleases,
} from "@/lib/calendar-cache";
import type { UpcomingRelease } from "@/lib/api/tmdb";

interface UseUpcomingReleasesOptions {
  /** The month to filter releases for (0-11) */
  month: number;
  /** The year to filter releases for */
  year: number;
}

interface UseUpcomingReleasesReturn {
  releasesByDate: Map<string, UpcomingRelease[]>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch releases from the default watchlist for a specific month
 */
export function useUpcomingReleases(options: UseUpcomingReleasesOptions): UseUpcomingReleasesReturn {
  const { month, year } = options;
  const { db } = useDatabase();
  const { tmdbApiKey } = useApiKeyStore();
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage);

  const [releasesByDate, setReleasesByDate] = useState<Map<string, UpcomingRelease[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  /**
   * Group releases by date and return as a Map
   */
  const groupReleasesByDate = useCallback((releases: UpcomingRelease[]): Map<string, UpcomingRelease[]> => {
    // Sort by release date
    const sorted = [...releases].sort(
      (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
    );

    // Group by date (YYYY-MM-DD)
    const groupedByDate = new Map<string, UpcomingRelease[]>();

    for (const release of sorted) {
      const date = release.releaseDate.split("T")[0];
      if (!groupedByDate.has(date)) {
        groupedByDate.set(date, []);
      }
      groupedByDate.get(date)!.push(release);
    }

    return groupedByDate;
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (!db || !tmdbApiKey) {
      setIsLoading(false);
      setError(tmdbApiKey ? "Database not ready" : "TMDB API key not configured");
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    try {
      setError(null);

      // Get the default watchlist
      const defaultList = await db
        .select()
        .from(listsTable)
        .where(eq(listsTable.isDefault, true))
        .limit(1);

      if (defaultList.length === 0) {
        setReleasesByDate(new Map());
        setIsLoading(false);
        return;
      }

      const listId = defaultList[0].id;

      // Get all items in the default list
      const listItems = await db
        .select()
        .from(listItemsTable)
        .where(eq(listItemsTable.listId, listId));

      if (listItems.length === 0) {
        setReleasesByDate(new Map());
        setIsLoading(false);
        return;
      }

      // Generate watchlist hash for cache validation
      const watchlistHash = generateWatchlistHash(listItems);

      // Check cache (unless force refresh)
      if (!force && isCacheValid(month, year, watchlistHash)) {
        const cachedReleases = getCachedReleases(month, year);
        if (cachedReleases) {
          const groupedByDate = groupReleasesByDate(cachedReleases);
          setReleasesByDate(groupedByDate);
          setIsLoading(false);
          return;
        }
      }

      // Cache miss or force refresh - fetch from API
      isFetchingRef.current = true;
      setIsLoading(true);

      // Create TMDB client
      const tmdbClient = createTMDBClient(tmdbApiKey, resolvedLanguage);

      // Calculate month date range
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Fetch release info for each item
      const releases: UpcomingRelease[] = [];

      for (const item of listItems) {
        try {
          if (item.mediaType === "tv") {
            // Fetch all episodes that air within the selected month
            const episodeReleases = await tmdbClient.getTvEpisodesInDateRange(
              item.tmdbId,
              monthStart,
              monthEnd
            );
            releases.push(...episodeReleases);
          } else if (item.mediaType === "movie") {
            const release = await tmdbClient.getMovieReleaseInfo(item.tmdbId);
            if (release) {
              // Filter movie to be within the selected month
              const releaseDate = new Date(release.releaseDate);
              if (releaseDate >= monthStart && releaseDate <= monthEnd) {
                releases.push(release);
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch release info for ${item.tmdbId}:`, err);
        }
      }

      // Store in cache
      setCachedReleases(month, year, releases, watchlistHash);

      // Group and set state
      const groupedByDate = groupReleasesByDate(releases);
      setReleasesByDate(groupedByDate);

      // Export to widget (only for current month to avoid unnecessary updates)
      const now = new Date();
      if (month === now.getMonth() && year === now.getFullYear()) {
        exportUpcomingReleasesToWidget(groupedByDate);
      }
    } catch (err) {
      console.error("Failed to fetch upcoming releases:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch upcoming releases");
      setReleasesByDate(new Map());
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [db, tmdbApiKey, resolvedLanguage, month, year, groupReleasesByDate]);

  useFocusEffect(
    useCallback(() => {
      if (db && tmdbApiKey) {
        fetchData();
      }
    }, [db, tmdbApiKey, fetchData])
  );

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    releasesByDate,
    isLoading,
    error,
    refetch,
  };
}

/**
 * User Preferences Hook
 *
 * Analyzes watch history to build a user preference profile
 * for the recommendation engine.
 */

import * as React from "react";
import { desc } from "drizzle-orm";
import { useDatabase } from "@/db/provider";
import { mediaTable, watchProgressTable } from "@/db/schema";
import type { MediaRecord, WatchProgress } from "@/db/schema";
import type { MediaType } from "@/lib/types";
import {
  buildGenreAffinity,
  getTopGenres,
  calculateImplicitRating,
  calculateTvShowRating,
} from "@/lib/recommendations/scoring";

export type HistoryDepth = "cold" | "warm" | "active";

export interface WatchedMedia {
  media: MediaRecord;
  rating: number; // Implicit rating calculated from watch behavior
}

export interface UserPreferences {
  /** Genre affinities (weighted by completion + recency) */
  genreAffinity: Map<string, number>;

  /** Top genres sorted by affinity */
  topGenres: Array<{ genre: string; score: number }>;

  /** Recently enjoyed content (for "Because you watched" sections) */
  recentlyEnjoyed: WatchedMedia[];

  /** All watched media with ratings (for filtering) */
  watchedMedia: WatchedMedia[];

  /** Set of completed media IDs (for filtering recommendations) */
  completedIds: Set<string>;

  /** User engagement level (for cold start detection) */
  historyDepth: HistoryDepth;

  /** Whether preferences are still loading */
  isLoading: boolean;

  /** Refetch preferences */
  refetch: () => Promise<void>;
}

/**
 * Create a unique key for media item
 */
function mediaKey(tmdbId: number, mediaType: MediaType | string): string {
  return `${mediaType}-${tmdbId}`;
}

/**
 * Determine history depth based on number of unique watched items
 */
function getHistoryDepth(watchedCount: number): HistoryDepth {
  if (watchedCount < 3) return "cold";
  if (watchedCount < 15) return "warm";
  return "active";
}

/**
 * Hook to build user preferences from watch history
 */
export function useUserPreferences(): UserPreferences {
  const { db } = useDatabase();
  const [isLoading, setIsLoading] = React.useState(true);
  const [genreAffinity, setGenreAffinity] = React.useState<Map<string, number>>(
    new Map()
  );
  const [topGenres, setTopGenres] = React.useState<
    Array<{ genre: string; score: number }>
  >([]);
  const [recentlyEnjoyed, setRecentlyEnjoyed] = React.useState<WatchedMedia[]>(
    []
  );
  const [watchedMedia, setWatchedMedia] = React.useState<WatchedMedia[]>([]);
  const [completedIds, setCompletedIds] = React.useState<Set<string>>(
    new Set()
  );
  const [historyDepth, setHistoryDepth] = React.useState<HistoryDepth>("cold");

  const fetchPreferences = React.useCallback(async () => {
    if (!db) return;

    setIsLoading(true);

    try {
      // Fetch all watch progress with associated media
      const progressRecords = await db
        .select()
        .from(watchProgressTable)
        .orderBy(desc(watchProgressTable.updatedAt));

      // Fetch all media that has been interacted with
      const mediaRecords = await db.select().from(mediaTable);

      // Create a map of media by key for quick lookup
      const mediaMap = new Map<string, MediaRecord>();
      for (const media of mediaRecords) {
        mediaMap.set(mediaKey(media.tmdbId, media.mediaType), media);
      }

      // Group progress by show for TV (to calculate show-level ratings)
      const tvShowProgress = new Map<string, WatchProgress[]>();
      const movieProgress: Array<{ watch: WatchProgress; media: MediaRecord }> =
        [];

      for (const progress of progressRecords) {
        const key = mediaKey(progress.tmdbId, progress.mediaType);
        const media = mediaMap.get(key);

        if (!media) continue;

        if (progress.mediaType === "tv") {
          if (!tvShowProgress.has(key)) {
            tvShowProgress.set(key, []);
          }
          tvShowProgress.get(key)!.push(progress);
        } else {
          movieProgress.push({ watch: progress, media });
        }
      }

      // Calculate ratings for all watched content
      const allWatched: WatchedMedia[] = [];
      const completed = new Set<string>();

      // Process movies
      for (const { watch, media } of movieProgress) {
        const rating = calculateImplicitRating(watch, media);
        allWatched.push({ media, rating });

        if (watch.completed) {
          completed.add(mediaKey(media.tmdbId, media.mediaType));
        }
      }

      // Process TV shows (aggregate episode watches into show-level rating)
      for (const [key, episodes] of tvShowProgress) {
        const media = mediaMap.get(key);
        if (!media) continue;

        // Only include if at least 1 episode was watched
        if (episodes.length >= 1) {
          const rating = calculateTvShowRating(episodes, media);
          allWatched.push({ media, rating });

          // Consider completed if all known episodes are completed
          // For simplicity, mark as completed if majority of watched episodes are completed
          const completedEpisodes = episodes.filter((e) => e.completed).length;
          if (completedEpisodes > 0 && completedEpisodes === episodes.length) {
            // User completed all episodes they started
            // Only mark as "completed" (filter from recommendations) if they've watched significant portion
            const totalEpisodes = media.episodeCount || episodes.length;
            if (completedEpisodes / totalEpisodes >= 0.8) {
              completed.add(key);
            }
          }
        }
      }

      // Sort by rating descending
      allWatched.sort((a, b) => b.rating - a.rating);

      // Build genre affinity from all watch history
      const watchHistoryForGenres = movieProgress.concat(
        // Add TV shows as single entries for genre calculation
        Array.from(tvShowProgress.entries())
          .filter(([_, episodes]) => episodes.length >= 1)
          .map(([key, episodes]) => {
            const media = mediaMap.get(key)!;
            // Use the most recent episode watch for the TV show
            const mostRecent = episodes.reduce((latest, current) => {
              const latestDate = new Date(latest.watchedAt || 0);
              const currentDate = new Date(current.watchedAt || 0);
              return currentDate > latestDate ? current : latest;
            });
            return { watch: mostRecent, media };
          })
      );

      const affinity = buildGenreAffinity(watchHistoryForGenres);
      const topGenresList = getTopGenres(affinity, 5);

      // Get recently enjoyed content (positive rating, for "Because you watched")
      // Filter to only include content with positive ratings
      const enjoyed = allWatched
        .filter((w) => w.rating > 0.3)
        .slice(0, 10);

      // Determine history depth
      const depth = getHistoryDepth(allWatched.length);

      // Update state
      setGenreAffinity(affinity);
      setTopGenres(topGenresList);
      setRecentlyEnjoyed(enjoyed);
      setWatchedMedia(allWatched);
      setCompletedIds(completed);
      setHistoryDepth(depth);
    } catch (error) {
      console.error("[useUserPreferences] Error fetching preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  // Fetch on mount and when db changes
  React.useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    genreAffinity,
    topGenres,
    recentlyEnjoyed,
    watchedMedia,
    completedIds,
    historyDepth,
    isLoading,
    refetch: fetchPreferences,
  };
}

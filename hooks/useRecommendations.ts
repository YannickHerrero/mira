/**
 * Recommendations Hook
 *
 * Generates personalized recommendations based on user watch history.
 * Implements caching to reduce API calls.
 */

import * as React from "react";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useUserPreferences, type WatchedMedia } from "@/hooks/useUserPreferences";
import { createTMDBClient } from "@/lib/api/tmdb";
import { genreNamesToIds } from "@/lib/recommendations/scoring";
import type { Media, MediaType } from "@/lib/types";

// Cache duration: 2 hours (in milliseconds)
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000;

export interface RecommendationSection {
  id: string;
  title: string;
  items: Media[];
  reason?: string;
}

interface CachedRecommendations {
  sections: RecommendationSection[];
  timestamp: number;
}

// In-memory cache (persists across re-renders but not app restarts)
let recommendationsCache: CachedRecommendations | null = null;

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!recommendationsCache) return false;
  const age = Date.now() - recommendationsCache.timestamp;
  return age < CACHE_DURATION_MS;
}

/**
 * Create a unique key for media item
 */
function mediaKey(tmdbId: number, mediaType: MediaType): string {
  return `${mediaType}-${tmdbId}`;
}

/**
 * Deduplicate media items, keeping the first occurrence
 */
function deduplicateMedia(items: Media[]): Media[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = mediaKey(item.id, item.mediaType);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Filter out media that user has already completed
 */
function filterCompleted(items: Media[], completedIds: Set<string>): Media[] {
  return items.filter((item) => {
    const key = mediaKey(item.id, item.mediaType);
    return !completedIds.has(key);
  });
}

/**
 * Convert MediaRecord to Media type
 */
function mediaRecordToMedia(record: WatchedMedia["media"]): Media {
  return {
    id: record.tmdbId,
    mediaType: record.mediaType as MediaType,
    title: record.title,
    titleOriginal: record.titleOriginal ?? undefined,
    imdbId: record.imdbId ?? undefined,
    year: record.year ?? undefined,
    score: record.score ?? undefined,
    posterPath: record.posterPath ?? undefined,
    backdropPath: record.backdropPath ?? undefined,
    description: record.description ?? undefined,
    genres: record.genres ? JSON.parse(record.genres) : [],
    seasonCount: record.seasonCount ?? undefined,
    episodeCount: record.episodeCount ?? undefined,
  };
}

export interface UseRecommendationsResult {
  /** Recommendation sections to display */
  sections: RecommendationSection[];
  /** Whether recommendations are being loaded */
  isLoading: boolean;
  /** Whether we have enough history for personalization */
  hasPersonalization: boolean;
  /** Force refresh recommendations (ignores cache) */
  refetch: () => Promise<void>;
}

/**
 * Hook to get personalized recommendations
 */
export function useRecommendations(): UseRecommendationsResult {
  const { tmdbApiKey } = useApiKeys();
  const preferences = useUserPreferences();

  const [sections, setSections] = React.useState<RecommendationSection[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchRecommendations = React.useCallback(
    async (forceRefresh = false) => {
      // Check cache first (unless force refresh)
      if (!forceRefresh && isCacheValid() && recommendationsCache) {
        setSections(recommendationsCache.sections);
        setIsLoading(false);
        return;
      }

      // Need API key and preferences to be loaded
      if (!tmdbApiKey || preferences.isLoading) {
        return;
      }

      setIsLoading(true);

      try {
        const client = createTMDBClient(tmdbApiKey);
        const newSections: RecommendationSection[] = [];

        // Check if user has enough history for personalization
        const hasHistory = preferences.historyDepth !== "cold";

        if (hasHistory && preferences.recentlyEnjoyed.length > 0) {
          // Generate "Because You Watched" sections (max 2)
          const becauseYouWatchedSections = await generateBecauseYouWatched(
            client,
            preferences.recentlyEnjoyed.slice(0, 2),
            preferences.completedIds
          );
          newSections.push(...becauseYouWatchedSections);

          // Generate "More [Genre]" section based on top genre
          if (preferences.topGenres.length > 0) {
            const topGenre = preferences.topGenres[0];
            const genreSection = await generateGenreSection(
              client,
              topGenre.genre,
              preferences.completedIds
            );
            if (genreSection) {
              newSections.push(genreSection);
            }
          }
        }

        // Update cache
        recommendationsCache = {
          sections: newSections,
          timestamp: Date.now(),
        };

        setSections(newSections);
      } catch (error) {
        console.error("[useRecommendations] Error fetching recommendations:", error);
        // Keep existing sections on error
      } finally {
        setIsLoading(false);
      }
    },
    [tmdbApiKey, preferences]
  );

  // Fetch recommendations when preferences change
  React.useEffect(() => {
    if (!preferences.isLoading) {
      fetchRecommendations();
    }
  }, [preferences.isLoading, fetchRecommendations]);

  const refetch = React.useCallback(async () => {
    // Also refresh user preferences first
    await preferences.refetch();
    await fetchRecommendations(true);
  }, [preferences, fetchRecommendations]);

  return {
    sections,
    isLoading: isLoading || preferences.isLoading,
    hasPersonalization: preferences.historyDepth !== "cold",
    refetch,
  };
}

/**
 * Generate "Because You Watched X" sections
 */
async function generateBecauseYouWatched(
  client: ReturnType<typeof createTMDBClient>,
  recentlyEnjoyed: WatchedMedia[],
  completedIds: Set<string>
): Promise<RecommendationSection[]> {
  const sections: RecommendationSection[] = [];

  for (const watched of recentlyEnjoyed) {
    try {
      const sourceMedia = mediaRecordToMedia(watched.media);

      // Get recommendations from TMDB (collaborative filtering)
      const recommendations = await client.getRecommendations(
        sourceMedia.id,
        sourceMedia.mediaType
      );

      // Filter out completed content and deduplicate
      let filtered = filterCompleted(recommendations, completedIds);
      filtered = deduplicateMedia(filtered);

      // Only create section if we have enough items
      if (filtered.length >= 3) {
        sections.push({
          id: `because-${sourceMedia.mediaType}-${sourceMedia.id}`,
          title: `Because You Watched ${sourceMedia.title}`,
          items: filtered.slice(0, 10),
          reason: `Based on ${sourceMedia.title}`,
        });
      }
    } catch (error) {
      console.error(
        `[useRecommendations] Failed to get recommendations for ${watched.media.title}:`,
        error
      );
    }
  }

  return sections;
}

/**
 * Generate "More [Genre]" section
 */
async function generateGenreSection(
  client: ReturnType<typeof createTMDBClient>,
  genre: string,
  completedIds: Set<string>
): Promise<RecommendationSection | null> {
  try {
    const genreIds = genreNamesToIds([genre]);
    if (genreIds.length === 0) return null;

    // Fetch movies and TV shows in parallel
    const [movies, tvShows] = await Promise.all([
      client.discoverMovies({
        genreIds,
        minRating: 6.5,
        minVoteCount: 100,
        sortBy: "popularity.desc",
      }),
      client.discoverTv({
        genreIds,
        minRating: 6.5,
        minVoteCount: 50,
        sortBy: "popularity.desc",
      }),
    ]);

    // Interleave movies and TV shows
    const combined: Media[] = [];
    const maxLength = Math.max(movies.length, tvShows.length);
    for (let i = 0; i < maxLength && combined.length < 20; i++) {
      if (i < movies.length) combined.push(movies[i]);
      if (i < tvShows.length) combined.push(tvShows[i]);
    }

    // Filter and deduplicate
    let filtered = filterCompleted(combined, completedIds);
    filtered = deduplicateMedia(filtered);

    if (filtered.length < 3) return null;

    return {
      id: `genre-${genre.toLowerCase().replace(/\s+/g, "-")}`,
      title: `More ${genre}`,
      items: filtered.slice(0, 10),
      reason: `Because you like ${genre}`,
    };
  } catch (error) {
    console.error(`[useRecommendations] Failed to generate genre section for ${genre}:`, error);
    return null;
  }
}

/**
 * Clear the recommendations cache.
 * Useful when user's watch history significantly changes.
 */
export function clearRecommendationsCache(): void {
  recommendationsCache = null;
}

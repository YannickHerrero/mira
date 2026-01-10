/**
 * Search Suggestions Hook
 *
 * Provides personalized suggestions for the search page based on user watch history.
 * Falls back to trending content for new users (cold start).
 */

import * as React from "react";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useLanguageStore } from "@/stores/language";
import { createTMDBClient } from "@/lib/api/tmdb";
import { genreNamesToIds } from "@/lib/recommendations/scoring";
import type { Media, MediaType } from "@/lib/types";

// Cache duration: 30 minutes
const CACHE_DURATION_MS = 30 * 60 * 1000;

export interface SearchSuggestion {
  id: number;
  title: string;
  mediaType: MediaType;
}

interface CachedSuggestions {
  suggestions: SearchSuggestion[];
  isPersonalized: boolean;
  timestamp: number;
  cacheKey: string;
}

// In-memory cache
let suggestionsCache: CachedSuggestions | null = null;

/**
 * Create a unique key for media item
 */
function mediaKey(tmdbId: number, mediaType: MediaType): string {
  return `${mediaType}-${tmdbId}`;
}

/**
 * Deduplicate and filter completed items
 */
function processMedia(
  items: Media[],
  completedIds: Set<string>
): SearchSuggestion[] {
  const seen = new Set<string>();
  const result: SearchSuggestion[] = [];

  for (const item of items) {
    const key = mediaKey(item.id, item.mediaType);
    if (seen.has(key) || completedIds.has(key)) continue;
    seen.add(key);
    result.push({
      id: item.id,
      title: item.title,
      mediaType: item.mediaType,
    });
  }

  return result;
}

/**
 * Interleave movies and TV shows for variety
 */
function interleave(movies: SearchSuggestion[], tv: SearchSuggestion[]): SearchSuggestion[] {
  const result: SearchSuggestion[] = [];
  const maxLen = Math.max(movies.length, tv.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < movies.length) result.push(movies[i]);
    if (i < tv.length) result.push(tv[i]);
  }

  return result;
}

export interface UseSearchSuggestionsResult {
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  isPersonalized: boolean;
}

/**
 * Hook to get search suggestions (personalized or trending)
 */
export function useSearchSuggestions(): UseSearchSuggestionsResult {
  const { tmdbApiKey } = useApiKeys();
  const preferences = useUserPreferences();
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage);

  const [suggestions, setSuggestions] = React.useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPersonalized, setIsPersonalized] = React.useState(false);

  const fetchSuggestions = React.useCallback(async () => {
    if (!tmdbApiKey || preferences.isLoading) return;

    // Generate cache key based on language
    const cacheKey = resolvedLanguage || "en";

    // Check cache
    if (
      suggestionsCache &&
      suggestionsCache.cacheKey === cacheKey &&
      Date.now() - suggestionsCache.timestamp < CACHE_DURATION_MS
    ) {
      setSuggestions(suggestionsCache.suggestions);
      setIsPersonalized(suggestionsCache.isPersonalized);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const client = createTMDBClient(tmdbApiKey, resolvedLanguage);
      let result: SearchSuggestion[] = [];
      let personalized = false;

      // Cold start: use trending
      if (preferences.historyDepth === "cold") {
        const [movies, tv] = await Promise.all([
          client.getTrendingMovies("week"),
          client.getTrendingTv("week"),
        ]);

        const movieSuggestions = processMedia(movies, preferences.completedIds);
        const tvSuggestions = processMedia(tv, preferences.completedIds);
        result = interleave(movieSuggestions, tvSuggestions).slice(0, 15);
        personalized = false;
      } else {
        // Warm/Active: use personalized recommendations
        const recsToFetch = preferences.recentlyEnjoyed.slice(0, 2);
        const allRecs: Media[] = [];

        // Fetch recommendations from recently enjoyed items in parallel
        const recPromises = recsToFetch.map((watched) =>
          client.getRecommendations(watched.media.tmdbId, watched.media.mediaType as MediaType)
        );

        // For active users, also add genre-based discovery
        if (preferences.historyDepth === "active" && preferences.topGenres.length > 0) {
          const genreIds = genreNamesToIds([preferences.topGenres[0].genre]);
          if (genreIds.length > 0) {
            recPromises.push(
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
              })
            );
          }
        }

        const recResults = await Promise.all(recPromises);
        for (const recs of recResults) {
          allRecs.push(...recs);
        }

        // Process: filter completed, deduplicate
        const processed = processMedia(allRecs, preferences.completedIds);

        // Separate movies and TV for interleaving
        const movies = processed.filter((s) => s.mediaType === "movie");
        const tv = processed.filter((s) => s.mediaType === "tv");
        result = interleave(movies, tv).slice(0, 15);

        // Fall back to trending if not enough personalized results
        if (result.length < 5) {
          const [trendingMovies, trendingTv] = await Promise.all([
            client.getTrendingMovies("week"),
            client.getTrendingTv("week"),
          ]);

          const trendingMovieSuggestions = processMedia(trendingMovies, preferences.completedIds);
          const trendingTvSuggestions = processMedia(trendingTv, preferences.completedIds);
          result = interleave(trendingMovieSuggestions, trendingTvSuggestions).slice(0, 15);
          personalized = false;
        } else {
          personalized = true;
        }
      }

      // Update cache
      suggestionsCache = {
        suggestions: result,
        isPersonalized: personalized,
        timestamp: Date.now(),
        cacheKey,
      };

      setSuggestions(result);
      setIsPersonalized(personalized);
    } catch (error) {
      console.error("[useSearchSuggestions] Error fetching suggestions:", error);
      // Keep existing suggestions on error
    } finally {
      setIsLoading(false);
    }
  }, [tmdbApiKey, preferences, resolvedLanguage]);

  React.useEffect(() => {
    if (!preferences.isLoading) {
      fetchSuggestions();
    }
  }, [preferences.isLoading, fetchSuggestions]);

  return {
    suggestions,
    isLoading: isLoading || preferences.isLoading,
    isPersonalized,
  };
}

/**
 * Clear the suggestions cache.
 */
export function clearSearchSuggestionsCache(): void {
  suggestionsCache = null;
}

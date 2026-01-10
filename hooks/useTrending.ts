import { useState, useEffect, useCallback } from "react";
import type { Media } from "@/lib/types";
import { createTMDBClient } from "@/lib/api/tmdb";
import { useApiKeyStore } from "@/stores/api-keys";
import { useLanguageStore } from "@/stores/language";

interface UseTrendingResult {
  trendingMovies: Media[];
  trendingTv: Media[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTrending(): UseTrendingResult {
  const [trendingMovies, setTrendingMovies] = useState<Media[]>([]);
  const [trendingTv, setTrendingTv] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage);

  const fetchTrending = useCallback(async () => {
    if (!tmdbApiKey) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = createTMDBClient(tmdbApiKey, resolvedLanguage);

      const [movies, tv] = await Promise.all([
        client.getTrendingMovies("week"),
        client.getTrendingTv("week"),
      ]);

      setTrendingMovies(movies.slice(0, 10));
      setTrendingTv(tv.slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trending");
    } finally {
      setIsLoading(false);
    }
  }, [tmdbApiKey, resolvedLanguage]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return {
    trendingMovies,
    trendingTv,
    isLoading,
    error,
    refetch: fetchTrending,
  };
}

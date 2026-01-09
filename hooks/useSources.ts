import { useState, useEffect, useCallback } from "react";
import type { Stream, MediaType } from "@/lib/types";
import { createTorrentioClient } from "@/lib/api/torrentio";
import { useApiKeyStore } from "@/stores/api-keys";
import { calculateSourceScore, getRecommendedSources } from "@/lib/api/source-scoring";
import { useStreamingPreferences } from "@/hooks/useStreamingPreferences";

interface UseSourcesOptions {
  imdbId: string | null;
  mediaType: MediaType;
  season?: number;
  episode?: number;
  isAnime?: boolean;
  enabled?: boolean;
}

interface UseSourcesResult {
  streams: Stream[];
  recommendedStreams: Stream[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSources({
  imdbId,
  mediaType,
  season,
  episode,
  isAnime = false,
  enabled = true,
}: UseSourcesOptions): UseSourcesResult {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [recommendedStreams, setRecommendedStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realDebridApiKey = useApiKeyStore((s) => s.realDebridApiKey);
  const { preferredAudioLanguages } = useStreamingPreferences();

  const fetchSources = useCallback(async () => {
    if (!imdbId || !realDebridApiKey || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = createTorrentioClient(realDebridApiKey);

      let results: Stream[];
      if (season !== undefined && episode !== undefined) {
        // TV episode
        results = await client.getEpisodeStreams(imdbId, season, episode);
      } else {
        // Movie
        results = await client.getMovieStreams(imdbId);
      }

      const scoringOptions = {
        mediaType,
        isAnime,
        preferredLanguages: preferredAudioLanguages,
      };

      // Get recommended sources
      const recommended = getRecommendedSources(results, scoringOptions);
      setRecommendedStreams(recommended);

      // Sort all streams by score
      results.sort((a, b) => {
        const scoreA = calculateSourceScore(a, scoringOptions);
        const scoreB = calculateSourceScore(b, scoringOptions);
        
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }

        // Tie-breaker: original quality sort
        const qualityOrder: Record<string, number> = {
          "2160p": 4,
          "4K": 4,
          "1080p": 3,
          "720p": 2,
          "480p": 1,
          "360p": 0,
        };

        const aQuality = qualityOrder[a.quality ?? ""] ?? -1;
        const bQuality = qualityOrder[b.quality ?? ""] ?? -1;

        if (aQuality !== bQuality) {
          return bQuality - aQuality;
        }

        return a.sizeBytes - b.sizeBytes;
      });

      setStreams(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
      setStreams([]);
      setRecommendedStreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [imdbId, mediaType, season, episode, isAnime, realDebridApiKey, enabled, preferredAudioLanguages]);

  useEffect(() => {
    if (enabled && imdbId) {
      fetchSources();
    }
  }, [enabled, imdbId, fetchSources]);

  return {
    streams,
    recommendedStreams,
    isLoading,
    error,
    refetch: fetchSources,
  };
}

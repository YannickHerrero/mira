import { useState, useEffect, useCallback } from "react";
import type { Stream } from "@/lib/types";
import { createTorrentioClient } from "@/lib/api/torrentio";
import { useApiKeyStore } from "@/stores/api-keys";

interface UseSourcesOptions {
  imdbId: string | null;
  season?: number;
  episode?: number;
  enabled?: boolean;
}

interface UseSourcesResult {
  streams: Stream[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSources({
  imdbId,
  season,
  episode,
  enabled = true,
}: UseSourcesOptions): UseSourcesResult {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realDebridApiKey = useApiKeyStore((s) => s.realDebridApiKey);

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

      // Sort by quality (4K > 1080p > 720p) and then by size (smallest first)
      results.sort((a, b) => {
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
          return bQuality - aQuality; // Higher quality first
        }

        // If same quality, sort by size (smallest first for faster downloads)
        return a.sizeBytes - b.sizeBytes;
      });

      setStreams(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sources");
      setStreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [imdbId, season, episode, realDebridApiKey, enabled]);

  useEffect(() => {
    if (enabled && imdbId) {
      fetchSources();
    }
  }, [enabled, imdbId, fetchSources]);

  return {
    streams,
    isLoading,
    error,
    refetch: fetchSources,
  };
}

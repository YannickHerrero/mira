import { useState, useEffect, useCallback } from "react";
import type { Stream, MediaType } from "@/lib/types";
import { createNyaaClient } from "@/lib/api/nyaa";
import { createTorrentioClient } from "@/lib/api/torrentio";
import { useApiKeyStore } from "@/stores/api-keys";
import { calculateSourceScore, getRecommendedSources } from "@/lib/api/source-scoring";
import { useStreamingPreferences } from "@/hooks/useStreamingPreferences";

interface UseSourcesOptions {
  imdbId: string | null;
  mediaType: MediaType;
  season?: number;
  episode?: number;
  title?: string;
  originalTitle?: string;
  year?: number;
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
  title,
  originalTitle,
  year,
  isAnime = false,
  enabled = true,
}: UseSourcesOptions): UseSourcesResult {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [recommendedStreams, setRecommendedStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realDebridApiKey = useApiKeyStore((s) => s.realDebridApiKey);
  const { preferredAudioLanguages } = useStreamingPreferences();

  const buildNyaaQueries = () => {
    if (!title) return [];

    const formatEpisodeToken = (seasonNumber?: number, episodeNumber?: number) => {
      if (seasonNumber === undefined || episodeNumber === undefined) return "";
      const seasonLabel = seasonNumber.toString().padStart(2, "0");
      const episodeLabel = episodeNumber.toString().padStart(2, "0");
      return `S${seasonLabel}E${episodeLabel}`;
    };

    const episodeToken = formatEpisodeToken(season, episode);
    const baseTokens = (baseTitle: string) => {
      const tokens = [baseTitle.trim()];
      if (mediaType === "tv" && episodeToken) {
        tokens.push(episodeToken);
      }
      if (mediaType === "movie" && year) {
        tokens.push(year.toString());
      }
      return tokens.filter(Boolean).join(" ");
    };

    const queries = [baseTokens(title)];
    if (originalTitle && originalTitle.toLowerCase() !== title.toLowerCase()) {
      queries.push(baseTokens(originalTitle));
    }

    return queries.filter(Boolean);
  };

  const fetchSources = useCallback(async () => {
    if (!imdbId || !realDebridApiKey || !enabled) {
      return;
    }

    const fetchStart = Date.now();
    setIsLoading(true);
    setError(null);

    try {
      const torrentioClient = createTorrentioClient(realDebridApiKey);

      const torrentioPromise =
        season !== undefined && episode !== undefined
          ? torrentioClient.getEpisodeStreams(imdbId, season, episode, true)
          : torrentioClient.getMovieStreams(imdbId, true);

      const nyaaPromise = isAnime
        ? (async () => {
            try {
              const queries = buildNyaaQueries();
              if (queries.length === 0) return [];
              const nyaaClient = createNyaaClient(realDebridApiKey);
              return await nyaaClient.searchAnime({ queries });
            } catch (err) {
              console.warn("[Sources] Nyaa search failed:", err);
              return [];
            }
          })()
        : Promise.resolve([] as Stream[]);

      const [torrentioResults, nyaaResults] = await Promise.all([
        torrentioPromise,
        nyaaPromise,
      ]);

      const mergedResults = [...torrentioResults, ...nyaaResults];

      const scoringOptions = {
        mediaType,
        isAnime,
        preferredLanguages: preferredAudioLanguages,
      };

      // Get recommended sources
      const recommended = getRecommendedSources(mergedResults, scoringOptions);
      setRecommendedStreams(recommended);

      // Sort all streams by score
      mergedResults.sort((a, b) => {
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

      setStreams(mergedResults);

      // Log slow requests (> 3s)
      const duration = Date.now() - fetchStart;
      if (duration > 3000) {
        console.warn(`[Sources] Slow source fetch: ${duration}ms for ${imdbId} (${mergedResults.length} results)`);
      }
    } catch (err) {
      console.error(`[Sources] Source fetch failed for ${imdbId}:`, err);
      setError(err instanceof Error ? err.message : "Failed to load sources");
      setStreams([]);
      setRecommendedStreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [imdbId, mediaType, season, episode, title, originalTitle, year, isAnime, realDebridApiKey, enabled, preferredAudioLanguages]);

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

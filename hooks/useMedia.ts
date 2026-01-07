import { useState, useEffect, useCallback } from "react";
import type { Media, MediaType, Season, Episode } from "@/lib/types";
import { createTMDBClient } from "@/lib/api/tmdb";
import { useApiKeyStore } from "@/stores/api-keys";

interface UseMediaResult {
  media: Media | null;
  imdbId: string | null;
  seasons: Season[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMedia(tmdbId: number, mediaType: MediaType): UseMediaResult {
  const [media, setMedia] = useState<Media | null>(null);
  const [imdbId, setImdbId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);

  const fetchMedia = useCallback(async () => {
    if (!tmdbApiKey) {
      setError("TMDB API key not configured");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = createTMDBClient(tmdbApiKey);

      // Fetch IMDB ID
      const externalId = await client.getImdbId(tmdbId, mediaType);
      setImdbId(externalId ?? null);

      // For TV shows, fetch details with seasons
      if (mediaType === "tv") {
        const details = await client.getTvDetails(tmdbId);
        setSeasons(details.seasons);

        // Also do a search to get full media info (bit of a hack, but works)
        // In a real app, we'd have a dedicated endpoint for this
        const searchResults = await client.searchTv("");
        const found = searchResults.find((m) => m.id === tmdbId);
        if (found) {
          setMedia({
            ...found,
            seasonCount: details.seasonCount,
            episodeCount: details.episodeCount,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load media");
    } finally {
      setIsLoading(false);
    }
  }, [tmdbId, mediaType, tmdbApiKey]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  return {
    media,
    imdbId,
    seasons,
    isLoading,
    error,
    refetch: fetchMedia,
  };
}

interface UseEpisodesResult {
  episodes: Episode[];
  isLoading: boolean;
  error: string | null;
}

export function useEpisodes(
  tmdbId: number,
  seasonNumber: number
): UseEpisodesResult {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);

  useEffect(() => {
    if (!tmdbApiKey || seasonNumber < 1) {
      setIsLoading(false);
      return;
    }

    const fetchEpisodes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = createTMDBClient(tmdbApiKey);
        const eps = await client.getSeasonEpisodes(tmdbId, seasonNumber);
        setEpisodes(eps);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load episodes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpisodes();
  }, [tmdbId, seasonNumber, tmdbApiKey]);

  return { episodes, isLoading, error };
}

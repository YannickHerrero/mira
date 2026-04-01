import type { Stream, MediaType } from "@/lib/types";
import { createTorrentioClient } from "@/lib/api/torrentio";
import { createNyaaClient } from "@/lib/api/nyaa";
import { getRecommendedSources } from "@/lib/api/source-scoring";

interface FetchBestSourceOptions {
  imdbId: string;
  mediaType: MediaType;
  season: number;
  episode: number;
  title: string;
  originalTitle?: string;
  isAnime: boolean;
  realDebridApiKey: string;
  preferredLanguages: string[];
}

/**
 * Fetch sources for a TV episode and return the best one based on scoring.
 * Combines Torrentio + Nyaa (for anime) results and picks the #1 scored source.
 */
export async function fetchBestSource(options: FetchBestSourceOptions): Promise<Stream | null> {
  const {
    imdbId,
    mediaType,
    season,
    episode,
    title,
    originalTitle,
    isAnime,
    realDebridApiKey,
    preferredLanguages,
  } = options;

  const torrentioClient = createTorrentioClient(realDebridApiKey);

  const torrentioPromise = torrentioClient.getEpisodeStreams(imdbId, season, episode, true);

  const nyaaPromise = isAnime
    ? (async () => {
        try {
          const seasonLabel = season.toString().padStart(2, "0");
          const episodeLabel = episode.toString().padStart(2, "0");
          const episodeToken = `S${seasonLabel}E${episodeLabel}`;

          const queries = [`${title.trim()} ${episodeToken}`];
          if (originalTitle && originalTitle.toLowerCase() !== title.toLowerCase()) {
            queries.push(`${originalTitle.trim()} ${episodeToken}`);
          }

          const nyaaClient = createNyaaClient(realDebridApiKey);
          return await nyaaClient.searchAnime({ queries });
        } catch (err) {
          console.warn("[fetchBestSource] Nyaa search failed:", err);
          return [];
        }
      })()
    : Promise.resolve([] as Stream[]);

  const [torrentioResults, nyaaResults] = await Promise.all([
    torrentioPromise,
    nyaaPromise,
  ]);

  const allStreams = [...torrentioResults, ...nyaaResults];

  if (allStreams.length === 0) return null;

  const scoringOptions = {
    mediaType,
    isAnime,
    preferredLanguages,
  };

  const recommended = getRecommendedSources(allStreams, scoringOptions, 1);
  return recommended[0] ?? null;
}

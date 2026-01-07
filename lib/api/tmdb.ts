/**
 * TMDB (The Movie Database) API Client
 *
 * Provides search and metadata for movies and TV shows.
 * API docs: https://developer.themoviedb.org/docs
 */

import {
  type Media,
  type MediaType,
  type Season,
  type Episode,
  GENRE_MAP,
} from "@/lib/types";

const TMDB_API_URL = "https://api.themoviedb.org/3";

// ============================================
// Response Types (from TMDB API)
// ============================================

interface TMDBSearchResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TMDBMovieResult {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  vote_average?: number;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genre_ids: number[];
}

interface TMDBTvResult {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  vote_average?: number;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genre_ids: number[];
}

interface TMDBExternalIds {
  imdb_id?: string;
  tvdb_id?: number;
}

interface TMDBTvDetails {
  id: number;
  name: string;
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TMDBSeasonInfo[];
}

interface TMDBSeasonInfo {
  season_number: number;
  episode_count: number;
  name?: string;
  poster_path?: string;
  air_date?: string;
}

interface TMDBSeasonDetails {
  season_number: number;
  episodes: TMDBEpisodeInfo[];
}

interface TMDBEpisodeInfo {
  episode_number: number;
  name: string;
  overview?: string;
  air_date?: string;
  still_path?: string;
  runtime?: number;
}

// ============================================
// TMDB Client
// ============================================

export class TMDBClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${TMDB_API_URL}${endpoint}`);
    url.searchParams.set("api_key", this.apiKey);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for movies and TV shows
   */
  async search(query: string, mediaType?: MediaType): Promise<Media[]> {
    if (!query.trim()) return [];

    const results: Media[] = [];

    // Search movies
    if (!mediaType || mediaType === "movie") {
      const movieResponse = await this.fetch<TMDBSearchResponse<TMDBMovieResult>>(
        "/search/movie",
        { query, include_adult: "false" }
      );
      results.push(...movieResponse.results.map((m) => this.mapMovieResult(m)));
    }

    // Search TV shows
    if (!mediaType || mediaType === "tv") {
      const tvResponse = await this.fetch<TMDBSearchResponse<TMDBTvResult>>(
        "/search/tv",
        { query, include_adult: "false" }
      );
      results.push(...tvResponse.results.map((t) => this.mapTvResult(t)));
    }

    // Sort by score (descending)
    return results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  /**
   * Search for movies only
   */
  async searchMovies(query: string): Promise<Media[]> {
    return this.search(query, "movie");
  }

  /**
   * Search for TV shows only
   */
  async searchTv(query: string): Promise<Media[]> {
    return this.search(query, "tv");
  }

  /**
   * Get external IDs (IMDB ID) for a movie or TV show
   */
  async getExternalIds(
    tmdbId: number,
    mediaType: MediaType
  ): Promise<TMDBExternalIds> {
    return this.fetch<TMDBExternalIds>(`/${mediaType}/${tmdbId}/external_ids`);
  }

  /**
   * Get IMDB ID for a movie or TV show
   */
  async getImdbId(tmdbId: number, mediaType: MediaType): Promise<string | undefined> {
    const externalIds = await this.getExternalIds(tmdbId, mediaType);
    return externalIds.imdb_id ?? undefined;
  }

  /**
   * Get TV show details including seasons
   */
  async getTvDetails(tmdbId: number): Promise<{
    seasonCount: number;
    episodeCount: number;
    seasons: Season[];
  }> {
    const details = await this.fetch<TMDBTvDetails>(`/tv/${tmdbId}`);

    return {
      seasonCount: details.number_of_seasons,
      episodeCount: details.number_of_episodes,
      seasons: details.seasons
        .filter((s) => s.season_number > 0) // Filter out "Specials" (season 0)
        .map((s) => ({
          seasonNumber: s.season_number,
          episodeCount: s.episode_count,
          name: s.name,
          posterPath: s.poster_path ?? undefined,
          airDate: s.air_date ?? undefined,
        })),
    };
  }

  /**
   * Get episodes for a specific season
   */
  async getSeasonEpisodes(tmdbId: number, seasonNumber: number): Promise<Episode[]> {
    const details = await this.fetch<TMDBSeasonDetails>(
      `/tv/${tmdbId}/season/${seasonNumber}`
    );

    return details.episodes.map((e) => ({
      episodeNumber: e.episode_number,
      seasonNumber: seasonNumber,
      title: e.name,
      overview: e.overview ?? undefined,
      airDate: e.air_date ?? undefined,
      stillPath: e.still_path ?? undefined,
      runtime: e.runtime ?? undefined,
    }));
  }

  /**
   * Get trending movies
   */
  async getTrendingMovies(timeWindow: "day" | "week" = "week"): Promise<Media[]> {
    const response = await this.fetch<TMDBSearchResponse<TMDBMovieResult>>(
      `/trending/movie/${timeWindow}`
    );
    return response.results.map((m) => this.mapMovieResult(m));
  }

  /**
   * Get trending TV shows
   */
  async getTrendingTv(timeWindow: "day" | "week" = "week"): Promise<Media[]> {
    const response = await this.fetch<TMDBSearchResponse<TMDBTvResult>>(
      `/trending/tv/${timeWindow}`
    );
    return response.results.map((t) => this.mapTvResult(t));
  }

  /**
   * Get popular movies
   */
  async getPopularMovies(): Promise<Media[]> {
    const response = await this.fetch<TMDBSearchResponse<TMDBMovieResult>>(
      "/movie/popular"
    );
    return response.results.map((m) => this.mapMovieResult(m));
  }

  /**
   * Get popular TV shows
   */
  async getPopularTv(): Promise<Media[]> {
    const response = await this.fetch<TMDBSearchResponse<TMDBTvResult>>(
      "/tv/popular"
    );
    return response.results.map((t) => this.mapTvResult(t));
  }

  /**
   * Validate API key by making a simple request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.fetch<{ status_message?: string }>("/configuration");
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Private helpers
  // ============================================

  private mapMovieResult(movie: TMDBMovieResult): Media {
    return {
      id: movie.id,
      mediaType: "movie",
      title: movie.title,
      titleOriginal: movie.original_title,
      year: movie.release_date ? parseInt(movie.release_date.slice(0, 4), 10) : undefined,
      score: movie.vote_average,
      posterPath: movie.poster_path ?? undefined,
      backdropPath: movie.backdrop_path ?? undefined,
      description: movie.overview ?? undefined,
      genres: movie.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean) as string[],
    };
  }

  private mapTvResult(tv: TMDBTvResult): Media {
    return {
      id: tv.id,
      mediaType: "tv",
      title: tv.name,
      titleOriginal: tv.original_name,
      year: tv.first_air_date ? parseInt(tv.first_air_date.slice(0, 4), 10) : undefined,
      score: tv.vote_average,
      posterPath: tv.poster_path ?? undefined,
      backdropPath: tv.backdrop_path ?? undefined,
      description: tv.overview ?? undefined,
      genres: tv.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean) as string[],
    };
  }
}

/**
 * Create a TMDB client instance
 */
export function createTMDBClient(apiKey: string): TMDBClient {
  return new TMDBClient(apiKey);
}

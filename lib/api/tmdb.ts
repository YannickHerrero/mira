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

export interface UpcomingRelease {
  media: Media;
  releaseDate: string;
  releaseType: "episode" | "movie";
  episodeInfo?: {
    seasonNumber: number;
    episodeNumber: number;
    episodeName: string;
  };
}

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

interface TMDBMovieDetails {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  vote_average?: number;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genres: { id: number; name: string }[];
  runtime?: number;
  status?: string;
}

interface TMDBEpisodeAirInfo {
  air_date: string;
  episode_number: number;
  season_number: number;
  name: string;
  overview?: string;
}

interface TMDBTvDetails {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  vote_average?: number;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  seasons: TMDBSeasonInfo[];
  status?: string;
  next_episode_to_air?: TMDBEpisodeAirInfo | null;
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
   * Get movie details by TMDB ID
   */
  async getMovieDetails(tmdbId: number): Promise<Media> {
    const details = await this.fetch<TMDBMovieDetails>(`/movie/${tmdbId}`);

    return {
      id: details.id,
      mediaType: "movie",
      title: details.title,
      titleOriginal: details.original_title,
      year: details.release_date
        ? parseInt(details.release_date.slice(0, 4), 10)
        : undefined,
      score: details.vote_average,
      posterPath: details.poster_path ?? undefined,
      backdropPath: details.backdrop_path ?? undefined,
      description: details.overview ?? undefined,
      genres: details.genres.map((g) => g.name),
    };
  }

  /**
   * Get TV show details by TMDB ID (includes full media info + seasons)
   */
  async getTvDetailsById(tmdbId: number): Promise<{
    media: Media;
    seasons: Season[];
  }> {
    const details = await this.fetch<TMDBTvDetails>(`/tv/${tmdbId}`);

    const media: Media = {
      id: details.id,
      mediaType: "tv",
      title: details.name,
      titleOriginal: details.original_name,
      year: details.first_air_date
        ? parseInt(details.first_air_date.slice(0, 4), 10)
        : undefined,
      score: details.vote_average,
      posterPath: details.poster_path ?? undefined,
      backdropPath: details.backdrop_path ?? undefined,
      description: details.overview ?? undefined,
      genres: details.genres.map((g) => g.name),
      seasonCount: details.number_of_seasons,
      episodeCount: details.number_of_episodes,
    };

    const seasons: Season[] = details.seasons
      .filter((s) => s.season_number > 0) // Filter out "Specials" (season 0)
      .map((s) => ({
        seasonNumber: s.season_number,
        episodeCount: s.episode_count,
        name: s.name,
        posterPath: s.poster_path ?? undefined,
        airDate: s.air_date ?? undefined,
      }));

    return { media, seasons };
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
   * Get similar movies for a given movie
   */
  async getSimilarMovies(tmdbId: number): Promise<Media[]> {
    const response = await this.fetch<TMDBSearchResponse<TMDBMovieResult>>(
      `/movie/${tmdbId}/similar`
    );
    return response.results.map((m) => this.mapMovieResult(m));
  }

  /**
   * Get similar TV shows for a given TV show
   */
  async getSimilarTv(tmdbId: number): Promise<Media[]> {
    const response = await this.fetch<TMDBSearchResponse<TMDBTvResult>>(
      `/tv/${tmdbId}/similar`
    );
    return response.results.map((t) => this.mapTvResult(t));
  }

  /**
   * Get similar content for any media type
   */
  async getSimilar(tmdbId: number, mediaType: MediaType): Promise<Media[]> {
    if (mediaType === "movie") {
      return this.getSimilarMovies(tmdbId);
    }
    return this.getSimilarTv(tmdbId);
  }

  /**
   * Get recommendations for a movie (collaborative filtering - higher quality than similar)
   */
  async getMovieRecommendations(tmdbId: number): Promise<Media[]> {
    const response = await this.fetch<TMDBSearchResponse<TMDBMovieResult>>(
      `/movie/${tmdbId}/recommendations`
    );
    return response.results.map((m) => this.mapMovieResult(m));
  }

  /**
   * Get recommendations for a TV show (collaborative filtering - higher quality than similar)
   */
  async getTvRecommendations(tmdbId: number): Promise<Media[]> {
    const response = await this.fetch<TMDBSearchResponse<TMDBTvResult>>(
      `/tv/${tmdbId}/recommendations`
    );
    return response.results.map((t) => this.mapTvResult(t));
  }

  /**
   * Get recommendations for any media type
   */
  async getRecommendations(tmdbId: number, mediaType: MediaType): Promise<Media[]> {
    if (mediaType === "movie") {
      return this.getMovieRecommendations(tmdbId);
    }
    return this.getTvRecommendations(tmdbId);
  }

  /**
   * Discover movies with filters (genres, year range, rating, etc.)
   */
  async discoverMovies(options: {
    genreIds?: number[];
    minRating?: number;
    minVoteCount?: number;
    yearGte?: number;
    yearLte?: number;
    sortBy?: "popularity.desc" | "vote_average.desc" | "primary_release_date.desc";
  } = {}): Promise<Media[]> {
    const params: Record<string, string> = {
      include_adult: "false",
      sort_by: options.sortBy || "popularity.desc",
    };

    if (options.genreIds?.length) {
      params.with_genres = options.genreIds.join("|"); // OR logic
    }
    if (options.minRating !== undefined) {
      params["vote_average.gte"] = options.minRating.toString();
    }
    if (options.minVoteCount !== undefined) {
      params["vote_count.gte"] = options.minVoteCount.toString();
    }
    if (options.yearGte !== undefined) {
      params["primary_release_date.gte"] = `${options.yearGte}-01-01`;
    }
    if (options.yearLte !== undefined) {
      params["primary_release_date.lte"] = `${options.yearLte}-12-31`;
    }

    const response = await this.fetch<TMDBSearchResponse<TMDBMovieResult>>(
      "/discover/movie",
      params
    );
    return response.results.map((m) => this.mapMovieResult(m));
  }

  /**
   * Discover TV shows with filters (genres, year range, rating, etc.)
   */
  async discoverTv(options: {
    genreIds?: number[];
    minRating?: number;
    minVoteCount?: number;
    yearGte?: number;
    yearLte?: number;
    sortBy?: "popularity.desc" | "vote_average.desc" | "first_air_date.desc";
  } = {}): Promise<Media[]> {
    const params: Record<string, string> = {
      include_adult: "false",
      sort_by: options.sortBy || "popularity.desc",
    };

    if (options.genreIds?.length) {
      params.with_genres = options.genreIds.join("|"); // OR logic
    }
    if (options.minRating !== undefined) {
      params["vote_average.gte"] = options.minRating.toString();
    }
    if (options.minVoteCount !== undefined) {
      params["vote_count.gte"] = options.minVoteCount.toString();
    }
    if (options.yearGte !== undefined) {
      params["first_air_date.gte"] = `${options.yearGte}-01-01`;
    }
    if (options.yearLte !== undefined) {
      params["first_air_date.lte"] = `${options.yearLte}-12-31`;
    }

    const response = await this.fetch<TMDBSearchResponse<TMDBTvResult>>(
      "/discover/tv",
      params
    );
    return response.results.map((t) => this.mapTvResult(t));
  }

   /**
    * Get TV show's next episode air date
    */
   async getTvUpcomingEpisode(tmdbId: number): Promise<UpcomingRelease | null> {
     try {
       const details = await this.fetch<TMDBTvDetails>(`/tv/${tmdbId}`);

       if (!details.next_episode_to_air) {
         return null;
       }

       const media: Media = {
         id: details.id,
         mediaType: "tv",
         title: details.name,
         titleOriginal: details.original_name,
         year: details.first_air_date
           ? parseInt(details.first_air_date.slice(0, 4), 10)
           : undefined,
         score: details.vote_average,
         posterPath: details.poster_path ?? undefined,
         backdropPath: details.backdrop_path ?? undefined,
         description: details.overview ?? undefined,
         genres: details.genres.map((g) => g.name),
         seasonCount: details.number_of_seasons,
         episodeCount: details.number_of_episodes,
       };

       return {
         media,
         releaseDate: details.next_episode_to_air.air_date,
         releaseType: "episode",
         episodeInfo: {
           seasonNumber: details.next_episode_to_air.season_number,
           episodeNumber: details.next_episode_to_air.episode_number,
           episodeName: details.next_episode_to_air.name,
         },
       };
     } catch (err) {
       console.error(`Failed to get TV upcoming episode for ${tmdbId}:`, err);
       return null;
     }
   }

   /**
    * Get movie release info
    */
   async getMovieReleaseInfo(tmdbId: number): Promise<UpcomingRelease | null> {
     try {
       const details = await this.fetch<TMDBMovieDetails>(`/movie/${tmdbId}`);

       if (!details.release_date) {
         return null;
       }

       const media: Media = {
         id: details.id,
         mediaType: "movie",
         title: details.title,
         titleOriginal: details.original_title,
         year: details.release_date
           ? parseInt(details.release_date.slice(0, 4), 10)
           : undefined,
         score: details.vote_average,
         posterPath: details.poster_path ?? undefined,
         backdropPath: details.backdrop_path ?? undefined,
         description: details.overview ?? undefined,
         genres: details.genres.map((g) => g.name),
       };

       return {
         media,
         releaseDate: details.release_date,
         releaseType: "movie",
       };
     } catch (err) {
       console.error(`Failed to get movie release info for ${tmdbId}:`, err);
       return null;
     }
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

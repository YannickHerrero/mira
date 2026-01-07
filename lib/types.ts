// Media types for TMDB integration

export type MediaType = "movie" | "tv";

export interface Media {
  id: number;
  mediaType: MediaType;
  title: string;
  titleOriginal?: string;
  imdbId?: string;
  year?: number;
  score?: number; // 0.0-10.0
  episodeCount?: number;
  seasonCount?: number;
  posterPath?: string;
  backdropPath?: string;
  description?: string;
  genres: string[];
}

export interface Season {
  seasonNumber: number;
  episodeCount: number;
  name?: string;
  posterPath?: string;
  airDate?: string;
}

export interface Episode {
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  overview?: string;
  airDate?: string;
  stillPath?: string;
  runtime?: number;
}

// Stream types for Torrentio integration

export interface Stream {
  provider: string;
  quality?: string; // "1080p", "2160p", "4K", etc.
  size?: string; // "1.2 GB"
  sizeBytes: number;
  seeders?: number;
  url?: string; // Direct playback URL (Real-Debrid)
  videoCodec?: string; // "HEVC", "AVC", "AV1", etc.
  audio?: string; // "DTS-HD MA 7.1", "Atmos", etc.
  hdr?: string; // "HDR", "DV", "HDR10+", etc.
  sourceType?: string; // "BluRay", "WEB-DL", "REMUX", etc.
  languages: string[];
  isCached: boolean;
  title: string; // Raw title from torrent
}

// Config types

export interface TorrentioConfig {
  providers: string[];
  qualityFilter: string[];
  sortBy: "qualitysize" | "quality" | "size";
}

export const DEFAULT_TORRENTIO_CONFIG: TorrentioConfig = {
  providers: [
    "yts",
    "eztv",
    "rarbg",
    "1337x",
    "thepiratebay",
    "kickasstorrents",
    "torrentgalaxy",
    "nyaasi",
  ],
  qualityFilter: ["scr", "cam"],
  sortBy: "qualitysize",
};

// TMDB genre ID to name mapping
export const GENRE_MAP: Record<number, string> = {
  // Movie genres
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  // TV genres
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

// TMDB image base URLs
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
export const TMDB_POSTER_SIZES = {
  small: "w185",
  medium: "w342",
  large: "w500",
  original: "original",
} as const;

export const TMDB_BACKDROP_SIZES = {
  small: "w300",
  medium: "w780",
  large: "w1280",
  original: "original",
} as const;

export function getPosterUrl(
  path: string | null | undefined,
  size: keyof typeof TMDB_POSTER_SIZES = "medium"
): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE}/${TMDB_POSTER_SIZES[size]}${path}`;
}

export function getBackdropUrl(
  path: string | null | undefined,
  size: keyof typeof TMDB_BACKDROP_SIZES = "medium"
): string | undefined {
  if (!path) return undefined;
  return `${TMDB_IMAGE_BASE}/${TMDB_BACKDROP_SIZES[size]}${path}`;
}

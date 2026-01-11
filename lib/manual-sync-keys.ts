import type { MediaType } from "@/lib/types";

export function favoriteKey(tmdbId: number, mediaType: MediaType) {
  return `${tmdbId}:${mediaType}`;
}

export function progressKey(
  tmdbId: number,
  mediaType: MediaType,
  seasonNumber?: number | null,
  episodeNumber?: number | null
) {
  return `${tmdbId}:${mediaType}:${seasonNumber ?? ""}:${episodeNumber ?? ""}`;
}

export function listItemKey(
  listId: string,
  tmdbId: number,
  mediaType: MediaType
) {
  return `${listId}:${tmdbId}:${mediaType}`;
}

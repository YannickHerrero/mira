import type { MediaType } from "@/lib/types";
import { getItem, setItem } from "@/lib/storage";

const MAPPINGS_KEY = "anilist_mappings";
const QUEUE_KEY = "anilist_sync_queue";
const CLIENT_ID_KEY = "anilist_client_id";

export interface AniListMapping {
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber: number | null;
  anilistId: number;
  title: string;
  format: string | null;
  year: number | null;
}

export interface AniListSyncQueueItem {
  key: string;
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber: number | null;
  episodeNumber: number | null;
  anilistId: number;
  progress: number;
  status: "CURRENT" | "COMPLETED";
  queuedAt: string;
}

export function buildAniListMappingKey(
  tmdbId: number,
  mediaType: MediaType,
  seasonNumber?: number | null
) {
  return `${tmdbId}:${mediaType}:${seasonNumber ?? ""}`;
}

export function buildAniListQueueKey(
  tmdbId: number,
  mediaType: MediaType,
  seasonNumber?: number | null,
  episodeNumber?: number | null
) {
  return `${tmdbId}:${mediaType}:${seasonNumber ?? ""}:${episodeNumber ?? ""}`;
}

export function getAniListMappings(): Record<string, AniListMapping> {
  return getItem<Record<string, AniListMapping>>(MAPPINGS_KEY) ?? {};
}

export function setAniListMappings(mappings: Record<string, AniListMapping>) {
  setItem(MAPPINGS_KEY, mappings);
}

export function getAniListSyncQueue(): AniListSyncQueueItem[] {
  return getItem<AniListSyncQueueItem[]>(QUEUE_KEY) ?? [];
}

export function setAniListSyncQueue(queue: AniListSyncQueueItem[]) {
  setItem(QUEUE_KEY, queue);
}

export function getAniListClientId(): string | null {
  return getItem<string>(CLIENT_ID_KEY);
}

export function setAniListClientId(clientId: string) {
  setItem(CLIENT_ID_KEY, clientId);
}

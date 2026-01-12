import {
  type AniListSyncQueueItem,
  buildAniListMappingKey,
  buildAniListQueueKey,
  getAniListMappings,
  getAniListSyncQueue,
  setAniListSyncQueue,
} from "@/lib/anilist-storage";
import { createAniListClient } from "@/lib/api/anilist";
import { getAniListAccessToken } from "@/lib/secure-storage";
import type { MediaType } from "@/lib/types";
import { useSettingsStore } from "@/stores/settings";

let isProcessingQueue = false;

function getSettingsSnapshot() {
  const settings = useSettingsStore.getState();
  if (settings.isLoading) {
    settings.loadSettings();
  }
  return settings;
}

export async function enqueueAniListSync({
  tmdbId,
  mediaType,
  seasonNumber,
  episodeNumber,
}: {
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}) {
  const settings = getSettingsSnapshot();
  if (!settings.enableAnilistSync) return;

  const mappingKey = buildAniListMappingKey(tmdbId, mediaType, seasonNumber ?? null);
  const mappings = getAniListMappings();
  const mapping = mappings[mappingKey];

  if (!mapping) return;

  const progress = mediaType === "movie" ? 1 : episodeNumber ?? 0;
  if (!progress) return;

  const queueKey = buildAniListQueueKey(tmdbId, mediaType, seasonNumber ?? null, episodeNumber ?? null);
  const queue = getAniListSyncQueue();
  const existingIndex = queue.findIndex((item) => item.key === queueKey);
  const payload: AniListSyncQueueItem = {
    key: queueKey,
    tmdbId,
    mediaType,
    seasonNumber: seasonNumber ?? null,
    episodeNumber: episodeNumber ?? null,
    anilistId: mapping.anilistId,
    progress,
    status: mediaType === "movie" ? "COMPLETED" : "CURRENT",
    queuedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = payload;
  } else {
    queue.push(payload);
  }

  setAniListSyncQueue(queue);

  await processAniListSyncQueue();
}

export async function processAniListSyncQueue() {
  if (isProcessingQueue) return;

  const settings = getSettingsSnapshot();
  if (!settings.enableAnilistSync) return;

  const accessToken = await getAniListAccessToken();
  if (!accessToken) return;

  const queue = getAniListSyncQueue();
  if (queue.length === 0) return;

  isProcessingQueue = true;

  try {
    const client = createAniListClient(accessToken);
    const remaining: AniListSyncQueueItem[] = [];

    for (const item of queue) {
      try {
        const currentProgress = await client.getProgress(item.anilistId);
        if (currentProgress >= item.progress) {
          continue;
        }

        await client.saveProgress({
          mediaId: item.anilistId,
          progress: item.progress,
          status: item.status,
        });
      } catch (error) {
        console.warn("[AniListSync] Failed to sync item", item, error);
        remaining.push(item);
      }
    }

    setAniListSyncQueue(remaining);
  } finally {
    isProcessingQueue = false;
  }
}

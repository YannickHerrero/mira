import * as React from "react";
import { eq } from "drizzle-orm";
import { useDatabase } from "@/db/provider";
import { downloadsTable } from "@/db/schema";
import {
  useDownloadsStore,
  type DownloadItem,
  type StartDownloadParams,
  formatBytes,
} from "@/stores/downloads";
import { isDownloadSupported } from "@/lib/download-manager";
import { useSyncPush } from "@/lib/convex/sync-context";
import type { MediaType, Stream } from "@/lib/types";

/**
 * Hook to access download functionality
 */
export function useDownloads() {
  const { db } = useDatabase();
  const store = useDownloadsStore();
  const sync = useSyncPush();

  // Initialize store with database functions
  React.useEffect(() => {
    if (!db || store.isInitialized) return;

    const loadFromDb = async (): Promise<DownloadItem[]> => {
      const rows = await db.select().from(downloadsTable);
      return rows.map((row) => ({
        id: row.id,
        tmdbId: row.tmdbId,
        mediaType: row.mediaType as MediaType,
        seasonNumber: row.seasonNumber ?? undefined,
        episodeNumber: row.episodeNumber ?? undefined,
        title: row.title,
        posterPath: row.posterPath ?? undefined,
        fileName: row.fileName,
        filePath: row.filePath,
        fileSize: row.fileSize ?? undefined,
        quality: row.quality ?? undefined,
        status: row.status as DownloadItem["status"],
        progress: row.progress ?? 0,
        streamUrl: row.streamUrl,
        infoHash: row.infoHash ?? undefined,
        duration: row.duration ?? undefined,
        addedAt: row.addedAt ?? new Date().toISOString(),
        completedAt: row.completedAt ?? undefined,
      }));
    };

    const saveToDb = async (download: DownloadItem): Promise<void> => {
      await db.insert(downloadsTable).values({
        id: download.id,
        tmdbId: download.tmdbId,
        mediaType: download.mediaType,
        seasonNumber: download.seasonNumber,
        episodeNumber: download.episodeNumber,
        title: download.title,
        posterPath: download.posterPath,
        fileName: download.fileName,
        filePath: download.filePath,
        fileSize: download.fileSize,
        quality: download.quality,
        status: download.status,
        progress: download.progress,
        streamUrl: download.streamUrl,
        infoHash: download.infoHash,
        duration: download.duration,
        addedAt: download.addedAt,
        completedAt: download.completedAt,
      });

      sync.pushDownloadMeta({
        localId: download.id,
        tmdbId: download.tmdbId,
        mediaType: download.mediaType,
        seasonNumber: download.seasonNumber,
        episodeNumber: download.episodeNumber,
        title: download.title,
        posterPath: download.posterPath,
        fileName: download.fileName,
        fileSize: download.fileSize,
        quality: download.quality,
        status: download.status,
        streamUrl: download.streamUrl,
        infoHash: download.infoHash,
        duration: download.duration,
        addedAt: download.addedAt,
        completedAt: download.completedAt,
        updatedAt: new Date().toISOString(),
      });
    };

    const updateInDb = async (
      id: string,
      updates: Partial<DownloadItem>
    ): Promise<void> => {
      await db
        .update(downloadsTable)
        .set(updates)
        .where(eq(downloadsTable.id, id));

      // Only sync status changes, not progress updates (too frequent)
      if (updates.status || updates.completedAt) {
        const row = await db
          .select()
          .from(downloadsTable)
          .where(eq(downloadsTable.id, id))
          .limit(1);
        if (row[0]) {
          sync.pushDownloadMeta({
            localId: row[0].id,
            tmdbId: row[0].tmdbId,
            mediaType: row[0].mediaType,
            seasonNumber: row[0].seasonNumber,
            episodeNumber: row[0].episodeNumber,
            title: row[0].title,
            posterPath: row[0].posterPath,
            fileName: row[0].fileName,
            fileSize: row[0].fileSize,
            quality: row[0].quality,
            status: row[0].status,
            streamUrl: row[0].streamUrl,
            infoHash: row[0].infoHash,
            duration: row[0].duration,
            addedAt: row[0].addedAt,
            completedAt: row[0].completedAt,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    };

    const deleteFromDb = async (id: string): Promise<void> => {
      await db.delete(downloadsTable).where(eq(downloadsTable.id, id));

      sync.pushDownloadMetaDeletion({
        localId: id,
        deletedAt: new Date().toISOString(),
      });
    };

    store.initialize(loadFromDb, saveToDb, updateInDb, deleteFromDb);
  }, [db, store.isInitialized, store.initialize, sync]);

  const startDownload = React.useCallback(
    async (params: StartDownloadParams): Promise<string> => {
      if (!isDownloadSupported()) {
        throw new Error("Downloads are not supported on this platform");
      }
      return store.startDownload(params);
    },
    [store.startDownload]
  );

  return {
    // State
    downloads: store.downloads,
    isInitialized: store.isInitialized,
    activeDownload: store.getActiveDownload(),
    completedDownloads: store.getCompletedDownloads(),

    // Actions
    startDownload,
    cancelDownload: store.cancelDownload,
    deleteDownload: store.deleteDownload,

    // Queries
    getDownloadForMedia: store.getDownloadForMedia,

    // Utils
    isDownloadSupported: isDownloadSupported(),
    formatBytes,
  };
}

/**
 * Hook to check download status for a specific media item
 */
export function useDownloadStatus(
  tmdbId: number,
  seasonNumber?: number,
  episodeNumber?: number
) {
  const { getDownloadForMedia, isDownloadSupported } = useDownloads();

  const download = React.useMemo(
    () => getDownloadForMedia(tmdbId, seasonNumber, episodeNumber),
    [getDownloadForMedia, tmdbId, seasonNumber, episodeNumber]
  );

  return {
    download,
    isDownloaded: download?.status === "completed",
    isDownloading:
      download?.status === "downloading" ||
      download?.status === "caching",
    isFailed: download?.status === "failed",
    progress: download?.progress ?? 0,
    canDownload: isDownloadSupported && !download,
  };
}

/**
 * Hook to get all downloads for library display
 */
export function useDownloadsList() {
  const { downloads, isInitialized, deleteDownload, formatBytes } = useDownloads();

  const items = React.useMemo(() => {
    return downloads.filter((d) => d.status === "completed");
  }, [downloads]);

  return {
    items,
    isLoading: !isInitialized,
    deleteDownload,
    formatBytes,
  };
}

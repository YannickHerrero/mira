import { create } from "zustand";
import { createId } from "@paralleldrive/cuid2";
import {
  startDownload,
  cancelDownload,
  deleteDownloadFile,
  generateFileName,
  formatBytes,
  type DownloadProgress,
  type DownloadStatus,
} from "@/lib/download-manager";
import type { MediaType, Stream } from "@/lib/types";

export interface DownloadItem {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  title: string;
  posterPath?: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  quality?: string;
  status: DownloadStatus;
  progress: number;
  streamUrl: string;
  addedAt: string;
  completedAt?: string;
}

export interface StartDownloadParams {
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  title: string;
  posterPath?: string;
  stream: Stream;
}

interface DownloadsState {
  // State
  downloads: DownloadItem[];
  isInitialized: boolean;

  // Queue management
  downloadQueue: string[]; // IDs of pending downloads
  activeDownloadId: string | null;

  // Actions
  initialize: (
    loadFromDb: () => Promise<DownloadItem[]>,
    saveToDb: (download: DownloadItem) => Promise<void>,
    updateInDb: (id: string, updates: Partial<DownloadItem>) => Promise<void>,
    deleteFromDb: (id: string) => Promise<void>
  ) => Promise<void>;

  queueDownload: (params: StartDownloadParams) => Promise<string>;
  cancelDownload: (id: string) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;

  // Internal
  processQueue: () => Promise<void>;
  updateProgress: (id: string, progress: number) => void;

  // Queries
  getDownloadForMedia: (
    tmdbId: number,
    seasonNumber?: number,
    episodeNumber?: number
  ) => DownloadItem | undefined;
  getActiveDownload: () => DownloadItem | undefined;
  getCompletedDownloads: () => DownloadItem[];
  getPendingDownloads: () => DownloadItem[];
}

// Store database functions for persistence
let dbFunctions: {
  saveToDb: (download: DownloadItem) => Promise<void>;
  updateInDb: (id: string, updates: Partial<DownloadItem>) => Promise<void>;
  deleteFromDb: (id: string) => Promise<void>;
} | null = null;

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  downloads: [],
  isInitialized: false,
  downloadQueue: [],
  activeDownloadId: null,

  initialize: async (loadFromDb, saveToDb, updateInDb, deleteFromDb) => {
    if (get().isInitialized) return;

    // Store db functions for later use
    dbFunctions = { saveToDb, updateInDb, deleteFromDb };

    try {
      const downloads = await loadFromDb();

      // Find any downloads that were interrupted (downloading status)
      const interruptedDownloads = downloads.filter(
        (d) => d.status === "downloading" || d.status === "pending"
      );

      // Reset interrupted downloads to pending
      for (const download of interruptedDownloads) {
        await updateInDb(download.id, {
          status: "pending",
          progress: 0,
        });
      }

      // Update local state with corrected statuses
      const correctedDownloads = downloads.map((d) =>
        d.status === "downloading"
          ? { ...d, status: "pending" as DownloadStatus, progress: 0 }
          : d
      );

      // Build queue from pending downloads
      const queue = correctedDownloads
        .filter((d) => d.status === "pending")
        .map((d) => d.id);

      set({
        downloads: correctedDownloads,
        isInitialized: true,
        downloadQueue: queue,
      });

      // Start processing queue if there are pending downloads
      if (queue.length > 0) {
        get().processQueue();
      }
    } catch (error) {
      console.error("Failed to initialize downloads store:", error);
      set({ isInitialized: true });
    }
  },

  queueDownload: async (params) => {
    const { tmdbId, mediaType, seasonNumber, episodeNumber, title, posterPath, stream } =
      params;

    if (!stream.url) {
      throw new Error("Stream URL is required for download");
    }

    // Check if already downloaded or downloading
    const existing = get().getDownloadForMedia(
      tmdbId,
      seasonNumber,
      episodeNumber
    );
    if (existing) {
      if (existing.status === "completed") {
        throw new Error("This content is already downloaded");
      }
      if (
        existing.status === "downloading" ||
        existing.status === "pending"
      ) {
        throw new Error("This content is already in the download queue");
      }
    }

    const id = createId();
    const fileName = generateFileName(title, stream.quality);
    const now = new Date().toISOString();

    const downloadItem: DownloadItem = {
      id,
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      title,
      posterPath,
      fileName,
      filePath: "", // Will be set when download starts
      fileSize: stream.sizeBytes,
      quality: stream.quality,
      status: "pending",
      progress: 0,
      streamUrl: stream.url,
      addedAt: now,
    };

    // Save to database
    if (dbFunctions) {
      await dbFunctions.saveToDb(downloadItem);
    }

    // Add to state and queue
    set((state) => ({
      downloads: [...state.downloads, downloadItem],
      downloadQueue: [...state.downloadQueue, id],
    }));

    // Start processing queue
    get().processQueue();

    return id;
  },

  processQueue: async () => {
    const state = get();

    // If already processing or queue is empty, return
    if (state.activeDownloadId || state.downloadQueue.length === 0) {
      return;
    }

    // Get next download from queue
    const nextId = state.downloadQueue[0];
    const download = state.downloads.find((d) => d.id === nextId);

    if (!download) {
      // Remove invalid ID from queue and continue
      set((s) => ({
        downloadQueue: s.downloadQueue.slice(1),
      }));
      get().processQueue();
      return;
    }

    // Start downloading
    set((s) => ({
      activeDownloadId: nextId,
      downloads: s.downloads.map((d) =>
        d.id === nextId ? { ...d, status: "downloading" as DownloadStatus } : d
      ),
    }));

    if (dbFunctions) {
      await dbFunctions.updateInDb(nextId, { status: "downloading" });
    }

    try {
      const result = await startDownload(
        download.id,
        download.streamUrl,
        download.fileName,
        (progress: DownloadProgress) => {
          get().updateProgress(download.id, progress.progress);
        }
      );

      // Download completed
      const completedAt = new Date().toISOString();
      const updates = {
        status: "completed" as DownloadStatus,
        progress: 100,
        filePath: result.filePath,
        fileSize: result.fileSize,
        completedAt,
      };

      set((s) => ({
        activeDownloadId: null,
        downloadQueue: s.downloadQueue.slice(1),
        downloads: s.downloads.map((d) =>
          d.id === nextId ? { ...d, ...updates } : d
        ),
      }));

      if (dbFunctions) {
        await dbFunctions.updateInDb(nextId, updates);
      }

      // Process next in queue
      get().processQueue();
    } catch (error) {
      console.error("Download failed:", error);

      const updates = {
        status: "failed" as DownloadStatus,
      };

      set((s) => ({
        activeDownloadId: null,
        downloadQueue: s.downloadQueue.slice(1),
        downloads: s.downloads.map((d) =>
          d.id === nextId ? { ...d, ...updates } : d
        ),
      }));

      if (dbFunctions) {
        await dbFunctions.updateInDb(nextId, updates);
      }

      // Process next in queue
      get().processQueue();
    }
  },

  updateProgress: (id, progress) => {
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === id ? { ...d, progress } : d
      ),
    }));
  },

  cancelDownload: async (id) => {
    const download = get().downloads.find((d) => d.id === id);
    if (!download) return;

    // Cancel if currently downloading
    if (download.status === "downloading") {
      await cancelDownload(id);
    }

    // Remove from queue and delete record
    set((s) => ({
      activeDownloadId: s.activeDownloadId === id ? null : s.activeDownloadId,
      downloadQueue: s.downloadQueue.filter((qId) => qId !== id),
      downloads: s.downloads.filter((d) => d.id !== id),
    }));

    if (dbFunctions) {
      await dbFunctions.deleteFromDb(id);
    }

    // Continue processing queue
    if (get().activeDownloadId === null) {
      get().processQueue();
    }
  },

  deleteDownload: async (id) => {
    const download = get().downloads.find((d) => d.id === id);
    if (!download) return;

    // Delete file if exists
    if (download.filePath) {
      try {
        await deleteDownloadFile(download.filePath);
      } catch (error) {
        console.error("Failed to delete file:", error);
      }
    }

    // Remove from state
    set((s) => ({
      downloads: s.downloads.filter((d) => d.id !== id),
    }));

    if (dbFunctions) {
      await dbFunctions.deleteFromDb(id);
    }
  },

  retryDownload: async (id) => {
    const download = get().downloads.find((d) => d.id === id);
    if (!download || download.status !== "failed") return;

    // Reset status and add to queue
    const updates = {
      status: "pending" as DownloadStatus,
      progress: 0,
    };

    set((s) => ({
      downloads: s.downloads.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
      downloadQueue: [...s.downloadQueue, id],
    }));

    if (dbFunctions) {
      await dbFunctions.updateInDb(id, updates);
    }

    // Start processing
    get().processQueue();
  },

  getDownloadForMedia: (tmdbId, seasonNumber, episodeNumber) => {
    return get().downloads.find(
      (d) =>
        d.tmdbId === tmdbId &&
        d.seasonNumber === seasonNumber &&
        d.episodeNumber === episodeNumber
    );
  },

  getActiveDownload: () => {
    const activeId = get().activeDownloadId;
    if (!activeId) return undefined;
    return get().downloads.find((d) => d.id === activeId);
  },

  getCompletedDownloads: () => {
    return get().downloads.filter((d) => d.status === "completed");
  },

  getPendingDownloads: () => {
    return get().downloads.filter(
      (d) => d.status === "pending" || d.status === "downloading"
    );
  },
}));

// Re-export formatBytes for convenience
export { formatBytes };

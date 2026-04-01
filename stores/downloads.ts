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
import { createRealDebridClient, UnplayableFileError } from "@/lib/api/realdebrid";
import type { MediaType, Stream } from "@/lib/types";
import { useApiKeyStore } from "@/stores/api-keys";

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
  infoHash?: string;
  addedAt: string;
  completedAt?: string;
  /** Reason for failure (e.g., "iso" for disc image, "archive" for archive files) */
  failureReason?: string;
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
  activeDownloadId: string | null;

  // Actions
  initialize: (
    loadFromDb: () => Promise<DownloadItem[]>,
    saveToDb: (download: DownloadItem) => Promise<void>,
    updateInDb: (id: string, updates: Partial<DownloadItem>) => Promise<void>,
    deleteFromDb: (id: string) => Promise<void>
  ) => Promise<void>;

  startDownload: (params: StartDownloadParams) => Promise<string>;
  cancelDownload: (id: string) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;

  // Internal
  updateProgress: (id: string, progress: number) => void;

  // Queries
  getDownloadForMedia: (
    tmdbId: number,
    seasonNumber?: number,
    episodeNumber?: number
  ) => DownloadItem | undefined;
  getActiveDownload: () => DownloadItem | undefined;
  getCompletedDownloads: () => DownloadItem[];
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
  activeDownloadId: null,

  initialize: async (loadFromDb, saveToDb, updateInDb, deleteFromDb) => {
    if (get().isInitialized) return;

    // Store db functions for later use
    dbFunctions = { saveToDb, updateInDb, deleteFromDb };

    try {
      const downloads = await loadFromDb();

      // Reset any interrupted downloads to failed
      const interruptedDownloads = downloads.filter(
        (d) => d.status === "downloading" || d.status === "pending" || d.status === "caching"
      );

      for (const download of interruptedDownloads) {
        await updateInDb(download.id, {
          status: "failed",
          progress: 0,
        });
      }

      const correctedDownloads = downloads.map((d) =>
        d.status === "downloading" || d.status === "caching" || d.status === "pending"
          ? { ...d, status: "failed" as DownloadStatus, progress: 0 }
          : d
      );

      set({
        downloads: correctedDownloads,
        isInitialized: true,
      });
    } catch (error) {
      console.error("Failed to initialize downloads store:", error);
      set({ isInitialized: true });
    }
  },

  startDownload: async (params) => {
    const { tmdbId, mediaType, seasonNumber, episodeNumber, title, posterPath, stream } =
      params;

    if (!stream.url && !stream.infoHash) {
      throw new Error("Stream URL or info hash is required for download");
    }

    // Block if a download is already active
    if (get().activeDownloadId) {
      throw new Error("A download is already in progress");
    }

    // Check if already downloaded
    const existing = get().getDownloadForMedia(tmdbId, seasonNumber, episodeNumber);
    if (existing) {
      if (existing.status === "completed") {
        throw new Error("This content is already downloaded");
      }
      if (existing.status === "downloading" || existing.status === "caching") {
        throw new Error("This content is already downloading");
      }
    }

    const id = createId();
    const fileName = generateFileName(title, stream.quality);
    const now = new Date().toISOString();
    const needsCaching = !stream.url;
    const initialStatus: DownloadStatus = needsCaching ? "caching" : "downloading";

    const downloadItem: DownloadItem = {
      id,
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
      title,
      posterPath,
      fileName,
      filePath: "",
      fileSize: stream.sizeBytes,
      quality: stream.quality,
      status: initialStatus,
      progress: 0,
      streamUrl: stream.url ?? "",
      infoHash: stream.infoHash,
      addedAt: now,
    };

    // Save to database
    if (dbFunctions) {
      await dbFunctions.saveToDb(downloadItem);
    }

    // Add to state and set as active
    set((state) => ({
      downloads: [...state.downloads, downloadItem],
      activeDownloadId: id,
    }));

    // Resolve stream URL if needed (Real-Debrid caching)
    let streamUrl = stream.url ?? "";

    if (needsCaching) {
      try {
        const apiKey = useApiKeyStore.getState().realDebridApiKey;
        if (!apiKey || !stream.infoHash) {
          throw new Error("Real-Debrid cache unavailable");
        }
        const client = createRealDebridClient(apiKey);
        streamUrl = await client.resolveInfoHashToStreamUrl(stream.infoHash, title);

        const cacheUpdates = {
          streamUrl,
          status: "downloading" as DownloadStatus,
        };

        set((s) => ({
          downloads: s.downloads.map((d) =>
            d.id === id ? { ...d, ...cacheUpdates } : d
          ),
        }));

        if (dbFunctions) {
          await dbFunctions.updateInDb(id, cacheUpdates);
        }
      } catch (error) {
        console.error("Download cache failed:", error);

        const isUnplayable = error instanceof UnplayableFileError;
        const updates: Partial<DownloadItem> = {
          status: isUnplayable ? "unplayable" as DownloadStatus : "failed" as DownloadStatus,
          failureReason: isUnplayable ? (error as UnplayableFileError).extension : undefined,
        };

        set((s) => ({
          activeDownloadId: null,
          downloads: s.downloads.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        }));

        if (dbFunctions) {
          await dbFunctions.updateInDb(id, updates);
        }

        return id;
      }
    }

    // Start the actual file download
    try {
      const result = await startDownload(
        id,
        streamUrl,
        fileName,
        (progress: DownloadProgress) => {
          get().updateProgress(id, progress.progress);
        }
      );

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
        downloads: s.downloads.map((d) =>
          d.id === id ? { ...d, ...updates } : d
        ),
      }));

      if (dbFunctions) {
        await dbFunctions.updateInDb(id, updates);
      }
    } catch (error) {
      console.error("Download failed:", error);

      const updates = {
        status: "failed" as DownloadStatus,
      };

      set((s) => ({
        activeDownloadId: null,
        downloads: s.downloads.map((d) =>
          d.id === id ? { ...d, ...updates } : d
        ),
      }));

      if (dbFunctions) {
        await dbFunctions.updateInDb(id, updates);
      }
    }

    return id;
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

    if (download.status === "downloading") {
      await cancelDownload(id);
    }

    set((s) => ({
      activeDownloadId: s.activeDownloadId === id ? null : s.activeDownloadId,
      downloads: s.downloads.filter((d) => d.id !== id),
    }));

    if (dbFunctions) {
      await dbFunctions.deleteFromDb(id);
    }
  },

  deleteDownload: async (id) => {
    const download = get().downloads.find((d) => d.id === id);
    if (!download) return;

    if (download.filePath) {
      try {
        await deleteDownloadFile(download.filePath);
      } catch (error) {
        console.error("Failed to delete file:", error);
      }
    }

    set((s) => ({
      downloads: s.downloads.filter((d) => d.id !== id),
    }));

    if (dbFunctions) {
      await dbFunctions.deleteFromDb(id);
    }
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
}));

// Re-export formatBytes for convenience
export { formatBytes };

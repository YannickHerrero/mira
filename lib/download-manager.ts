import { File, Directory, Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

export type DownloadStatus =
  | "pending"
  | "caching"
  | "downloading"
  | "completed"
  | "failed"
  | "paused";

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  progress: number; // 0-100
}

export type ProgressCallback = (progress: DownloadProgress) => void;

// Store for active download resumables
const activeDownloads = new Map<
  string,
  LegacyFileSystem.DownloadResumable
>();

// Store for progress callbacks
const progressCallbacks = new Map<string, ProgressCallback>();

/**
 * Get the downloads directory
 */
export function getDownloadsDirectory(): Directory {
  return new Directory(Paths.document, "downloads");
}

/**
 * Ensure the downloads directory exists
 */
export async function ensureDownloadsDirectory(): Promise<void> {
  const dir = getDownloadsDirectory();
  if (!dir.exists) {
    await dir.create();
  }
}

/**
 * Generate a safe filename from a title
 */
export function generateFileName(
  title: string,
  quality?: string,
  extension = "mp4"
): string {
  // Remove or replace unsafe characters
  const safeName = title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100); // Limit length

  const qualitySuffix = quality ? `_${quality}` : "";
  const timestamp = Date.now();

  return `${safeName}${qualitySuffix}_${timestamp}.${extension}`;
}

/**
 * Get full file path for a download
 */
export function getFilePath(fileName: string): string {
  const dir = getDownloadsDirectory();
  return `${dir.uri}${fileName}`;
}

/**
 * Start a new download
 */
export async function startDownload(
  downloadId: string,
  url: string,
  fileName: string,
  onProgress?: ProgressCallback
): Promise<{ filePath: string; fileSize: number }> {
  if (Platform.OS === "web") {
    throw new Error("Downloads are not supported on web");
  }

  await ensureDownloadsDirectory();

  const filePath = getFilePath(fileName);

  // Store progress callback
  if (onProgress) {
    progressCallbacks.set(downloadId, onProgress);
  }

  const downloadResumable = LegacyFileSystem.createDownloadResumable(
    url,
    filePath,
    {},
    (downloadProgress: LegacyFileSystem.DownloadProgressData) => {
      const progress =
        (downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite) *
        100;

      const callback = progressCallbacks.get(downloadId);
      if (callback) {
        callback({
          totalBytesWritten: downloadProgress.totalBytesWritten,
          totalBytesExpectedToWrite:
            downloadProgress.totalBytesExpectedToWrite,
          progress,
        });
      }
    }
  );

  // Store the resumable for potential pause/resume
  activeDownloads.set(downloadId, downloadResumable);

  try {
    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error("Download failed - no result returned");
    }

    // Clean up
    activeDownloads.delete(downloadId);
    progressCallbacks.delete(downloadId);

    // Get file size using new API
    const file = new File(result.uri);
    const fileSize = file.exists && file.size ? file.size : 0;

    return {
      filePath: result.uri,
      fileSize,
    };
  } catch (error) {
    // Clean up on error
    activeDownloads.delete(downloadId);
    progressCallbacks.delete(downloadId);
    throw error;
  }
}

/**
 * Pause an active download
 */
export async function pauseDownload(
  downloadId: string
): Promise<string | null> {
  const resumable = activeDownloads.get(downloadId);
  if (!resumable) {
    return null;
  }

  try {
    const pauseResult = await resumable.pauseAsync();
    // Return the savable data for resuming later
    return JSON.stringify(pauseResult);
  } catch (error) {
    console.error("Failed to pause download:", error);
    return null;
  }
}

/**
 * Resume a paused download
 */
export async function resumeDownload(
  downloadId: string,
  savedData: string,
  onProgress?: ProgressCallback
): Promise<{ filePath: string; fileSize: number }> {
  if (Platform.OS === "web") {
    throw new Error("Downloads are not supported on web");
  }

  // Store progress callback
  if (onProgress) {
    progressCallbacks.set(downloadId, onProgress);
  }

  const pauseData = JSON.parse(savedData);

  const downloadResumable = LegacyFileSystem.createDownloadResumable(
    pauseData.url,
    pauseData.fileUri,
    pauseData.options || {},
    (downloadProgress: LegacyFileSystem.DownloadProgressData) => {
      const progress =
        (downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite) *
        100;

      const callback = progressCallbacks.get(downloadId);
      if (callback) {
        callback({
          totalBytesWritten: downloadProgress.totalBytesWritten,
          totalBytesExpectedToWrite:
            downloadProgress.totalBytesExpectedToWrite,
          progress,
        });
      }
    },
    pauseData.resumeData
  );

  activeDownloads.set(downloadId, downloadResumable);

  try {
    const result = await downloadResumable.resumeAsync();

    if (!result) {
      throw new Error("Resume failed - no result returned");
    }

    // Clean up
    activeDownloads.delete(downloadId);
    progressCallbacks.delete(downloadId);

    // Get file size using new API
    const file = new File(result.uri);
    const fileSize = file.exists && file.size ? file.size : 0;

    return {
      filePath: result.uri,
      fileSize,
    };
  } catch (error) {
    activeDownloads.delete(downloadId);
    progressCallbacks.delete(downloadId);
    throw error;
  }
}

/**
 * Cancel an active download
 */
export async function cancelDownload(downloadId: string): Promise<void> {
  const resumable = activeDownloads.get(downloadId);
  if (resumable) {
    try {
      await resumable.pauseAsync();
    } catch {
      // Ignore errors when canceling
    }
  }

  activeDownloads.delete(downloadId);
  progressCallbacks.delete(downloadId);
}

/**
 * Delete a downloaded file
 */
export async function deleteDownloadFile(filePath: string): Promise<void> {
  try {
    const file = new File(filePath);
    if (file.exists) {
      await file.delete();
    }
  } catch (error) {
    console.error("Failed to delete file:", error);
    throw error;
  }
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    const file = new File(filePath);
    return file.exists;
  } catch {
    return false;
  }
}

/**
 * Get file info
 */
export function getFileInfo(filePath: string): { exists: boolean; size?: number } {
  try {
    const file = new File(filePath);
    if (file.exists) {
      return { exists: true, size: file.size ?? undefined };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Check if download feature is available on current platform
 */
export function isDownloadSupported(): boolean {
  return Platform.OS !== "web";
}

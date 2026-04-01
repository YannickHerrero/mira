import { File, Directory, Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Platform, NativeModules } from "react-native";

export type DownloadStatus =
  | "pending"
  | "caching"
  | "downloading"
  | "completed"
  | "failed"
  | "unplayable";

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  progress: number; // 0-100
}

export type ProgressCallback = (progress: DownloadProgress) => void;

// Store for active download resumable
let activeDownload: {
  id: string;
  resumable: LegacyFileSystem.DownloadResumable;
} | null = null;

// Store for progress callback
let activeProgressCallback: ProgressCallback | null = null;

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
  const safeName = title
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);

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

interface DownloadsCopyModule {
  copyToDownloads(
    sourcePath: string,
    fileName: string,
    mimeType: string,
    deleteSource: boolean
  ): Promise<string>;
}

const MiraDownloadsCopy: DownloadsCopyModule | undefined =
  Platform.OS === "android" ? NativeModules.MiraDownloadsCopy : undefined;

/**
 * Copy a downloaded file to Android's public Downloads folder using MediaStore.
 * Uses a native module with buffered stream copy — safe for large files (2GB+).
 * Returns the content URI of the copied file, or null on failure.
 */
export async function copyToPublicDownloads(
  sourcePath: string,
  fileName: string
): Promise<string | null> {
  if (Platform.OS !== "android" || !MiraDownloadsCopy) return null;

  try {
    const uri = await MiraDownloadsCopy.copyToDownloads(
      sourcePath,
      fileName,
      "video/mp4",
      true // delete source after copy
    );
    return uri;
  } catch (error) {
    console.error("Failed to copy to public Downloads:", error);
    return null;
  }
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

  activeProgressCallback = onProgress ?? null;

  const downloadResumable = LegacyFileSystem.createDownloadResumable(
    url,
    filePath,
    {},
    (downloadProgress: LegacyFileSystem.DownloadProgressData) => {
      const progress =
        (downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite) *
        100;

      if (activeProgressCallback) {
        activeProgressCallback({
          totalBytesWritten: downloadProgress.totalBytesWritten,
          totalBytesExpectedToWrite:
            downloadProgress.totalBytesExpectedToWrite,
          progress,
        });
      }
    }
  );

  activeDownload = { id: downloadId, resumable: downloadResumable };

  try {
    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error("Download failed - no result returned");
    }

    // Clean up
    activeDownload = null;
    activeProgressCallback = null;

    const file = new File(result.uri);
    const fileSize = file.exists && file.size ? file.size : 0;

    return {
      filePath: result.uri,
      fileSize,
    };
  } catch (error) {
    activeDownload = null;
    activeProgressCallback = null;
    throw error;
  }
}

/**
 * Cancel the active download
 */
export async function cancelDownload(downloadId: string): Promise<void> {
  if (activeDownload && activeDownload.id === downloadId) {
    try {
      await activeDownload.resumable.pauseAsync();
    } catch {
      // Ignore errors when canceling
    }
  }

  activeDownload = null;
  activeProgressCallback = null;
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

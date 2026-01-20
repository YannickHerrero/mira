/**
 * Widget Poster Cache Module
 *
 * Handles downloading and caching poster images for widget display.
 * - iOS: Uses App Group shared container
 * - Android: Uses app's document directory (via Paths.document/posters)
 */

import { Platform } from "react-native";
import type { MediaType } from "@/lib/types";
import { getPosterUrl } from "@/lib/types";

// App Group identifier for iOS
const APP_GROUP_ID = "group.com.yherrero.mira";
const POSTERS_DIRECTORY = "posters";

// Types for expo-file-system (using require to avoid import issues)
type ExpoDirectory = InstanceType<typeof import("expo-file-system").Directory>;
type ExpoFile = InstanceType<typeof import("expo-file-system").File>;

// Lazy-loaded references
let postersDirectory: ExpoDirectory | null = null;
let FileClass: typeof import("expo-file-system").File | null = null;
let DirectoryClass: typeof import("expo-file-system").Directory | null = null;
let PathsClass: typeof import("expo-file-system").Paths | null = null;

/**
 * Initialize the expo-file-system classes (lazy load)
 */
function initFileSystem(): boolean {
  if (FileClass && DirectoryClass && PathsClass) {
    return true;
  }

  try {
    const ExpoFileSystem = require("expo-file-system");
    FileClass = ExpoFileSystem.File;
    DirectoryClass = ExpoFileSystem.Directory;
    PathsClass = ExpoFileSystem.Paths;
    return true;
  } catch (error) {
    console.warn("[PosterCache] Failed to load expo-file-system:", error);
    return false;
  }
}

/**
 * Get the posters directory (iOS: App Group, Android: document directory)
 */
function getPostersDirectory(): ExpoDirectory | null {
  if (postersDirectory) {
    return postersDirectory;
  }

  if (!initFileSystem() || !DirectoryClass || !PathsClass) {
    return null;
  }

  try {
    let baseDir: ExpoDirectory | undefined;

    if (Platform.OS === "ios") {
      // iOS: Use App Group container
      const appGroupContainer = PathsClass.appleSharedContainers?.[APP_GROUP_ID];
      if (!appGroupContainer) {
        console.warn("[PosterCache] App Group container not available");
        return null;
      }
      baseDir = appGroupContainer;
    } else if (Platform.OS === "android") {
      // Android: Use document directory
      baseDir = PathsClass.document;
    } else {
      return null;
    }

    if (!baseDir) {
      return null;
    }

    const dir = new DirectoryClass(baseDir, POSTERS_DIRECTORY);
    
    // Create the directory if it doesn't exist
    if (!dir.exists) {
      dir.create();
    }

    postersDirectory = dir;
    return postersDirectory;
  } catch (error) {
    console.warn("[PosterCache] Failed to initialize posters directory:", error);
    return null;
  }
}

/**
 * Check if poster caching is available
 */
export function isPosterCacheAvailable(): boolean {
  return getPostersDirectory() !== null;
}

/**
 * Get the poster filename for a media item
 * Format: {mediaType}_{tmdbId}.jpg
 */
export function getPosterFilename(tmdbId: number, mediaType: MediaType): string {
  return `${mediaType}_${tmdbId}.jpg`;
}

/**
 * Get a File reference for a cached poster
 */
function getPosterFile(tmdbId: number, mediaType: MediaType): ExpoFile | null {
  const dir = getPostersDirectory();
  if (!dir || !FileClass) return null;

  const filename = getPosterFilename(tmdbId, mediaType);
  return new FileClass(dir, filename);
}

/**
 * Check if a poster is cached
 */
export function isPosterCached(tmdbId: number, mediaType: MediaType): boolean {
  const file = getPosterFile(tmdbId, mediaType);
  return file?.exists ?? false;
}

/**
 * Download and cache a poster image
 *
 * @param tmdbId - TMDB ID of the media
 * @param mediaType - Type of media (movie or tv)
 * @param posterPath - TMDB poster path (e.g., "/abc123.jpg")
 * @returns true if cached successfully, false otherwise
 */
export async function cachePosterImage(
  tmdbId: number,
  mediaType: MediaType,
  posterPath: string | null | undefined
): Promise<boolean> {
  if (!posterPath) {
    return false;
  }

  const dir = getPostersDirectory();
  if (!dir || !FileClass) {
    return false;
  }

  // Skip if already cached
  if (isPosterCached(tmdbId, mediaType)) {
    return true;
  }

  const url = getPosterUrl(posterPath, "small");
  if (!url) {
    return false;
  }

  try {
    const filename = getPosterFilename(tmdbId, mediaType);
    const targetFile = new FileClass(dir, filename);

    // Download the image using the File's static method
    await FileClass.downloadFileAsync(url, targetFile, { idempotent: true });

    const platformLabel = Platform.OS === "ios" ? "iOS" : "Android";
    console.log(`[PosterCache] Cached poster for ${mediaType}/${tmdbId} (${platformLabel})`);
    return true;
  } catch (error) {
    const platformLabel = Platform.OS === "ios" ? "iOS" : "Android";
    console.warn(`[PosterCache] Failed to cache poster for ${mediaType}/${tmdbId} (${platformLabel}):`, error);
    return false;
  }
}

/**
 * Delete a cached poster image
 *
 * @param tmdbId - TMDB ID of the media
 * @param mediaType - Type of media (movie or tv)
 * @returns true if deleted successfully (or didn't exist), false on error
 */
export function deleteCachedPoster(tmdbId: number, mediaType: MediaType): boolean {
  const file = getPosterFile(tmdbId, mediaType);
  if (!file) {
    return true; // Cache not available, consider it a success
  }

  try {
    if (file.exists) {
      file.delete();
      const platformLabel = Platform.OS === "ios" ? "iOS" : "Android";
      console.log(`[PosterCache] Deleted poster for ${mediaType}/${tmdbId} (${platformLabel})`);
    }
    return true;
  } catch (error) {
    const platformLabel = Platform.OS === "ios" ? "iOS" : "Android";
    console.warn(`[PosterCache] Failed to delete poster for ${mediaType}/${tmdbId} (${platformLabel}):`, error);
    return false;
  }
}

/**
 * List all cached poster filenames (for debugging)
 */
export function listCachedPosters(): string[] {
  const dir = getPostersDirectory();
  if (!dir || !DirectoryClass) {
    return [];
  }

  try {
    const contents = dir.list();
    return contents
      .filter((item: ExpoFile | ExpoDirectory) => !(item instanceof DirectoryClass!))
      .map((file: ExpoFile | ExpoDirectory) => (file as ExpoFile).name);
  } catch (error) {
    console.warn("[PosterCache] Failed to list posters:", error);
    return [];
  }
}

/**
 * Clear all cached posters (for debugging/cleanup)
 */
export function clearAllCachedPosters(): boolean {
  const dir = getPostersDirectory();
  if (!dir) {
    return true;
  }

  try {
    if (dir.exists) {
      dir.delete();
      dir.create();
    }
    const platformLabel = Platform.OS === "ios" ? "iOS" : "Android";
    console.log(`[PosterCache] Cleared all cached posters (${platformLabel})`);
    return true;
  } catch (error) {
    console.warn("[PosterCache] Failed to clear posters:", error);
    return false;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { count: number; sizeBytes: number } {
  const dir = getPostersDirectory();
  if (!dir || !FileClass) {
    return { count: 0, sizeBytes: 0 };
  }

  try {
    const files = listCachedPosters();
    let totalSize = 0;

    for (const filename of files) {
      const file = new FileClass(dir, filename);
      if (file.exists) {
        totalSize += file.size || 0;
      }
    }

    return { count: files.length, sizeBytes: totalSize };
  } catch (error) {
    return { count: 0, sizeBytes: 0 };
  }
}

/**
 * Cache poster result for batch operations
 */
export interface CachePosterResult {
  success: number;
  failed: number;
  skipped: number;
}

/**
 * Cache multiple poster images (for batch migration)
 * 
 * @param items - Array of items with tmdbId, mediaType, and posterPath
 * @param onProgress - Optional callback for progress updates
 * @returns Results summary
 */
export async function cacheMultiplePosters(
  items: Array<{ tmdbId: number; mediaType: MediaType; posterPath: string | null }>,
  onProgress?: (current: number, total: number) => void
): Promise<CachePosterResult> {
  const result: CachePosterResult = { success: 0, failed: 0, skipped: 0 };

  if (!isPosterCacheAvailable()) {
    return result;
  }

  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress?.(i + 1, total);

    if (!item.posterPath) {
      result.skipped++;
      continue;
    }

    if (isPosterCached(item.tmdbId, item.mediaType)) {
      result.skipped++;
      continue;
    }

    try {
      const success = await cachePosterImage(item.tmdbId, item.mediaType, item.posterPath);
      if (success) {
        result.success++;
      } else {
        result.failed++;
      }
    } catch {
      result.failed++;
    }
  }

  return result;
}

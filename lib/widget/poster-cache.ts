/**
 * Widget Poster Cache Module
 *
 * Handles downloading and caching poster images to the App Group shared container
 * so the iOS widget can load them synchronously.
 *
 * This module is iOS-only. On other platforms, all operations are no-ops.
 */

import { Platform } from "react-native";
import type { MediaType } from "@/lib/types";
import { getPosterUrl } from "@/lib/types";

// App Group identifier - must match app.config.ts and widget
const APP_GROUP_ID = "group.com.yherrero.mira";
const POSTERS_DIRECTORY = "posters";

// Lazy-loaded references
let postersDirectory: InstanceType<typeof import("expo-file-system").Directory> | null = null;
let FileModule: typeof import("expo-file-system").File | null = null;
let DirectoryModule: typeof import("expo-file-system").Directory | null = null;

/**
 * Initialize the posters directory in the App Group container
 */
function getPostersDirectory(): typeof postersDirectory {
  if (Platform.OS !== "ios") {
    return null;
  }

  if (postersDirectory) {
    return postersDirectory;
  }

  try {
    const { Paths, Directory, File } = require("expo-file-system");
    FileModule = File;
    DirectoryModule = Directory;

    const appGroupContainer = Paths.appleSharedContainers?.[APP_GROUP_ID];
    if (!appGroupContainer) {
      console.warn("[PosterCache] App Group container not available");
      return null;
    }

    const dir = new Directory(appGroupContainer, POSTERS_DIRECTORY);
    
    // Create the directory if it doesn't exist
    if (!dir.exists) {
      dir.create();
    }

    postersDirectory = dir;
    return postersDirectory;
  } catch (error) {
    console.warn("[PosterCache] Failed to initialize:", error);
    return null;
  }
}

/**
 * Check if poster caching is available (iOS only)
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
 * Get the full path to a cached poster file
 */
function getPosterFile(tmdbId: number, mediaType: MediaType) {
  const dir = getPostersDirectory();
  if (!dir || !FileModule) return null;

  const filename = getPosterFilename(tmdbId, mediaType);
  return new FileModule(dir, filename);
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
  if (!dir || !FileModule) {
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
    const targetFile = new FileModule(dir, filename);

    // Download the image
    await FileModule.downloadFileAsync(url, targetFile, { idempotent: true });

    console.log(`[PosterCache] Cached poster for ${mediaType}/${tmdbId}`);
    return true;
  } catch (error) {
    console.warn(`[PosterCache] Failed to cache poster for ${mediaType}/${tmdbId}:`, error);
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
    return true; // Not on iOS, consider it a success
  }

  try {
    if (file.exists) {
      file.delete();
      console.log(`[PosterCache] Deleted poster for ${mediaType}/${tmdbId}`);
    }
    return true;
  } catch (error) {
    console.warn(`[PosterCache] Failed to delete poster for ${mediaType}/${tmdbId}:`, error);
    return false;
  }
}

/**
 * List all cached poster filenames (for debugging)
 */
export function listCachedPosters(): string[] {
  const dir = getPostersDirectory();
  if (!dir) {
    return [];
  }

  try {
    const contents = dir.list();
    return contents
      .filter((item: any) => !(item instanceof (DirectoryModule as any)))
      .map((file: any) => file.name);
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
    console.log("[PosterCache] Cleared all cached posters");
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
  if (!dir) {
    return { count: 0, sizeBytes: 0 };
  }

  try {
    const files = listCachedPosters();
    let totalSize = 0;

    for (const filename of files) {
      const file = new (FileModule as any)(dir, filename);
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

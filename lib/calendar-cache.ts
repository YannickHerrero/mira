/**
 * Calendar Releases Cache
 *
 * In-memory cache for calendar releases with time-based expiration
 * and automatic invalidation when watchlist changes.
 */

import type { UpcomingRelease } from "@/lib/api/tmdb";

// Cache duration: 4 hours (in milliseconds)
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000;

interface CachedMonthReleases {
  releases: UpcomingRelease[];
  timestamp: number;
  watchlistHash: string;
}

// In-memory cache keyed by "YYYY-MM"
const calendarCache = new Map<string, CachedMonthReleases>();

/**
 * Generate a cache key for a specific month
 */
function getMonthKey(month: number, year: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/**
 * Generate a hash from watchlist items to detect changes
 * @param items - Array of { tmdbId, mediaType } objects
 */
export function generateWatchlistHash(
  items: Array<{ tmdbId: number; mediaType: string }>
): string {
  if (items.length === 0) return "empty";
  
  // Sort by tmdbId and mediaType for consistent ordering
  const sorted = [...items].sort((a, b) => {
    if (a.tmdbId !== b.tmdbId) return a.tmdbId - b.tmdbId;
    return a.mediaType.localeCompare(b.mediaType);
  });
  
  // Create a simple hash string
  return sorted.map((item) => `${item.mediaType}:${item.tmdbId}`).join(",");
}

/**
 * Check if cache is valid for a specific month
 */
export function isCacheValid(
  month: number,
  year: number,
  currentWatchlistHash: string
): boolean {
  const key = getMonthKey(month, year);
  const cached = calendarCache.get(key);
  
  if (!cached) return false;
  
  // Check if cache has expired
  const age = Date.now() - cached.timestamp;
  if (age >= CACHE_DURATION_MS) return false;
  
  // Check if watchlist has changed
  if (cached.watchlistHash !== currentWatchlistHash) return false;
  
  return true;
}

/**
 * Get cached releases for a specific month
 */
export function getCachedReleases(
  month: number,
  year: number
): UpcomingRelease[] | null {
  const key = getMonthKey(month, year);
  const cached = calendarCache.get(key);
  
  if (!cached) return null;
  
  return cached.releases;
}

/**
 * Store releases in cache for a specific month
 */
export function setCachedReleases(
  month: number,
  year: number,
  releases: UpcomingRelease[],
  watchlistHash: string
): void {
  const key = getMonthKey(month, year);
  
  calendarCache.set(key, {
    releases,
    timestamp: Date.now(),
    watchlistHash,
  });
}

/**
 * Clear cache for a specific month
 */
export function clearMonthCache(month: number, year: number): void {
  const key = getMonthKey(month, year);
  calendarCache.delete(key);
}

/**
 * Clear the entire calendar cache
 */
export function clearCalendarCache(): void {
  calendarCache.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
} {
  return {
    size: calendarCache.size,
    keys: Array.from(calendarCache.keys()),
  };
}

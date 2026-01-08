import type { Stream } from "@/lib/types";
import type { SourceFilterSettings } from "@/stores/source-filters";

/**
 * Normalize quality string to match our standard format
 * e.g., "4K" -> "2160p", "4k" -> "2160p"
 */
function normalizeQuality(quality: string | undefined): string | undefined {
  if (!quality) return undefined;
  const upper = quality.toUpperCase();
  if (upper === "4K") return "2160p";
  return quality;
}

/**
 * Filter streams based on user preferences
 *
 * @param streams - Array of streams to filter
 * @param filters - User's filter settings
 * @returns Filtered array of streams
 */
export function filterStreams(
  streams: Stream[],
  filters: SourceFilterSettings
): Stream[] {
  const { qualities, languages } = filters;

  // If no filters are set, return all streams
  if (qualities.length === 0 && languages.length === 0) {
    return streams;
  }

  return streams.filter((stream) => {
    // Quality filter
    if (qualities.length > 0) {
      const normalizedQuality = normalizeQuality(stream.quality);
      if (!normalizedQuality || !qualities.includes(normalizedQuality as any)) {
        return false;
      }
    }

    // Language filter - stream must have at least one of the selected languages
    if (languages.length > 0) {
      const hasMatchingLanguage = stream.languages.some((lang) =>
        languages.includes(lang as any)
      );
      if (!hasMatchingLanguage) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check if any filters are currently active
 */
export function hasActiveFilters(filters: SourceFilterSettings): boolean {
  return filters.qualities.length > 0 || filters.languages.length > 0;
}

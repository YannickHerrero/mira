import type { Stream, MediaType } from "@/lib/types";

interface ScoringOptions {
  mediaType: MediaType;
  isAnime?: boolean;
  preferredLanguages?: string[];
}

/**
 * Keywords that strongly suggest a source is not the actual main content
 */
const TRAILER_KEYWORDS = /\b(trailer|promo|sample|preview|clip|extra|bonus|teaser|opening|ending|op|ed)\b/i;

/**
 * Filter out potential trailers based on size, quality, and keywords
 */
export function isLikelyTrailer(stream: Stream, mediaType: MediaType): boolean {
  const sizeMB = stream.sizeBytes / (1024 * 1024);
  const quality = stream.quality?.toLowerCase() || "";
  const title = stream.title.toLowerCase();

  // Keyword check
  if (TRAILER_KEYWORDS.test(title)) {
    return true;
  }

  // Size-based heuristic
  if (mediaType === "tv") {
    // TV Episode thresholds
    if (quality.includes("2160p") || quality.includes("4k")) return sizeMB < 400;
    if (quality.includes("1080p")) return sizeMB < 150;
    if (quality.includes("720p")) return sizeMB < 80;
    return sizeMB < 30;
  } 
  
  // Movie thresholds
  if (quality.includes("2160p") || quality.includes("4k")) return sizeMB < 2000;
  if (quality.includes("1080p")) return sizeMB < 800;
  if (quality.includes("720p")) return sizeMB < 400;
  return sizeMB < 150;
}

/**
 * Calculate a recommendation score for a stream
 */
export function calculateSourceScore(stream: Stream, options: ScoringOptions): number {
  const { mediaType, isAnime = false, preferredLanguages = [] } = options;

  let score = 0;

  // 1. Trailer penalty (massive penalty)
  if (isLikelyTrailer(stream, mediaType)) {
    return -10000;
  }

  // 2. Quality points - Prefer 1080p as requested
  const quality = stream.quality?.toLowerCase() || "";
  if (quality.includes("1080p")) {
    score += 1000;
  } else if (quality.includes("720p")) {
    score += 800;
  } else if (quality.includes("2160p") || quality.includes("4k")) {
    score += 600; // Lower score for 4K to favor 1080p/720p on 5G
  } else {
    score += 400;
  }

  // 3. Provider bonus (nyaasi is better for anime)
  if (isAnime && stream.provider.toLowerCase().includes("nyaa")) {
    score += 0;
  }

  // 4. Caching bonus (essential for smooth experience)
  if (stream.isCached) {
    score += 1000;
  }

  // 5. Language points
  if (stream.languages && stream.languages.length > 0) {
    // Reduced weight for languages to favor efficiency
    score += stream.languages.length * 30;
    
    // Extra bonus for preferred languages
    for (const lang of stream.languages) {
      if (preferredLanguages.includes(lang)) {
        score += 150;
      }
    }
  }

  // 6. Seeder bonus (logarithmic)
  if (stream.seeders && stream.seeders > 0) {
    score += Math.log2(stream.seeders + 1) * 50;
  }

  // 7. Size penalty (Efficiency)
  // Penalty grows exponentially to avoid excessively large files
  const sizeGB = stream.sizeBytes / (1024 * 1024 * 1024);
  score -= Math.pow(sizeGB, 1.5) * 80;

  return score;
}

/**
 * Get recommended sources from a list of streams
 */
export function getRecommendedSources(
  streams: Stream[],
  options: ScoringOptions,
  limit: number = 2
): Stream[] {
  if (!streams.length) return [];

  const scoredStreams = streams
    .map((stream) => ({
      stream,
      score: calculateSourceScore(stream, options),
    }))
    .filter((item) => item.score > 0) // Filter out trailers and very poor sources
    .sort((a, b) => b.score - a.score);

  return scoredStreams.slice(0, limit).map((item) => item.stream);
}

/**
 * Recommendation Scoring Utilities
 *
 * Calculates implicit ratings and genre affinities from user watch history.
 */

import type { MediaRecord, WatchProgress } from "@/db/schema";

/**
 * Calculate days since a given date string
 */
function daysSinceDate(dateString: string | null | undefined): number {
  if (!dateString) return 365; // Default to old if no date
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate an implicit rating based on watch behavior.
 *
 * Rating scale: -0.3 to 2.0+
 * - Abandoned early (<20%): -0.3
 * - Tried it (20-50%): 0.2
 * - Watched half (50-90%): 0.5
 * - Completed (90%+): 1.0
 * - Favorited: +1.0 bonus
 *
 * Recency decay: exponential with 6-month half-life
 */
export function calculateImplicitRating(
  watch: WatchProgress,
  media: MediaRecord
): number {
  let rating = 0;

  // Calculate completion percentage
  const completionPct =
    watch.duration > 0 ? (watch.position / watch.duration) * 100 : 0;

  // Completion-based scoring
  if (watch.completed || completionPct >= 90) {
    rating = 1.0; // Finished = strong positive
  } else if (completionPct >= 50) {
    rating = 0.5; // Watched half = mild positive
  } else if (completionPct >= 20) {
    rating = 0.2; // Tried it = slight positive
  } else {
    rating = -0.3; // Abandoned early = negative signal
  }

  // Favorite bonus
  if (media.isFavorite) {
    rating += 1.0;
  }

  // Recency decay (6-month half-life)
  const daysSince = daysSinceDate(watch.watchedAt);
  const recencyMultiplier = Math.exp(-daysSince / 180);

  return rating * recencyMultiplier;
}

/**
 * For TV shows, calculate a show-level rating from episode watches.
 * Considers: number of episodes watched, completion rates, recency.
 */
export function calculateTvShowRating(
  episodeWatches: WatchProgress[],
  media: MediaRecord
): number {
  if (episodeWatches.length === 0) return 0;

  // Get the most recent watch for recency calculation
  const mostRecentWatch = episodeWatches.reduce((latest, current) => {
    const latestDate = new Date(latest.watchedAt || 0);
    const currentDate = new Date(current.watchedAt || 0);
    return currentDate > latestDate ? current : latest;
  });

  // Count completed episodes
  const completedEpisodes = episodeWatches.filter(
    (w) => w.completed || (w.duration > 0 && w.position / w.duration >= 0.9)
  ).length;

  // Base rating on engagement level
  let rating = 0;

  if (completedEpisodes >= 3) {
    // Watched multiple episodes = strong signal
    rating = 1.0;
  } else if (completedEpisodes >= 1) {
    // Completed at least one episode
    rating = 0.7;
  } else if (episodeWatches.length >= 1) {
    // Started watching
    rating = 0.3;
  }

  // Favorite bonus
  if (media.isFavorite) {
    rating += 1.0;
  }

  // Recency decay
  const daysSince = daysSinceDate(mostRecentWatch.watchedAt);
  const recencyMultiplier = Math.exp(-daysSince / 180);

  return rating * recencyMultiplier;
}

/**
 * Build genre affinity map from watch history.
 * Returns a Map of genre name -> affinity score (0-1 normalized).
 */
export function buildGenreAffinity(
  watchHistory: Array<{ watch: WatchProgress; media: MediaRecord }>
): Map<string, number> {
  const genreScores = new Map<string, number>();
  const genreCounts = new Map<string, number>();

  for (const { watch, media } of watchHistory) {
    const rating = calculateImplicitRating(watch, media);
    const genres: string[] = media.genres ? JSON.parse(media.genres) : [];

    for (const genre of genres) {
      genreScores.set(genre, (genreScores.get(genre) || 0) + rating);
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    }
  }

  // Normalize scores using sqrt of count to dampen high-frequency genres
  const normalized = new Map<string, number>();
  let maxScore = 0;

  for (const [genre, score] of genreScores) {
    const count = genreCounts.get(genre) || 1;
    const normalizedScore = score / Math.sqrt(count);
    normalized.set(genre, normalizedScore);
    maxScore = Math.max(maxScore, normalizedScore);
  }

  // Scale to 0-1 range
  if (maxScore > 0) {
    for (const [genre, score] of normalized) {
      normalized.set(genre, score / maxScore);
    }
  }

  return normalized;
}

/**
 * Get top N genres from affinity map, sorted by score descending.
 */
export function getTopGenres(
  genreAffinity: Map<string, number>,
  limit: number = 3
): Array<{ genre: string; score: number }> {
  return Array.from(genreAffinity.entries())
    .map(([genre, score]) => ({ genre, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Reverse lookup: genre name to TMDB genre ID.
 */
export const GENRE_NAME_TO_ID: Record<string, number> = {
  // Movie genres
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  "TV Movie": 10770,
  Thriller: 53,
  War: 10752,
  Western: 37,
  // TV genres
  "Action & Adventure": 10759,
  Kids: 10762,
  News: 10763,
  Reality: 10764,
  "Sci-Fi & Fantasy": 10765,
  Soap: 10766,
  Talk: 10767,
  "War & Politics": 10768,
};

/**
 * Convert genre names to TMDB genre IDs.
 */
export function genreNamesToIds(genreNames: string[]): number[] {
  return genreNames
    .map((name) => GENRE_NAME_TO_ID[name])
    .filter((id): id is number => id !== undefined);
}

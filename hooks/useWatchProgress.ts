import { useCallback } from "react";
import { eq, and, sql, isNull } from "drizzle-orm";
import { useDatabase } from "@/db/provider";
import { watchProgressTable } from "@/db/schema";
import { progressKey } from "@/lib/manual-sync-keys";
import { clearManualSyncDeletion, markManualSyncDeletion } from "@/lib/manual-sync-metadata";
import { enqueueAniListSync } from "@/lib/anilist-sync";
import type { MediaType } from "@/lib/types";

interface ProgressParams {
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

interface SaveProgressParams extends ProgressParams {
  position: number; // seconds
  duration: number; // seconds
}

/**
 * Hook for managing watch progress in the database
 */
export function useWatchProgress() {
  const { db } = useDatabase();

  /**
   * Save current playback position
   * Uses upsert to create or update progress
   */
  const saveProgress = useCallback(
    async ({ tmdbId, mediaType, seasonNumber, episodeNumber, position, duration }: SaveProgressParams) => {
      if (!db || duration <= 0) return;

      // Calculate if we should mark as completed (>= 80% watched)
      // Using 80% to account for long credits and anime endings
      const percentWatched = (position / duration) * 100;
      const completed = percentWatched >= 80;

      try {
        await db
          .insert(watchProgressTable)
          .values({
            tmdbId,
            mediaType,
            seasonNumber: seasonNumber ?? null,
            episodeNumber: episodeNumber ?? null,
            position: Math.floor(position),
            duration: Math.floor(duration),
            completed,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
          })
          .onConflictDoUpdate({
            target: [
              watchProgressTable.tmdbId,
              watchProgressTable.mediaType,
              watchProgressTable.seasonNumber,
              watchProgressTable.episodeNumber,
            ],
            set: {
              position: Math.floor(position),
              duration: Math.floor(duration),
              completed,
              updatedAt: sql`(CURRENT_TIMESTAMP)`,
            },
          });
        clearManualSyncDeletion(
          "progress",
          progressKey(tmdbId, mediaType, seasonNumber, episodeNumber)
        );

        if (completed) {
          await enqueueAniListSync({
            tmdbId,
            mediaType,
            seasonNumber,
            episodeNumber,
          });
        }
      } catch (err) {
        console.error("[useWatchProgress] Failed to save progress:", err);
      }
    },
    [db]
  );

  /**
   * Mark media as completed (watched to the end)
   */
  const markAsCompleted = useCallback(
    async ({ tmdbId, mediaType, seasonNumber, episodeNumber }: ProgressParams) => {
      if (!db) return;

      try {
        const whereClause =
          mediaType === "tv" && seasonNumber != null && episodeNumber != null
            ? and(
                eq(watchProgressTable.tmdbId, tmdbId),
                eq(watchProgressTable.mediaType, mediaType),
                eq(watchProgressTable.seasonNumber, seasonNumber),
                eq(watchProgressTable.episodeNumber, episodeNumber)
              )
            : and(
                eq(watchProgressTable.tmdbId, tmdbId),
                eq(watchProgressTable.mediaType, mediaType)
              );

        await db
          .update(watchProgressTable)
          .set({
            completed: true,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
          })
          .where(whereClause);
        clearManualSyncDeletion(
          "progress",
          progressKey(tmdbId, mediaType, seasonNumber, episodeNumber)
        );

        await enqueueAniListSync({
          tmdbId,
          mediaType,
          seasonNumber,
          episodeNumber,
        });
      } catch (err) {
        console.error("[useWatchProgress] Failed to mark as completed:", err);
      }
    },
    [db]
  );

  /**
   * Get saved progress for resuming playback
   * Returns position in seconds, or null if no progress found
   */
  const getProgress = useCallback(
    async ({ tmdbId, mediaType, seasonNumber, episodeNumber }: ProgressParams): Promise<{
      position: number;
      duration: number;
      completed: boolean;
    } | null> => {
      if (!db) return null;

      try {
        const whereClause =
          mediaType === "tv" && seasonNumber != null && episodeNumber != null
            ? and(
                eq(watchProgressTable.tmdbId, tmdbId),
                eq(watchProgressTable.mediaType, mediaType),
                eq(watchProgressTable.seasonNumber, seasonNumber),
                eq(watchProgressTable.episodeNumber, episodeNumber)
              )
            : mediaType === "movie"
              ? and(
                  eq(watchProgressTable.tmdbId, tmdbId),
                  eq(watchProgressTable.mediaType, mediaType),
                  isNull(watchProgressTable.seasonNumber),
                  isNull(watchProgressTable.episodeNumber)
                )
              : and(
                  eq(watchProgressTable.tmdbId, tmdbId),
                  eq(watchProgressTable.mediaType, mediaType)
                );

        const result = await db
          .select()
          .from(watchProgressTable)
          .where(whereClause)
          .limit(1);

        if (result.length > 0) {
          return {
            position: result[0].position,
            duration: result[0].duration,
            completed: result[0].completed ?? false,
          };
        }

        return null;
      } catch (err) {
        console.error("[useWatchProgress] Failed to get progress:", err);
        return null;
      }
    },
    [db]
  );

  /**
   * Clear progress for a media item (e.g., to rewatch)
   */
  const clearProgress = useCallback(
    async ({ tmdbId, mediaType, seasonNumber, episodeNumber }: ProgressParams) => {
      if (!db) return;

      try {
        const whereClause =
          mediaType === "tv" && seasonNumber != null && episodeNumber != null
            ? and(
                eq(watchProgressTable.tmdbId, tmdbId),
                eq(watchProgressTable.mediaType, mediaType),
                eq(watchProgressTable.seasonNumber, seasonNumber),
                eq(watchProgressTable.episodeNumber, episodeNumber)
              )
            : and(
                eq(watchProgressTable.tmdbId, tmdbId),
                eq(watchProgressTable.mediaType, mediaType)
              );

        await db.delete(watchProgressTable).where(whereClause);
        markManualSyncDeletion(
          "progress",
          progressKey(tmdbId, mediaType, seasonNumber, episodeNumber)
        );
      } catch (err) {
        console.error("[useWatchProgress] Failed to clear progress:", err);
      }
    },
    [db]
  );

  /**
   * Mark multiple episodes as completed in a batch
   * Useful for "mark watched up to here" functionality
   */
  const markEpisodesAsCompleted = useCallback(
    async (
      tmdbId: number,
      episodes: Array<{ seasonNumber: number; episodeNumber: number }>
    ) => {
      if (!db || episodes.length === 0) return;

      try {
        // Use a transaction to batch insert/update all episodes
        for (const ep of episodes) {
          await db
            .insert(watchProgressTable)
            .values({
              tmdbId,
              mediaType: "tv",
              seasonNumber: ep.seasonNumber,
              episodeNumber: ep.episodeNumber,
              position: 0,
              duration: 1, // Set to 1 to avoid division by zero
              completed: true,
              updatedAt: sql`(CURRENT_TIMESTAMP)`,
            })
            .onConflictDoUpdate({
              target: [
                watchProgressTable.tmdbId,
                watchProgressTable.mediaType,
                watchProgressTable.seasonNumber,
                watchProgressTable.episodeNumber,
              ],
              set: {
                completed: true,
                updatedAt: sql`(CURRENT_TIMESTAMP)`,
              },
            });
          clearManualSyncDeletion(
            "progress",
            progressKey(tmdbId, "tv", ep.seasonNumber, ep.episodeNumber)
          );

          await enqueueAniListSync({
            tmdbId,
            mediaType: "tv",
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
          });
        }
      } catch (err) {
        console.error("[useWatchProgress] Failed to mark episodes as completed:", err);
      }
    },
    [db]
  );

  /**
   * Get all episode progress for a TV show
   * Returns a map of "seasonNumber-episodeNumber" -> progress data
   */
  const getShowProgress = useCallback(
    async (tmdbId: number): Promise<Map<string, { position: number; duration: number; completed: boolean }>> => {
      const progressMap = new Map<string, { position: number; duration: number; completed: boolean }>();
      if (!db) return progressMap;

      try {
        const results = await db
          .select()
          .from(watchProgressTable)
          .where(
            and(
              eq(watchProgressTable.tmdbId, tmdbId),
              eq(watchProgressTable.mediaType, "tv")
            )
          );

        for (const result of results) {
          if (result.seasonNumber != null && result.episodeNumber != null) {
            const key = `${result.seasonNumber}-${result.episodeNumber}`;
            progressMap.set(key, {
              position: result.position,
              duration: result.duration,
              completed: result.completed ?? false,
            });
          }
        }

        return progressMap;
      } catch (err) {
        console.error("[useWatchProgress] Failed to get show progress:", err);
        return progressMap;
      }
    },
    [db]
  );

  return {
    saveProgress,
    markAsCompleted,
    markEpisodesAsCompleted,
    getProgress,
    clearProgress,
    getShowProgress,
  };
}

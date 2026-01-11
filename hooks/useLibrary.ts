import { useState, useEffect, useCallback } from "react";
import { eq, desc, and, sql } from "drizzle-orm";
import { useDatabase } from "@/db/provider";
import { mediaTable, watchProgressTable, watchlistTable } from "@/db/schema";
import { favoriteKey } from "@/lib/manual-sync-keys";
import { clearManualSyncDeletion, markManualSyncDeletion } from "@/lib/manual-sync-metadata";
import type { Media, MediaType } from "@/lib/types";

export interface ContinueWatchingProgress {
  tmdbId: number;
  mediaType: "movie" | "tv";
  seasonNumber: number | null;
  episodeNumber: number | null;
  position: number;
  duration: number;
  completed: boolean | null;
  watchedAt: string | null;
  updatedAt: string | null;
}

export interface ContinueWatchingItem {
  progress: ContinueWatchingProgress;
  media: {
    tmdbId: number;
    mediaType: string;
    title: string;
    titleOriginal: string | null;
    imdbId: string | null;
    year: number | null;
    score: number | null;
    posterPath: string | null;
    backdropPath: string | null;
    description: string | null;
    genres: string | null;
    seasonCount: number | null;
    episodeCount: number | null;
    isFavorite: boolean | null;
    addedAt: string | null;
    updatedAt: string | null;
  };
}

/**
 * Hook to get media currently being watched (not completed)
 * For TV shows, only shows the most recently watched episode per show
 */
export function useContinueWatching() {
  const { db } = useDatabase();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!db) return;

    try {
      // Get progress entries ordered by most recent
      const progressResult = await db
        .select()
        .from(watchProgressTable)
        .where(eq(watchProgressTable.completed, false))
        .orderBy(desc(watchProgressTable.updatedAt));

      // Deduplicate: keep only the most recent episode per TV show
      // Movies are unique by nature, TV shows should only appear once
      const seenMedia = new Map<string, (typeof progressResult)[0]>();

      for (const progress of progressResult) {
        const key = `${progress.tmdbId}-${progress.mediaType}`;
        // Only keep the first (most recent) entry per media
        if (!seenMedia.has(key)) {
          seenMedia.set(key, progress);
        }
      }

      // Get unique progress entries, limited to 20
      const uniqueProgress = Array.from(seenMedia.values()).slice(0, 20);

      // For each progress, get the media
      const itemsWithMedia: ContinueWatchingItem[] = [];
      for (const progress of uniqueProgress) {
        const mediaResult = await db
          .select()
          .from(mediaTable)
          .where(
            and(
              eq(mediaTable.tmdbId, progress.tmdbId),
              eq(mediaTable.mediaType, progress.mediaType)
            )
          )
          .limit(1);

        if (mediaResult.length > 0) {
          itemsWithMedia.push({
            progress,
            media: mediaResult[0],
          });
        }
      }

      setItems(itemsWithMedia);
    } catch (err) {
      console.error("Failed to fetch continue watching:", err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (db) {
      fetchData();
    }
  }, [db, fetchData]);

  return { items, isLoading, refetch: fetchData };
}

/**
 * Hook to get user's watchlist
 */
export function useWatchlist() {
  const { db } = useDatabase();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!db) return;

    try {
      const watchlistResult = await db
        .select()
        .from(watchlistTable)
        .orderBy(desc(watchlistTable.addedAt));

      const itemsWithMedia = [];
      for (const watchlistItem of watchlistResult) {
        const mediaResult = await db
          .select()
          .from(mediaTable)
          .where(
            and(
              eq(mediaTable.tmdbId, watchlistItem.tmdbId),
              eq(mediaTable.mediaType, watchlistItem.mediaType)
            )
          )
          .limit(1);

        if (mediaResult.length > 0) {
          itemsWithMedia.push({
            watchlist: watchlistItem,
            media: mediaResult[0],
          });
        }
      }

      setItems(itemsWithMedia);
    } catch (err) {
      console.error("Failed to fetch watchlist:", err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (db) {
      fetchData();
    }
  }, [db, fetchData]);

  return { items, isLoading, refetch: fetchData };
}

/**
 * Hook to get user's favorites
 */
export function useFavorites() {
  const { db } = useDatabase();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!db) return;

    try {
      const result = await db
        .select()
        .from(mediaTable)
        .where(eq(mediaTable.isFavorite, true))
        .orderBy(desc(mediaTable.updatedAt));

      setItems(result);
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (db) {
      fetchData();
    }
  }, [db, fetchData]);

  return { items, isLoading, refetch: fetchData };
}

/**
 * Hook to manage media in library (add, remove, favorite, etc.)
 */
export function useLibraryActions() {
  const { db } = useDatabase();

  const saveMedia = useCallback(
    async (media: Media, imdbId?: string) => {
      if (!db) return;

      await db
        .insert(mediaTable)
        .values({
          tmdbId: media.id,
          mediaType: media.mediaType,
          title: media.title,
          titleOriginal: media.titleOriginal,
          imdbId: imdbId,
          year: media.year,
          score: media.score,
          posterPath: media.posterPath,
          backdropPath: media.backdropPath,
          description: media.description,
          genres: JSON.stringify(media.genres),
          seasonCount: media.seasonCount,
          episodeCount: media.episodeCount,
        })
        .onConflictDoUpdate({
          target: [mediaTable.tmdbId, mediaTable.mediaType],
          set: {
            title: media.title,
            posterPath: media.posterPath,
            imdbId: imdbId,
          },
        });
    },
    [db]
  );

  const addToWatchlist = useCallback(
    async (media: Media, imdbId?: string) => {
      if (!db) return;

      await saveMedia(media, imdbId);

      await db
        .insert(watchlistTable)
        .values({
          tmdbId: media.id,
          mediaType: media.mediaType,
        })
        .onConflictDoNothing();
    },
    [db, saveMedia]
  );

  const removeFromWatchlist = useCallback(
    async (tmdbId: number, mediaType: MediaType) => {
      if (!db) return;
      await db
        .delete(watchlistTable)
        .where(
          and(
            eq(watchlistTable.tmdbId, tmdbId),
            eq(watchlistTable.mediaType, mediaType)
          )
        );
    },
    [db]
  );

  const toggleFavorite = useCallback(
    async (media: Media, imdbId?: string) => {
      if (!db) return;

      const existing = await db
        .select()
        .from(mediaTable)
        .where(
          and(
            eq(mediaTable.tmdbId, media.id),
            eq(mediaTable.mediaType, media.mediaType)
          )
        )
        .limit(1);

      const syncKey = favoriteKey(media.id, media.mediaType);

      if (existing.length > 0) {
        const nextFavorite = !existing[0].isFavorite;
        await db
          .update(mediaTable)
          .set({
            isFavorite: nextFavorite,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
          })
          .where(
            and(
              eq(mediaTable.tmdbId, media.id),
              eq(mediaTable.mediaType, media.mediaType)
            )
          );

        if (nextFavorite) {
          clearManualSyncDeletion("favorites", syncKey);
        } else {
          markManualSyncDeletion("favorites", syncKey);
        }
      } else {
        await db.insert(mediaTable).values({
          tmdbId: media.id,
          mediaType: media.mediaType,
          title: media.title,
          titleOriginal: media.titleOriginal,
          imdbId: imdbId,
          year: media.year,
          score: media.score,
          posterPath: media.posterPath,
          backdropPath: media.backdropPath,
          description: media.description,
          genres: JSON.stringify(media.genres),
          seasonCount: media.seasonCount,
          episodeCount: media.episodeCount,
          isFavorite: true,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
        });
        clearManualSyncDeletion("favorites", syncKey);
      }
    },
    [db]
  );

  const checkIsFavorite = useCallback(
    async (tmdbId: number, mediaType: MediaType): Promise<boolean> => {
      if (!db) return false;
      const result = await db
        .select()
        .from(mediaTable)
        .where(
          and(eq(mediaTable.tmdbId, tmdbId), eq(mediaTable.mediaType, mediaType))
        )
        .limit(1);
      return result[0]?.isFavorite ?? false;
    },
    [db]
  );

  const checkIsInWatchlist = useCallback(
    async (tmdbId: number, mediaType: MediaType): Promise<boolean> => {
      if (!db) return false;
      const result = await db
        .select()
        .from(watchlistTable)
        .where(
          and(
            eq(watchlistTable.tmdbId, tmdbId),
            eq(watchlistTable.mediaType, mediaType)
          )
        )
        .limit(1);
      return result.length > 0;
    },
    [db]
  );

  return {
    saveMedia,
    addToWatchlist,
    removeFromWatchlist,
    toggleFavorite,
    checkIsFavorite,
    checkIsInWatchlist,
  };
}

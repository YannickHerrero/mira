import { useState, useEffect, useCallback } from "react";
import { eq, desc, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { useDatabase } from "@/db/provider";
import {
  listsTable,
  listItemsTable,
  mediaTable,
  watchlistTable,
} from "@/db/schema";
import { listItemKey } from "@/lib/manual-sync-keys";
import { clearManualSyncDeletion, markManualSyncDeletion } from "@/lib/manual-sync-metadata";
import type { Media, MediaType } from "@/lib/types";

export const DEFAULT_WATCHLIST_NAME = "Watchlist";

export interface ListWithCount {
  id: string;
  name: string;
  isDefault: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
  itemCount: number;
}

export interface ListItemWithMedia {
  listId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  addedAt: string | null;
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
 * Hook to fetch all user lists with item counts
 */
export function useLists() {
  const { db } = useDatabase();
  const [lists, setLists] = useState<ListWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!db) return;

    try {
      // Get all lists
      const listsResult = await db
        .select()
        .from(listsTable)
        .orderBy(desc(listsTable.isDefault), desc(listsTable.createdAt));

      // Get item counts for each list
      const listsWithCounts: ListWithCount[] = await Promise.all(
        listsResult.map(async (list) => {
          const itemsResult = await db
            .select()
            .from(listItemsTable)
            .where(eq(listItemsTable.listId, list.id));

          return {
            ...list,
            itemCount: itemsResult.length,
          };
        })
      );

      setLists(listsWithCounts);
    } catch (err) {
      console.error("Failed to fetch lists:", err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (db) {
      fetchData();
    }
  }, [db, fetchData]);

  return { lists, isLoading, refetch: fetchData };
}

/**
 * Hook to fetch items in a specific list
 */
export function useListItems(listId: string | null) {
  const { db } = useDatabase();
  const [items, setItems] = useState<ListItemWithMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!db || !listId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      const listItemsResult = await db
        .select()
        .from(listItemsTable)
        .where(eq(listItemsTable.listId, listId))
        .orderBy(desc(listItemsTable.addedAt));

      const itemsWithMedia: ListItemWithMedia[] = [];
      for (const item of listItemsResult) {
        const mediaResult = await db
          .select()
          .from(mediaTable)
          .where(
            and(
              eq(mediaTable.tmdbId, item.tmdbId),
              eq(mediaTable.mediaType, item.mediaType)
            )
          )
          .limit(1);

        if (mediaResult.length > 0) {
          itemsWithMedia.push({
            listId: item.listId,
            tmdbId: item.tmdbId,
            mediaType: item.mediaType as "movie" | "tv",
            addedAt: item.addedAt,
            media: mediaResult[0],
          });
        }
      }

      setItems(itemsWithMedia);
    } catch (err) {
      console.error("Failed to fetch list items:", err);
    } finally {
      setIsLoading(false);
    }
  }, [db, listId]);

  useEffect(() => {
    if (db) {
      fetchData();
    }
  }, [db, fetchData]);

  return { items, isLoading, refetch: fetchData };
}

/**
 * Hook to get which lists a media item belongs to
 */
export function useMediaLists(tmdbId: number, mediaType: MediaType) {
  const { db } = useDatabase();
  const [listIds, setListIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!db || !tmdbId) {
      setListIds([]);
      setIsLoading(false);
      return;
    }

    try {
      const result = await db
        .select()
        .from(listItemsTable)
        .where(
          and(
            eq(listItemsTable.tmdbId, tmdbId),
            eq(listItemsTable.mediaType, mediaType)
          )
        );

      setListIds(result.map((r) => r.listId));
    } catch (err) {
      console.error("Failed to fetch media lists:", err);
    } finally {
      setIsLoading(false);
    }
  }, [db, tmdbId, mediaType]);

  useEffect(() => {
    if (db) {
      fetchData();
    }
  }, [db, fetchData]);

  return { listIds, isLoading, refetch: fetchData };
}

/**
 * Hook for list CRUD operations and item management
 */
export function useListActions() {
  const { db } = useDatabase();

  /**
   * Ensure the default "Watchlist" exists
   */
  const ensureDefaultList = useCallback(async (): Promise<string | null> => {
    if (!db) return null;

    try {
      // Check if default list exists
      const existing = await db
        .select()
        .from(listsTable)
        .where(eq(listsTable.isDefault, true))
        .limit(1);

      if (existing.length > 0) {
        return existing[0].id;
      }

      // Create default watchlist
      const id = createId();
      await db.insert(listsTable).values({
        id,
        name: DEFAULT_WATCHLIST_NAME,
        isDefault: true,
      });
      clearManualSyncDeletion("lists", id);

      return id;
    } catch (err) {
      console.error("Failed to ensure default list:", err);
      return null;
    }
  }, [db]);

  /**
   * Create a new list
   */
  const createList = useCallback(
    async (name: string): Promise<string | null> => {
      if (!db) return null;

      try {
        const id = createId();
        await db.insert(listsTable).values({
          id,
          name: name.trim(),
          isDefault: false,
        });
        clearManualSyncDeletion("lists", id);
        return id;
      } catch (err) {
        console.error("Failed to create list:", err);
        return null;
      }
    },
    [db]
  );

  /**
   * Rename a list
   */
  const renameList = useCallback(
    async (listId: string, newName: string): Promise<boolean> => {
      if (!db) return false;

      try {
        await db
          .update(listsTable)
          .set({
            name: newName.trim(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(listsTable.id, listId));
        return true;
      } catch (err) {
        console.error("Failed to rename list:", err);
        return false;
      }
    },
    [db]
  );

  /**
   * Delete a list (cannot delete default list)
   */
  const deleteList = useCallback(
    async (listId: string): Promise<boolean> => {
      if (!db) return false;

      try {
        // Check if it's the default list
        const list = await db
          .select()
          .from(listsTable)
          .where(eq(listsTable.id, listId))
          .limit(1);

        if (list.length > 0 && list[0].isDefault) {
          console.error("Cannot delete the default list");
          return false;
        }

        // Delete list (items will be cascade deleted)
        await db.delete(listsTable).where(eq(listsTable.id, listId));
        markManualSyncDeletion("lists", listId);
        return true;
      } catch (err) {
        console.error("Failed to delete list:", err);
        return false;
      }
    },
    [db]
  );

  /**
   * Save media to the media table (upsert)
   */
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

  /**
   * Add media to a list
   */
  const addToList = useCallback(
    async (listId: string, media: Media, imdbId?: string): Promise<boolean> => {
      if (!db) return false;

      try {
        // Ensure media is saved
        await saveMedia(media, imdbId);

        // Add to list
        await db
          .insert(listItemsTable)
          .values({
            listId,
            tmdbId: media.id,
            mediaType: media.mediaType,
          })
          .onConflictDoNothing();

        clearManualSyncDeletion(
          "listItems",
          listItemKey(listId, media.id, media.mediaType)
        );
        return true;
      } catch (err) {
        console.error("Failed to add to list:", err);
        return false;
      }
    },
    [db, saveMedia]
  );

  /**
   * Remove media from a list
   */
  const removeFromList = useCallback(
    async (
      listId: string,
      tmdbId: number,
      mediaType: MediaType
    ): Promise<boolean> => {
      if (!db) return false;

      try {
        await db
          .delete(listItemsTable)
          .where(
            and(
              eq(listItemsTable.listId, listId),
              eq(listItemsTable.tmdbId, tmdbId),
              eq(listItemsTable.mediaType, mediaType)
            )
          );
        markManualSyncDeletion(
          "listItems",
          listItemKey(listId, tmdbId, mediaType)
        );
        return true;
      } catch (err) {
        console.error("Failed to remove from list:", err);
        return false;
      }
    },
    [db]
  );

  /**
   * Update media's list memberships (add to selected, remove from unselected)
   */
  const updateMediaLists = useCallback(
    async (
      media: Media,
      selectedListIds: string[],
      imdbId?: string
    ): Promise<boolean> => {
      if (!db) return false;

      try {
        // Ensure media is saved
        await saveMedia(media, imdbId);

        // Get current list memberships
        const currentMemberships = await db
          .select()
          .from(listItemsTable)
          .where(
            and(
              eq(listItemsTable.tmdbId, media.id),
              eq(listItemsTable.mediaType, media.mediaType)
            )
          );

        const currentListIds = new Set(currentMemberships.map((m) => m.listId));
        const targetListIds = new Set(selectedListIds);

        // Lists to add to
        const toAdd = selectedListIds.filter((id) => !currentListIds.has(id));
        // Lists to remove from
        const toRemove = [...currentListIds].filter(
          (id) => !targetListIds.has(id)
        );

        // Add to new lists
        for (const listId of toAdd) {
          await db
            .insert(listItemsTable)
            .values({
              listId,
              tmdbId: media.id,
              mediaType: media.mediaType,
            })
            .onConflictDoNothing();
          clearManualSyncDeletion(
            "listItems",
            listItemKey(listId, media.id, media.mediaType)
          );
        }

        // Remove from deselected lists
        for (const listId of toRemove) {
          await db
            .delete(listItemsTable)
            .where(
              and(
                eq(listItemsTable.listId, listId),
                eq(listItemsTable.tmdbId, media.id),
                eq(listItemsTable.mediaType, media.mediaType)
              )
            );
          markManualSyncDeletion(
            "listItems",
            listItemKey(listId, media.id, media.mediaType)
          );
        }

        return true;
      } catch (err) {
        console.error("Failed to update media lists:", err);
        return false;
      }
    },
    [db, saveMedia]
  );

  /**
   * Migrate data from old watchlist table to new lists system
   */
  const migrateFromWatchlist = useCallback(async (): Promise<boolean> => {
    if (!db) return false;

    try {
      // Ensure default list exists
      const defaultListId = await ensureDefaultList();
      if (!defaultListId) return false;

      // Get all items from old watchlist
      const oldWatchlistItems = await db.select().from(watchlistTable);

      // Add each to the new list system
      for (const item of oldWatchlistItems) {
        await db
          .insert(listItemsTable)
          .values({
            listId: defaultListId,
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            addedAt: item.addedAt,
          })
          .onConflictDoNothing();
        clearManualSyncDeletion(
          "listItems",
          listItemKey(defaultListId, item.tmdbId, item.mediaType)
        );
      }

      console.log(
        `Migrated ${oldWatchlistItems.length} items from old watchlist`
      );
      return true;
    } catch (err) {
      console.error("Failed to migrate watchlist:", err);
      return false;
    }
  }, [db, ensureDefaultList]);

  /**
   * Check if media is in any list
   */
  const checkIsInAnyList = useCallback(
    async (tmdbId: number, mediaType: MediaType): Promise<boolean> => {
      if (!db) return false;

      try {
        const result = await db
          .select()
          .from(listItemsTable)
          .where(
            and(
              eq(listItemsTable.tmdbId, tmdbId),
              eq(listItemsTable.mediaType, mediaType)
            )
          )
          .limit(1);

        return result.length > 0;
      } catch (err) {
        console.error("Failed to check list membership:", err);
        return false;
      }
    },
    [db]
  );

  return {
    ensureDefaultList,
    createList,
    renameList,
    deleteList,
    addToList,
    removeFromList,
    updateMediaLists,
    migrateFromWatchlist,
    checkIsInAnyList,
    saveMedia,
  };
}

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { useDatabase } from "@/db/provider";
import {
  mediaTable,
  watchProgressTable,
  watchlistTable,
  listsTable,
  listItemsTable,
  downloadsTable,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { useCloudSyncStore } from "@/stores/cloud-sync";
import { SyncContext, type SyncPushFunctions } from "@/lib/convex/sync-context";
import type { MediaType } from "@/lib/types";
import type { ReactNode } from "react";

// Debounce timer for watch progress pushes
const PROGRESS_DEBOUNCE_MS = 10_000;

/**
 * Converts null season/episode to -1 sentinel for Convex indexes
 */
function toSentinel(value: number | null | undefined): number {
  return value ?? -1;
}

function fromSentinel(value: number): number | null {
  return value === -1 ? null : value;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export function ConvexSyncEngine({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const { db } = useDatabase();
  const { syncEnabled, isSyncPull, setIsSyncing, setLastSyncAt, setSyncError, setIsSyncPull } =
    useCloudSyncStore();

  const canSync = isAuthenticated && syncEnabled;

  // Convex mutations
  const upsertMedia = useMutation(api.mutations.media.upsertMedia);
  const upsertFavorite = useMutation(api.mutations.favorites.upsertFavorite);
  const deleteFavorite = useMutation(api.mutations.favorites.deleteFavorite);
  const upsertProgress = useMutation(api.mutations.progress.upsertProgress);
  const deleteProgress = useMutation(api.mutations.progress.deleteProgress);
  const upsertWatchlistItem = useMutation(api.mutations.watchlist.upsertWatchlistItem);
  const deleteWatchlistItem = useMutation(api.mutations.watchlist.deleteWatchlistItem);
  const upsertList = useMutation(api.mutations.lists.upsertList);
  const deleteList = useMutation(api.mutations.lists.deleteList);
  const upsertListItem = useMutation(api.mutations.listItems.upsertListItem);
  const deleteListItem = useMutation(api.mutations.listItems.deleteListItem);
  const upsertDownloadMeta = useMutation(api.mutations.downloads.upsertDownloadMeta);
  const deleteDownloadMeta = useMutation(api.mutations.downloads.deleteDownloadMeta);

  // Subscribe to all user data
  const remoteData = useQuery(
    api.queries.syncAll.getAllUserData,
    canSync ? {} : "skip"
  );

  // Debounce ref for progress pushes
  const progressTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Track if we've already applied remote data for this version
  const lastAppliedRef = useRef<string | null>(null);

  // ============================
  // PUSH functions
  // ============================

  const pushMedia: SyncPushFunctions["pushMedia"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      upsertMedia(stripUndefined({
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        title: data.title,
        titleOriginal: data.titleOriginal ?? undefined,
        imdbId: data.imdbId ?? undefined,
        year: data.year ?? undefined,
        score: data.score ?? undefined,
        posterPath: data.posterPath ?? undefined,
        backdropPath: data.backdropPath ?? undefined,
        description: data.description ?? undefined,
        genres: data.genres ?? undefined,
        seasonCount: data.seasonCount ?? undefined,
        episodeCount: data.episodeCount ?? undefined,
        updatedAt: data.updatedAt,
      })).catch((e) => console.warn("[Sync] pushMedia failed:", e));
    },
    [canSync, isSyncPull, upsertMedia]
  );

  const pushFavorite: SyncPushFunctions["pushFavorite"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      upsertFavorite({
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        isFavorite: data.isFavorite,
        updatedAt: data.updatedAt,
      }).catch((e) => console.warn("[Sync] pushFavorite failed:", e));
    },
    [canSync, isSyncPull, upsertFavorite]
  );

  const pushFavoriteDeletion: SyncPushFunctions["pushFavoriteDeletion"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      deleteFavorite({
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        deletedAt: data.deletedAt,
      }).catch((e) => console.warn("[Sync] pushFavoriteDeletion failed:", e));
    },
    [canSync, isSyncPull, deleteFavorite]
  );

  const pushWatchlistItem: SyncPushFunctions["pushWatchlistItem"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      upsertWatchlistItem(stripUndefined({
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        addedAt: data.addedAt ?? undefined,
        updatedAt: data.updatedAt,
      })).catch((e) => console.warn("[Sync] pushWatchlistItem failed:", e));
    },
    [canSync, isSyncPull, upsertWatchlistItem]
  );

  const pushWatchlistDeletion: SyncPushFunctions["pushWatchlistDeletion"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      deleteWatchlistItem({
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        deletedAt: data.deletedAt,
      }).catch((e) => console.warn("[Sync] pushWatchlistDeletion failed:", e));
    },
    [canSync, isSyncPull, deleteWatchlistItem]
  );

  const pushProgress: SyncPushFunctions["pushProgress"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;

      const key = `${data.tmdbId}:${data.mediaType}:${data.seasonNumber}:${data.episodeNumber}`;

      // Clear existing timer for this key
      const existingTimer = progressTimers.current.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // If completed, push immediately
      if (data.completed) {
        progressTimers.current.delete(key);
        upsertProgress({
          tmdbId: data.tmdbId,
          mediaType: data.mediaType,
          seasonNumber: toSentinel(data.seasonNumber),
          episodeNumber: toSentinel(data.episodeNumber),
          position: data.position,
          duration: data.duration,
          completed: data.completed,
          watchedAt: data.watchedAt ?? undefined,
          updatedAt: data.updatedAt,
        }).catch((e) => console.warn("[Sync] pushProgress failed:", e));
        return;
      }

      // Debounce non-completed progress updates
      const timer = setTimeout(() => {
        progressTimers.current.delete(key);
        upsertProgress({
          tmdbId: data.tmdbId,
          mediaType: data.mediaType,
          seasonNumber: toSentinel(data.seasonNumber),
          episodeNumber: toSentinel(data.episodeNumber),
          position: data.position,
          duration: data.duration,
          completed: data.completed,
          watchedAt: data.watchedAt ?? undefined,
          updatedAt: data.updatedAt,
        }).catch((e) => console.warn("[Sync] pushProgress failed:", e));
      }, PROGRESS_DEBOUNCE_MS);

      progressTimers.current.set(key, timer);
    },
    [canSync, isSyncPull, upsertProgress]
  );

  const pushProgressDeletion: SyncPushFunctions["pushProgressDeletion"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      deleteProgress({
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        seasonNumber: toSentinel(data.seasonNumber),
        episodeNumber: toSentinel(data.episodeNumber),
        deletedAt: data.deletedAt,
      }).catch((e) => console.warn("[Sync] pushProgressDeletion failed:", e));
    },
    [canSync, isSyncPull, deleteProgress]
  );

  const pushList: SyncPushFunctions["pushList"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      upsertList(stripUndefined({
        localId: data.localId,
        name: data.name,
        isDefault: data.isDefault,
        createdAt: data.createdAt ?? undefined,
        updatedAt: data.updatedAt,
      })).catch((e) => console.warn("[Sync] pushList failed:", e));
    },
    [canSync, isSyncPull, upsertList]
  );

  const pushListDeletion: SyncPushFunctions["pushListDeletion"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      deleteList({
        localId: data.localId,
        deletedAt: data.deletedAt,
      }).catch((e) => console.warn("[Sync] pushListDeletion failed:", e));
    },
    [canSync, isSyncPull, deleteList]
  );

  const pushListItem: SyncPushFunctions["pushListItem"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      upsertListItem(stripUndefined({
        listLocalId: data.listLocalId,
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        addedAt: data.addedAt ?? undefined,
        updatedAt: data.updatedAt,
      })).catch((e) => console.warn("[Sync] pushListItem failed:", e));
    },
    [canSync, isSyncPull, upsertListItem]
  );

  const pushListItemDeletion: SyncPushFunctions["pushListItemDeletion"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      deleteListItem({
        listLocalId: data.listLocalId,
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        deletedAt: data.deletedAt,
      }).catch((e) => console.warn("[Sync] pushListItemDeletion failed:", e));
    },
    [canSync, isSyncPull, deleteListItem]
  );

  const pushDownloadMeta: SyncPushFunctions["pushDownloadMeta"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      upsertDownloadMeta(stripUndefined({
        localId: data.localId,
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
        seasonNumber: data.seasonNumber ?? undefined,
        episodeNumber: data.episodeNumber ?? undefined,
        title: data.title,
        posterPath: data.posterPath ?? undefined,
        fileName: data.fileName,
        fileSize: data.fileSize ?? undefined,
        quality: data.quality ?? undefined,
        status: data.status,
        streamUrl: data.streamUrl,
        infoHash: data.infoHash ?? undefined,
        duration: data.duration ?? undefined,
        addedAt: data.addedAt ?? undefined,
        completedAt: data.completedAt ?? undefined,
        updatedAt: data.updatedAt,
      })).catch((e) => console.warn("[Sync] pushDownloadMeta failed:", e));
    },
    [canSync, isSyncPull, upsertDownloadMeta]
  );

  const pushDownloadMetaDeletion: SyncPushFunctions["pushDownloadMetaDeletion"] = useCallback(
    (data) => {
      if (!canSync || isSyncPull) return;
      deleteDownloadMeta({
        localId: data.localId,
        deletedAt: data.deletedAt,
      }).catch((e) => console.warn("[Sync] pushDownloadMetaDeletion failed:", e));
    },
    [canSync, isSyncPull, deleteDownloadMeta]
  );

  // ============================
  // PULL: Apply remote changes to local SQLite
  // ============================

  useEffect(() => {
    if (!remoteData || !db || !canSync) return;

    // Simple hash to detect if data changed
    const dataHash = JSON.stringify({
      m: remoteData.media.length,
      f: remoteData.favorites.length,
      p: remoteData.watchProgress.length,
      w: remoteData.watchlist.length,
      l: remoteData.lists.length,
      li: remoteData.listItems.length,
      d: remoteData.downloadsMeta.length,
      del: remoteData.deletions.length,
      // Include last update timestamp from each category
      lastMedia: remoteData.media[0]?._creationTime,
      lastFav: remoteData.favorites[0]?._creationTime,
    });

    if (lastAppliedRef.current === dataHash) return;
    lastAppliedRef.current = dataHash;

    const applyRemoteData = async () => {
      setIsSyncing(true);
      setIsSyncPull(true);

      try {
        // Apply media cache
        for (const media of remoteData.media) {
          const local = await db
            .select()
            .from(mediaTable)
            .where(
              and(
                eq(mediaTable.tmdbId, media.tmdbId),
                eq(mediaTable.mediaType, media.mediaType as MediaType)
              )
            )
            .limit(1);

          if (!local[0] || media.updatedAt > (local[0].updatedAt ?? "")) {
            await db
              .insert(mediaTable)
              .values({
                tmdbId: media.tmdbId,
                mediaType: media.mediaType as MediaType,
                title: media.title,
                titleOriginal: media.titleOriginal,
                imdbId: media.imdbId,
                year: media.year,
                score: media.score,
                posterPath: media.posterPath,
                backdropPath: media.backdropPath,
                description: media.description,
                genres: media.genres,
                seasonCount: media.seasonCount,
                episodeCount: media.episodeCount,
                updatedAt: media.updatedAt,
              })
              .onConflictDoUpdate({
                target: [mediaTable.tmdbId, mediaTable.mediaType],
                set: {
                  title: media.title,
                  titleOriginal: media.titleOriginal,
                  imdbId: media.imdbId,
                  year: media.year,
                  score: media.score,
                  posterPath: media.posterPath,
                  backdropPath: media.backdropPath,
                  description: media.description,
                  genres: media.genres,
                  seasonCount: media.seasonCount,
                  episodeCount: media.episodeCount,
                  updatedAt: media.updatedAt,
                },
              });
          }
        }

        // Apply favorites
        for (const fav of remoteData.favorites) {
          const local = await db
            .select()
            .from(mediaTable)
            .where(
              and(
                eq(mediaTable.tmdbId, fav.tmdbId),
                eq(mediaTable.mediaType, fav.mediaType as MediaType)
              )
            )
            .limit(1);

          if (local[0] && fav.updatedAt > (local[0].updatedAt ?? "")) {
            await db
              .update(mediaTable)
              .set({ isFavorite: fav.isFavorite, updatedAt: fav.updatedAt })
              .where(
                and(
                  eq(mediaTable.tmdbId, fav.tmdbId),
                  eq(mediaTable.mediaType, fav.mediaType as MediaType)
                )
              );
          }
        }

        // Apply watch progress
        for (const prog of remoteData.watchProgress) {
          const seasonNumber = fromSentinel(prog.seasonNumber);
          const episodeNumber = fromSentinel(prog.episodeNumber);

          await db
            .insert(watchProgressTable)
            .values({
              tmdbId: prog.tmdbId,
              mediaType: prog.mediaType as MediaType,
              seasonNumber,
              episodeNumber,
              position: prog.position,
              duration: prog.duration,
              completed: prog.completed,
              watchedAt: prog.watchedAt,
              updatedAt: prog.updatedAt,
            })
            .onConflictDoUpdate({
              target: [
                watchProgressTable.tmdbId,
                watchProgressTable.mediaType,
                watchProgressTable.seasonNumber,
                watchProgressTable.episodeNumber,
              ],
              set: {
                position: prog.position,
                duration: prog.duration,
                completed: prog.completed,
                watchedAt: prog.watchedAt,
                updatedAt: prog.updatedAt,
              },
            });
        }

        // Apply watchlist
        for (const item of remoteData.watchlist) {
          await db
            .insert(watchlistTable)
            .values({
              tmdbId: item.tmdbId,
              mediaType: item.mediaType as MediaType,
              addedAt: item.addedAt,
            })
            .onConflictDoNothing();
        }

        // Apply lists
        for (const list of remoteData.lists) {
          await db
            .insert(listsTable)
            .values({
              id: list.localId,
              name: list.name,
              isDefault: list.isDefault,
              createdAt: list.createdAt,
              updatedAt: list.updatedAt,
            })
            .onConflictDoUpdate({
              target: [listsTable.id],
              set: {
                name: list.name,
                isDefault: list.isDefault,
                updatedAt: list.updatedAt,
              },
            });
        }

        // Apply list items
        for (const item of remoteData.listItems) {
          await db
            .insert(listItemsTable)
            .values({
              listId: item.listLocalId,
              tmdbId: item.tmdbId,
              mediaType: item.mediaType as MediaType,
              addedAt: item.addedAt,
            })
            .onConflictDoNothing();
        }

        // Apply download metadata
        for (const dl of remoteData.downloadsMeta) {
          await db
            .insert(downloadsTable)
            .values({
              id: dl.localId,
              tmdbId: dl.tmdbId,
              mediaType: dl.mediaType as MediaType,
              seasonNumber: dl.seasonNumber,
              episodeNumber: dl.episodeNumber,
              title: dl.title,
              posterPath: dl.posterPath,
              fileName: dl.fileName,
              filePath: "", // Remote downloads don't have local file paths
              fileSize: dl.fileSize,
              quality: dl.quality,
              status: dl.status as any,
              streamUrl: dl.streamUrl,
              infoHash: dl.infoHash,
              duration: dl.duration,
              addedAt: dl.addedAt,
              completedAt: dl.completedAt,
            })
            .onConflictDoNothing();
        }

        // Apply deletions
        for (const deletion of remoteData.deletions) {
          switch (deletion.entityType) {
            case "favorite": {
              const [tmdbIdStr, mediaType] = deletion.entityKey.split(":");
              if (tmdbIdStr && mediaType) {
                await db
                  .update(mediaTable)
                  .set({ isFavorite: false, updatedAt: deletion.deletedAt })
                  .where(
                    and(
                      eq(mediaTable.tmdbId, Number(tmdbIdStr)),
                      eq(mediaTable.mediaType, mediaType as MediaType)
                    )
                  );
              }
              break;
            }
            case "watchlist": {
              const [tmdbIdStr, mediaType] = deletion.entityKey.split(":");
              if (tmdbIdStr && mediaType) {
                await db
                  .delete(watchlistTable)
                  .where(
                    and(
                      eq(watchlistTable.tmdbId, Number(tmdbIdStr)),
                      eq(watchlistTable.mediaType, mediaType as MediaType)
                    )
                  );
              }
              break;
            }
            case "progress": {
              const parts = deletion.entityKey.split(":");
              const [tmdbIdStr, mediaType] = parts;
              if (tmdbIdStr && mediaType) {
                // Build where clause handling null season/episode
                const conditions = [
                  eq(watchProgressTable.tmdbId, Number(tmdbIdStr)),
                  eq(watchProgressTable.mediaType, mediaType as MediaType),
                ];
                await db.delete(watchProgressTable).where(and(...conditions));
              }
              break;
            }
            case "list": {
              await db.delete(listsTable).where(eq(listsTable.id, deletion.entityKey));
              break;
            }
            case "listItem": {
              const [listId, tmdbIdStr, mediaType] = deletion.entityKey.split(":");
              if (listId && tmdbIdStr && mediaType) {
                await db
                  .delete(listItemsTable)
                  .where(
                    and(
                      eq(listItemsTable.listId, listId),
                      eq(listItemsTable.tmdbId, Number(tmdbIdStr)),
                      eq(listItemsTable.mediaType, mediaType as MediaType)
                    )
                  );
              }
              break;
            }
            case "downloadMeta": {
              await db.delete(downloadsTable).where(eq(downloadsTable.id, deletion.entityKey));
              break;
            }
          }
        }

        setLastSyncAt(new Date().toISOString());
        setSyncError(null);
      } catch (error) {
        console.error("[Sync] Failed to apply remote data:", error);
        setSyncError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsSyncing(false);
        setIsSyncPull(false);
      }
    };

    applyRemoteData();
  }, [remoteData, db, canSync, setIsSyncing, setLastSyncAt, setSyncError, setIsSyncPull]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of progressTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const pushFunctions = useMemo<SyncPushFunctions>(
    () => ({
      pushMedia,
      pushFavorite,
      pushFavoriteDeletion,
      pushWatchlistItem,
      pushWatchlistDeletion,
      pushProgress,
      pushProgressDeletion,
      pushList,
      pushListDeletion,
      pushListItem,
      pushListItemDeletion,
      pushDownloadMeta,
      pushDownloadMetaDeletion,
    }),
    [
      pushMedia,
      pushFavorite,
      pushFavoriteDeletion,
      pushWatchlistItem,
      pushWatchlistDeletion,
      pushProgress,
      pushProgressDeletion,
      pushList,
      pushListDeletion,
      pushListItem,
      pushListItemDeletion,
      pushDownloadMeta,
      pushDownloadMetaDeletion,
    ]
  );

  return (
    <SyncContext.Provider value={pushFunctions}>{children}</SyncContext.Provider>
  );
}

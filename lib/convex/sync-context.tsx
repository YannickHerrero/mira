import { createContext, useContext } from "react";
import type { MediaType } from "@/lib/types";

export interface SyncPushFunctions {
  pushMedia: (data: {
    tmdbId: number;
    mediaType: MediaType;
    title: string;
    titleOriginal?: string | null;
    imdbId?: string | null;
    year?: number | null;
    score?: number | null;
    posterPath?: string | null;
    backdropPath?: string | null;
    description?: string | null;
    genres?: string | null;
    seasonCount?: number | null;
    episodeCount?: number | null;
    updatedAt: string;
  }) => void;

  pushFavorite: (data: {
    tmdbId: number;
    mediaType: MediaType;
    isFavorite: boolean;
    updatedAt: string;
  }) => void;

  pushFavoriteDeletion: (data: {
    tmdbId: number;
    mediaType: MediaType;
    deletedAt: string;
  }) => void;

  pushWatchlistItem: (data: {
    tmdbId: number;
    mediaType: MediaType;
    addedAt?: string | null;
    updatedAt: string;
  }) => void;

  pushWatchlistDeletion: (data: {
    tmdbId: number;
    mediaType: MediaType;
    deletedAt: string;
  }) => void;

  pushProgress: (data: {
    tmdbId: number;
    mediaType: MediaType;
    seasonNumber: number | null;
    episodeNumber: number | null;
    position: number;
    duration: number;
    completed: boolean;
    watchedAt?: string | null;
    updatedAt: string;
  }) => void;

  pushProgressDeletion: (data: {
    tmdbId: number;
    mediaType: MediaType;
    seasonNumber: number | null;
    episodeNumber: number | null;
    deletedAt: string;
  }) => void;

  pushList: (data: {
    localId: string;
    name: string;
    isDefault: boolean;
    createdAt?: string | null;
    updatedAt: string;
  }) => void;

  pushListDeletion: (data: {
    localId: string;
    deletedAt: string;
  }) => void;

  pushListItem: (data: {
    listLocalId: string;
    tmdbId: number;
    mediaType: MediaType;
    addedAt?: string | null;
    updatedAt: string;
  }) => void;

  pushListItemDeletion: (data: {
    listLocalId: string;
    tmdbId: number;
    mediaType: MediaType;
    deletedAt: string;
  }) => void;

  pushDownloadMeta: (data: {
    localId: string;
    tmdbId: number;
    mediaType: MediaType;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
    title: string;
    posterPath?: string | null;
    fileName: string;
    fileSize?: number | null;
    quality?: string | null;
    status: string;
    streamUrl: string;
    infoHash?: string | null;
    duration?: number | null;
    addedAt?: string | null;
    completedAt?: string | null;
    updatedAt: string;
  }) => void;

  pushDownloadMetaDeletion: (data: {
    localId: string;
    deletedAt: string;
  }) => void;
}

const noopFn = () => {};

const defaultPush: SyncPushFunctions = {
  pushMedia: noopFn,
  pushFavorite: noopFn,
  pushFavoriteDeletion: noopFn,
  pushWatchlistItem: noopFn,
  pushWatchlistDeletion: noopFn,
  pushProgress: noopFn,
  pushProgressDeletion: noopFn,
  pushList: noopFn,
  pushListDeletion: noopFn,
  pushListItem: noopFn,
  pushListItemDeletion: noopFn,
  pushDownloadMeta: noopFn,
  pushDownloadMetaDeletion: noopFn,
};

export const SyncContext = createContext<SyncPushFunctions>(defaultPush);

export function useSyncPush(): SyncPushFunctions {
  return useContext(SyncContext);
}

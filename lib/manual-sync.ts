import { and, eq, isNull } from "drizzle-orm";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import {
  listItemsTable,
  listsTable,
  mediaTable,
  watchProgressTable,
} from "@/db/schema";
import { getDeviceLanguage } from "@/lib/i18n";
import { favoriteKey, listItemKey, progressKey } from "@/lib/manual-sync-keys";
import {
  getManualSyncDeviceId,
  getManualSyncMetadata,
  setManualSyncSettingsUpdatedAt,
} from "@/lib/manual-sync-metadata";
import { getItem, setItem } from "@/lib/storage";
import type { MediaType } from "@/lib/types";
import type { SupportedLanguage } from "@/lib/i18n";
import type { LanguageOption as SourceLanguageOption, QualityOption } from "@/stores/source-filters";
import type {
  LanguageOption as StreamingLanguageOption,
  SubtitleOption,
} from "@/stores/streaming-preferences";
import { useLanguageStore } from "@/stores/language";
import { useSettingsStore } from "@/stores/settings";
import { useSourceFiltersStore } from "@/stores/source-filters";
import { useStreamingPreferencesStore } from "@/stores/streaming-preferences";

export type ManualSyncDatabase = SQLJsDatabase | ExpoSQLiteDatabase;

export interface ManualSyncPayload {
  schemaVersion: 1;
  exportedAt: string;
  deviceId: string;
  media: SyncMedia[];
  favorites: SyncFavorite[];
  progress: SyncProgress[];
  lists: SyncList[];
  listItems: SyncListItem[];
  settings: SyncSettings;
}

export interface SyncMedia {
  tmdbId: number;
  mediaType: MediaType;
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
}

export interface SyncFavorite {
  tmdbId: number;
  mediaType: MediaType;
  updatedAt: string;
  deletedAt?: string;
}

export interface SyncProgress {
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber: number | null;
  episodeNumber: number | null;
  position: number;
  duration: number;
  completed: boolean;
  watchedAt: string | null;
  updatedAt: string;
  deletedAt?: string;
}

export interface SyncList {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt?: string;
}

export interface SyncListItem {
  listId: string;
  tmdbId: number;
  mediaType: MediaType;
  addedAt: string | null;
  updatedAt: string | null;
  deletedAt?: string;
}

export interface SyncSettings {
  playback: {
    updatedAt: string;
    useVlcPlayer: boolean;
  };
  sourceFilters: {
    updatedAt: string;
    qualities: string[];
    languages: string[];
  };
  streamingPreferences: {
    updatedAt: string;
    preferredAudioLanguages: string[];
    preferredSubtitleLanguages: string[];
  };
  language: {
    updatedAt: string;
    language: string;
  };
  theme: {
    updatedAt: string;
    theme: string | null;
  };
}

const SCHEMA_VERSION = 1 as const;

export async function buildManualSyncPayload(
  db: ManualSyncDatabase
): Promise<ManualSyncPayload> {
  const exportedAt = new Date().toISOString();
  const metadata = getManualSyncMetadata();
  const deviceId = getManualSyncDeviceId();

  const [mediaRecords, progressRecords, listRecords, listItemRecords] =
    await Promise.all([
      db.select().from(mediaTable),
      db.select().from(watchProgressTable),
      db.select().from(listsTable),
      db.select().from(listItemsTable),
    ]);

  const favoriteRecords = mediaRecords.filter((media) => media.isFavorite);
  const referencedMediaKeys = new Set<string>();

  for (const favorite of favoriteRecords) {
    referencedMediaKeys.add(favoriteKey(favorite.tmdbId, favorite.mediaType));
  }

  for (const item of listItemRecords) {
    referencedMediaKeys.add(favoriteKey(item.tmdbId, item.mediaType));
  }

  for (const progress of progressRecords) {
    referencedMediaKeys.add(favoriteKey(progress.tmdbId, progress.mediaType));
  }

  const media = mediaRecords
    .filter((record) => referencedMediaKeys.has(favoriteKey(record.tmdbId, record.mediaType)))
    .map<SyncMedia>((record) => ({
      tmdbId: record.tmdbId,
      mediaType: record.mediaType,
      title: record.title,
      titleOriginal: record.titleOriginal ?? null,
      imdbId: record.imdbId ?? null,
      year: record.year ?? null,
      score: record.score ?? null,
      posterPath: record.posterPath ?? null,
      backdropPath: record.backdropPath ?? null,
      description: record.description ?? null,
      genres: record.genres ?? null,
      seasonCount: record.seasonCount ?? null,
      episodeCount: record.episodeCount ?? null,
    }));

  const favorites = favoriteRecords.map<SyncFavorite>((record) => ({
    tmdbId: record.tmdbId,
    mediaType: record.mediaType,
    updatedAt: record.updatedAt ?? record.addedAt ?? exportedAt,
  }));

  const progress = progressRecords.map<SyncProgress>((record) => ({
    tmdbId: record.tmdbId,
    mediaType: record.mediaType,
    seasonNumber: record.seasonNumber ?? null,
    episodeNumber: record.episodeNumber ?? null,
    position: record.position,
    duration: record.duration,
    completed: record.completed ?? false,
    watchedAt: record.watchedAt ?? null,
    updatedAt: record.updatedAt ?? exportedAt,
  }));

  const lists = listRecords.map<SyncList>((record) => ({
    id: record.id,
    name: record.name,
    isDefault: record.isDefault ?? false,
    createdAt: record.createdAt ?? null,
    updatedAt: record.updatedAt ?? null,
  }));

  const listItems = listItemRecords.map<SyncListItem>((record) => ({
    listId: record.listId,
    tmdbId: record.tmdbId,
    mediaType: record.mediaType,
    addedAt: record.addedAt ?? null,
    updatedAt: record.addedAt ?? null,
  }));

  const deletedFavorites = Object.entries(metadata.favoritesDeleted).map(
    ([key, deletedAt]) => {
      const [tmdbId, mediaType] = key.split(":");
      return {
        tmdbId: Number(tmdbId),
        mediaType: mediaType as MediaType,
        updatedAt: deletedAt,
        deletedAt,
      } satisfies SyncFavorite;
    }
  );

  const deletedProgress = Object.entries(metadata.progressDeleted).map(
    ([key, deletedAt]) => {
      const [tmdbId, mediaType, seasonNumber, episodeNumber] = key.split(":");
      return {
        tmdbId: Number(tmdbId),
        mediaType: mediaType as MediaType,
        seasonNumber: seasonNumber ? Number(seasonNumber) : null,
        episodeNumber: episodeNumber ? Number(episodeNumber) : null,
        position: 0,
        duration: 0,
        completed: false,
        watchedAt: null,
        updatedAt: deletedAt,
        deletedAt,
      } satisfies SyncProgress;
    }
  );

  const deletedLists = Object.entries(metadata.listsDeleted).map(
    ([id, deletedAt]) => ({
      id,
      name: "",
      isDefault: false,
      createdAt: null,
      updatedAt: null,
      deletedAt,
    })
  );

  const deletedListItems = Object.entries(metadata.listItemsDeleted).map(
    ([key, deletedAt]) => {
      const [listId, tmdbId, mediaType] = key.split(":");
      return {
        listId,
        tmdbId: Number(tmdbId),
        mediaType: mediaType as MediaType,
        addedAt: null,
        updatedAt: null,
        deletedAt,
      } satisfies SyncListItem;
    }
  );

  const settingsStore = useSettingsStore.getState();
  const sourceFiltersStore = useSourceFiltersStore.getState();
  const streamingPreferencesStore = useStreamingPreferencesStore.getState();
  const languageStore = useLanguageStore.getState();
  const theme = getItem<string>("theme");

  const settings: SyncSettings = {
    playback: {
      updatedAt: metadata.settingsUpdatedAt.settings ?? exportedAt,
      useVlcPlayer: settingsStore.useVlcPlayer,
    },
    sourceFilters: {
      updatedAt: metadata.settingsUpdatedAt.sourceFilters ?? exportedAt,
      qualities: sourceFiltersStore.qualities,
      languages: sourceFiltersStore.languages,
    },
    streamingPreferences: {
      updatedAt: metadata.settingsUpdatedAt.streamingPreferences ?? exportedAt,
      preferredAudioLanguages: streamingPreferencesStore.preferredAudioLanguages,
      preferredSubtitleLanguages: streamingPreferencesStore.preferredSubtitleLanguages,
    },
    language: {
      updatedAt: metadata.settingsUpdatedAt.language ?? exportedAt,
      language: languageStore.language,
    },
    theme: {
      updatedAt: metadata.settingsUpdatedAt.theme ?? exportedAt,
      theme: theme ?? null,
    },
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    deviceId,
    media,
    favorites: [...favorites, ...deletedFavorites],
    progress: [...progress, ...deletedProgress],
    lists: [...lists, ...deletedLists],
    listItems: [...listItems, ...deletedListItems],
    settings,
  };
}

export async function applyManualSyncPayload(
  db: ManualSyncDatabase,
  payload: ManualSyncPayload
) {
  if (payload.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Unsupported sync file version");
  }

  if (payload.media.length > 0) {
    for (const media of payload.media) {
      await db
        .insert(mediaTable)
        .values({
          tmdbId: media.tmdbId,
          mediaType: media.mediaType,
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
          },
        });
    }
  }

  const [localLists, localListItems, localProgress, localFavorites] =
    await Promise.all([
      db.select().from(listsTable),
      db.select().from(listItemsTable),
      db.select().from(watchProgressTable),
      db.select().from(mediaTable).where(eq(mediaTable.isFavorite, true)),
    ]);

  const listMap = new Map(localLists.map((list) => [list.id, list]));
  const listNameMap = new Map(
    localLists.map((list) => [normalizeListName(list.name), list])
  );
  const listIdMap = new Map<string, string>();
  const listItemMap = new Map(
    localListItems.map((item) => [listItemKey(item.listId, item.tmdbId, item.mediaType), item])
  );
  const progressMap = new Map(
    localProgress.map((item) => [
      progressKey(item.tmdbId, item.mediaType, item.seasonNumber, item.episodeNumber),
      item,
    ])
  );
  const favoriteMap = new Map(
    localFavorites.map((item) => [favoriteKey(item.tmdbId, item.mediaType), item])
  );

  for (const list of payload.lists) {
    const normalizedName = normalizeListName(list.name);
    const nameMatch = normalizedName ? listNameMap.get(normalizedName) : undefined;
    const targetId = nameMatch?.id ?? list.id;
    const local = listMap.get(targetId) ?? nameMatch;
    const localUpdatedAt = local?.updatedAt ?? local?.createdAt ?? null;
    const remoteTimestamp = list.deletedAt ?? list.updatedAt ?? list.createdAt ?? null;

    listIdMap.set(list.id, targetId);

    if (list.deletedAt) {
      if (isRemoteNewer(localUpdatedAt, remoteTimestamp)) {
        await db.delete(listsTable).where(eq(listsTable.id, targetId));
      }
      continue;
    }

    if (!local || isRemoteNewer(localUpdatedAt, remoteTimestamp)) {
      const resolvedDefault = local?.isDefault ?? list.isDefault;
      await db
        .insert(listsTable)
        .values({
          id: targetId,
          name: list.name,
          isDefault: resolvedDefault,
          createdAt: list.createdAt ?? local?.createdAt ?? null,
          updatedAt: list.updatedAt ?? null,
        })
        .onConflictDoUpdate({
          target: [listsTable.id],
          set: {
            name: list.name,
            isDefault: resolvedDefault,
            createdAt: list.createdAt ?? local?.createdAt ?? null,
            updatedAt: list.updatedAt ?? null,
          },
        });
    }
  }

  const mergedLists = await db.select().from(listsTable);
  const mergedListIds = new Set(mergedLists.map((list) => list.id));

  for (const item of payload.listItems) {
    const resolvedListId = listIdMap.get(item.listId) ?? item.listId;
    if (!mergedListIds.has(resolvedListId)) {
      continue;
    }

    const key = listItemKey(resolvedListId, item.tmdbId, item.mediaType);
    const local = listItemMap.get(key);
    const localUpdatedAt = local?.addedAt ?? null;
    const remoteTimestamp = item.deletedAt ?? item.updatedAt ?? item.addedAt ?? null;

    if (item.deletedAt) {
      if (isRemoteNewer(localUpdatedAt, remoteTimestamp)) {
        await db
          .delete(listItemsTable)
          .where(
            and(
              eq(listItemsTable.listId, resolvedListId),
              eq(listItemsTable.tmdbId, item.tmdbId),
              eq(listItemsTable.mediaType, item.mediaType)
            )
          );
      }
      continue;
    }

    if (!local || isRemoteNewer(localUpdatedAt, remoteTimestamp)) {
      await db
        .insert(listItemsTable)
        .values({
          listId: resolvedListId,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          addedAt: item.addedAt ?? null,
        })
        .onConflictDoUpdate({
          target: [listItemsTable.listId, listItemsTable.tmdbId, listItemsTable.mediaType],
          set: {
            addedAt: item.addedAt ?? null,
          },
        });
    }
  }

  for (const favorite of payload.favorites) {
    const key = favoriteKey(favorite.tmdbId, favorite.mediaType);
    const local = favoriteMap.get(key);
    const localUpdatedAt = local?.updatedAt ?? local?.addedAt ?? null;
    const remoteTimestamp = favorite.deletedAt ?? favorite.updatedAt;

    if (favorite.deletedAt) {
      if (isRemoteNewer(localUpdatedAt, remoteTimestamp)) {
        await db
          .update(mediaTable)
          .set({
            isFavorite: false,
            updatedAt: favorite.deletedAt,
          })
          .where(
            and(
              eq(mediaTable.tmdbId, favorite.tmdbId),
              eq(mediaTable.mediaType, favorite.mediaType)
            )
          );
      }
      continue;
    }

    if (!local || isRemoteNewer(localUpdatedAt, remoteTimestamp)) {
      await db
        .update(mediaTable)
        .set({
          isFavorite: true,
          updatedAt: favorite.updatedAt,
        })
        .where(
          and(
            eq(mediaTable.tmdbId, favorite.tmdbId),
            eq(mediaTable.mediaType, favorite.mediaType)
          )
        );
    }
  }

  for (const progress of payload.progress) {
    const key = progressKey(
      progress.tmdbId,
      progress.mediaType,
      progress.seasonNumber,
      progress.episodeNumber
    );
    const local = progressMap.get(key);
    const localUpdatedAt = local?.updatedAt ?? null;
    const remoteTimestamp = progress.deletedAt ?? progress.updatedAt;

    if (progress.deletedAt) {
      if (isRemoteNewer(localUpdatedAt, remoteTimestamp)) {
        await db.delete(watchProgressTable).where(buildProgressWhere(progress));
      }
      continue;
    }

    if (!local || isRemoteNewer(localUpdatedAt, remoteTimestamp)) {
      await db
        .insert(watchProgressTable)
        .values({
          tmdbId: progress.tmdbId,
          mediaType: progress.mediaType,
          seasonNumber: progress.seasonNumber,
          episodeNumber: progress.episodeNumber,
          position: progress.position,
          duration: progress.duration,
          completed: progress.completed,
          watchedAt: progress.watchedAt,
          updatedAt: progress.updatedAt,
        })
        .onConflictDoUpdate({
          target: [
            watchProgressTable.tmdbId,
            watchProgressTable.mediaType,
            watchProgressTable.seasonNumber,
            watchProgressTable.episodeNumber,
          ],
          set: {
            position: progress.position,
            duration: progress.duration,
            completed: progress.completed,
            watchedAt: progress.watchedAt,
            updatedAt: progress.updatedAt,
          },
        });
    }
  }

  const metadata = getManualSyncMetadata();

  if (isRemoteNewer(metadata.settingsUpdatedAt.settings, payload.settings.playback.updatedAt)) {
    useSettingsStore.setState({ useVlcPlayer: payload.settings.playback.useVlcPlayer });
    setManualSyncSettingsUpdatedAt("settings", payload.settings.playback.updatedAt);
  }

  if (
    isRemoteNewer(
      metadata.settingsUpdatedAt.sourceFilters,
      payload.settings.sourceFilters.updatedAt
    )
  ) {
    useSourceFiltersStore.setState({
      qualities: payload.settings.sourceFilters.qualities as QualityOption[],
      languages: payload.settings.sourceFilters.languages as SourceLanguageOption[],
    });
    setManualSyncSettingsUpdatedAt(
      "sourceFilters",
      payload.settings.sourceFilters.updatedAt
    );
  }

  if (
    isRemoteNewer(
      metadata.settingsUpdatedAt.streamingPreferences,
      payload.settings.streamingPreferences.updatedAt
    )
  ) {
    useStreamingPreferencesStore.setState({
      preferredAudioLanguages:
        payload.settings.streamingPreferences.preferredAudioLanguages as StreamingLanguageOption[],
      preferredSubtitleLanguages:
        payload.settings.streamingPreferences.preferredSubtitleLanguages as SubtitleOption[],
    });
    setManualSyncSettingsUpdatedAt(
      "streamingPreferences",
      payload.settings.streamingPreferences.updatedAt
    );
  }

  if (isRemoteNewer(metadata.settingsUpdatedAt.language, payload.settings.language.updatedAt)) {
    const language = payload.settings.language.language as SupportedLanguage | "system";
    const resolvedLanguage = language === "system" ? getDeviceLanguage() : language;
    useLanguageStore.setState({
      language,
      resolvedLanguage,
    });
    setManualSyncSettingsUpdatedAt("language", payload.settings.language.updatedAt);
  }

  if (isRemoteNewer(metadata.settingsUpdatedAt.theme, payload.settings.theme.updatedAt)) {
    if (payload.settings.theme.theme) {
      setItem("theme", payload.settings.theme.theme);
    }
    setManualSyncSettingsUpdatedAt("theme", payload.settings.theme.updatedAt);
  }
}

function isRemoteNewer(
  localTimestamp: string | null | undefined,
  remoteTimestamp: string | null | undefined
) {
  if (!remoteTimestamp) {
    return false;
  }
  if (!localTimestamp) {
    return true;
  }
  return remoteTimestamp > localTimestamp;
}

function normalizeListName(name: string) {
  return name.trim().toLowerCase();
}

function buildProgressWhere(progress: SyncProgress) {
  const conditions = [
    eq(watchProgressTable.tmdbId, progress.tmdbId),
    eq(watchProgressTable.mediaType, progress.mediaType),
  ];

  if (progress.seasonNumber == null) {
    conditions.push(isNull(watchProgressTable.seasonNumber));
  } else {
    conditions.push(eq(watchProgressTable.seasonNumber, progress.seasonNumber));
  }

  if (progress.episodeNumber == null) {
    conditions.push(isNull(watchProgressTable.episodeNumber));
  } else {
    conditions.push(eq(watchProgressTable.episodeNumber, progress.episodeNumber));
  }

  return and(...conditions);
}

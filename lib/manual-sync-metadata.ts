import { createId } from "@paralleldrive/cuid2";
import { storage } from "@/lib/storage";

const METADATA_KEY = "manual_sync_metadata";

export type ManualSyncDeletionType =
  | "favorites"
  | "progress"
  | "listItems"
  | "lists";

export type ManualSyncSettingsType =
  | "settings"
  | "sourceFilters"
  | "streamingPreferences"
  | "language"
  | "theme";

export interface ManualSyncMetadata {
  deviceId: string;
  favoritesDeleted: Record<string, string>;
  progressDeleted: Record<string, string>;
  listItemsDeleted: Record<string, string>;
  listsDeleted: Record<string, string>;
  settingsUpdatedAt: Record<ManualSyncSettingsType, string | undefined>;
}

function buildDefaultMetadata(): ManualSyncMetadata {
  return {
    deviceId: createId(),
    favoritesDeleted: {},
    progressDeleted: {},
    listItemsDeleted: {},
    listsDeleted: {},
    settingsUpdatedAt: {
      settings: undefined,
      sourceFilters: undefined,
      streamingPreferences: undefined,
      language: undefined,
      theme: undefined,
    },
  };
}

export function getManualSyncMetadata(): ManualSyncMetadata {
  const raw = storage.getString(METADATA_KEY);
  if (!raw) {
    const fresh = buildDefaultMetadata();
    storage.set(METADATA_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw) as ManualSyncMetadata;
    return {
      ...buildDefaultMetadata(),
      ...parsed,
      favoritesDeleted: parsed.favoritesDeleted ?? {},
      progressDeleted: parsed.progressDeleted ?? {},
      listItemsDeleted: parsed.listItemsDeleted ?? {},
      listsDeleted: parsed.listsDeleted ?? {},
      settingsUpdatedAt: {
        ...buildDefaultMetadata().settingsUpdatedAt,
        ...parsed.settingsUpdatedAt,
      },
    };
  } catch {
    const fresh = buildDefaultMetadata();
    storage.set(METADATA_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

function saveManualSyncMetadata(metadata: ManualSyncMetadata) {
  storage.set(METADATA_KEY, JSON.stringify(metadata));
}

export function getManualSyncDeviceId() {
  return getManualSyncMetadata().deviceId;
}

export function markManualSyncDeletion(
  type: ManualSyncDeletionType,
  key: string,
  deletedAt = new Date().toISOString()
) {
  const metadata = getManualSyncMetadata();
  const map = getDeletionMap(metadata, type);
  map[key] = deletedAt;
  saveManualSyncMetadata(metadata);
}

export function clearManualSyncDeletion(type: ManualSyncDeletionType, key: string) {
  const metadata = getManualSyncMetadata();
  const map = getDeletionMap(metadata, type);
  if (map[key]) {
    delete map[key];
    saveManualSyncMetadata(metadata);
  }
}

export function markManualSyncSettingsUpdated(
  key: ManualSyncSettingsType,
  updatedAt = new Date().toISOString()
) {
  const metadata = getManualSyncMetadata();
  metadata.settingsUpdatedAt[key] = updatedAt;
  saveManualSyncMetadata(metadata);
}

export function setManualSyncSettingsUpdatedAt(
  key: ManualSyncSettingsType,
  updatedAt: string
) {
  const metadata = getManualSyncMetadata();
  metadata.settingsUpdatedAt[key] = updatedAt;
  saveManualSyncMetadata(metadata);
}

function getDeletionMap(metadata: ManualSyncMetadata, type: ManualSyncDeletionType) {
  switch (type) {
    case "favorites":
      return metadata.favoritesDeleted;
    case "progress":
      return metadata.progressDeleted;
    case "listItems":
      return metadata.listItemsDeleted;
    case "lists":
      return metadata.listsDeleted;
  }
}

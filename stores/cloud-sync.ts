import { create } from "zustand";
import { storage } from "@/lib/storage";

const STORAGE_KEY = "cloud_sync_settings";

interface CloudSyncSettings {
  syncEnabled: boolean;
  email: string | null;
}

interface CloudSyncStore extends CloudSyncSettings {
  isLoading: boolean;
  /** True while actively pulling/pushing */
  isSyncing: boolean;
  /** Last successful sync timestamp */
  lastSyncAt: string | null;
  /** Error message from last sync attempt */
  syncError: string | null;
  /** Flag to prevent push-back of pulled changes */
  isSyncPull: boolean;

  loadSettings: () => void;
  setSyncEnabled: (value: boolean) => void;
  setEmail: (email: string | null) => void;
  setIsSyncing: (value: boolean) => void;
  setLastSyncAt: (value: string) => void;
  setSyncError: (error: string | null) => void;
  setIsSyncPull: (value: boolean) => void;
}

const DEFAULT_SETTINGS: CloudSyncSettings = {
  syncEnabled: true,
  email: null,
};

function saveSettings(settings: CloudSyncSettings) {
  storage.set(STORAGE_KEY, JSON.stringify(settings));
}

function loadSettingsFromStorage(): CloudSyncSettings {
  try {
    const value = storage.getString(STORAGE_KEY);
    if (value) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(value) };
    }
  } catch (error) {
    console.error("Error loading cloud sync settings:", error);
  }
  return DEFAULT_SETTINGS;
}

export const useCloudSyncStore = create<CloudSyncStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: true,
  isSyncing: false,
  lastSyncAt: null,
  syncError: null,
  isSyncPull: false,

  loadSettings: () => {
    const settings = loadSettingsFromStorage();
    set({ ...settings, isLoading: false });
  },

  setSyncEnabled: (value: boolean) => {
    set({ syncEnabled: value });
    const { syncEnabled, email } = get();
    saveSettings({ syncEnabled, email });
  },

  setEmail: (email: string | null) => {
    set({ email });
    const { syncEnabled } = get();
    saveSettings({ syncEnabled, email });
  },

  setIsSyncing: (value: boolean) => set({ isSyncing: value }),
  setLastSyncAt: (value: string) => set({ lastSyncAt: value }),
  setSyncError: (error: string | null) => set({ syncError: error }),
  setIsSyncPull: (value: boolean) => set({ isSyncPull: value }),
}));

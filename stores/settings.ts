import { create } from "zustand";
import { markManualSyncSettingsUpdated } from "@/lib/manual-sync-metadata";
import { storage } from "@/lib/storage";

const STORAGE_KEY = "app_settings";

interface AppSettings {
  useVlcPlayer: boolean;
  enableAnilistSync: boolean;
}

interface SettingsStore extends AppSettings {
  isLoading: boolean;
  loadSettings: () => void;
  setUseVlcPlayer: (value: boolean) => void;
  setAnilistSyncEnabled: (value: boolean) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  useVlcPlayer: false,
  enableAnilistSync: false,
};

function saveSettings(settings: AppSettings) {
  storage.set(STORAGE_KEY, JSON.stringify(settings));
}

function loadSettingsFromStorage(): AppSettings {
  try {
    const value = storage.getString(STORAGE_KEY);
    if (value) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(value) };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return DEFAULT_SETTINGS;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: true,

  loadSettings: () => {
    const settings = loadSettingsFromStorage();
    set({ ...settings, isLoading: false });
  },

  setUseVlcPlayer: (value: boolean) => {
    set({ useVlcPlayer: value });
    const { useVlcPlayer, enableAnilistSync } = get();
    saveSettings({ useVlcPlayer, enableAnilistSync });
    markManualSyncSettingsUpdated("settings");
  },

  setAnilistSyncEnabled: (value: boolean) => {
    set({ enableAnilistSync: value });
    const { useVlcPlayer, enableAnilistSync } = get();
    saveSettings({ useVlcPlayer, enableAnilistSync });
    markManualSyncSettingsUpdated("settings");
  },
}));

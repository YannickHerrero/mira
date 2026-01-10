import { create } from "zustand";
import { storage } from "@/lib/storage";
import { getDeviceLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n";

const STORAGE_KEY = "app_language";

interface LanguageSettings {
  language: SupportedLanguage | "system";
}

interface LanguageStore extends LanguageSettings {
  isLoading: boolean;
  resolvedLanguage: SupportedLanguage;
  loadLanguage: () => void;
  setLanguage: (language: SupportedLanguage | "system") => void;
}

const DEFAULT_SETTINGS: LanguageSettings = {
  language: "system",
};

function saveLanguage(settings: LanguageSettings) {
  storage.set(STORAGE_KEY, JSON.stringify(settings));
}

function loadLanguageFromStorage(): LanguageSettings {
  try {
    const value = storage.getString(STORAGE_KEY);
    if (value) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(value) };
    }
  } catch (error) {
    console.error("[Language] Error loading language:", error);
  }
  return DEFAULT_SETTINGS;
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoading: true,
  resolvedLanguage: getDeviceLanguage(),

  loadLanguage: () => {
    const settings = loadLanguageFromStorage();
    const resolvedLanguage =
      settings.language === "system" ? getDeviceLanguage() : settings.language;

    set({
      ...settings,
      resolvedLanguage,
      isLoading: false,
    });
  },

  setLanguage: (language: SupportedLanguage | "system") => {
    const resolvedLanguage =
      language === "system" ? getDeviceLanguage() : language;

    set({ language, resolvedLanguage });
    saveLanguage({ language });
  },
}));

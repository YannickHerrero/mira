import { create } from "zustand";
import { storage } from "@/lib/storage";

const STORAGE_KEY = "streaming_preferences";

// Available language options for audio/subtitle preferences
// Using the same list as source-filters for consistency
export const LANGUAGE_OPTIONS = [
  "English",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Portuguese",
  "Russian",
  "Japanese",
  "Korean",
  "Chinese",
  "Hindi",
  "Arabic",
  "Dutch",
  "Polish",
  "Turkish",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Greek",
  "Hebrew",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Filipino",
] as const;

export type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];

// Special option for subtitles to indicate "disable if no match"
export const SUBTITLE_OFF_OPTION = "Off" as const;
export type SubtitleOption = LanguageOption | typeof SUBTITLE_OFF_OPTION;

export interface StreamingPreferencesSettings {
  // Ordered array of preferred audio languages (first = highest priority)
  // Empty array means "no preference, use default"
  preferredAudioLanguages: LanguageOption[];
  // Ordered array of preferred subtitle languages (first = highest priority)
  // Can include "Off" to disable subtitles if no match found
  // Empty array means "no preference, use default"
  preferredSubtitleLanguages: SubtitleOption[];
}

interface StreamingPreferencesStore extends StreamingPreferencesSettings {
  isLoading: boolean;
  loadPreferences: () => void;
  setPreferredAudioLanguages: (languages: LanguageOption[]) => void;
  setPreferredSubtitleLanguages: (languages: SubtitleOption[]) => void;
  // Helper methods for reordering
  moveAudioLanguage: (fromIndex: number, toIndex: number) => void;
  moveSubtitleLanguage: (fromIndex: number, toIndex: number) => void;
  addAudioLanguage: (language: LanguageOption) => void;
  addSubtitleLanguage: (language: SubtitleOption) => void;
  removeAudioLanguage: (language: LanguageOption) => void;
  removeSubtitleLanguage: (language: SubtitleOption) => void;
  resetPreferences: () => void;
}

const DEFAULT_PREFERENCES: StreamingPreferencesSettings = {
  preferredAudioLanguages: [],
  preferredSubtitleLanguages: [],
};

function savePreferences(preferences: StreamingPreferencesSettings) {
  storage.set(STORAGE_KEY, JSON.stringify(preferences));
}

function loadPreferencesFromStorage(): StreamingPreferencesSettings {
  try {
    const value = storage.getString(STORAGE_KEY);
    if (value) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(value) };
    }
  } catch (error) {
    console.error("[StreamingPreferences] Error loading preferences:", error);
  }
  return DEFAULT_PREFERENCES;
}

export const useStreamingPreferencesStore = create<StreamingPreferencesStore>(
  (set, get) => ({
    ...DEFAULT_PREFERENCES,
    isLoading: true,

    loadPreferences: () => {
      const preferences = loadPreferencesFromStorage();
      set({ ...preferences, isLoading: false });
    },

    setPreferredAudioLanguages: (languages: LanguageOption[]) => {
      set({ preferredAudioLanguages: languages });
      const { preferredSubtitleLanguages } = get();
      savePreferences({
        preferredAudioLanguages: languages,
        preferredSubtitleLanguages,
      });
    },

    setPreferredSubtitleLanguages: (languages: SubtitleOption[]) => {
      set({ preferredSubtitleLanguages: languages });
      const { preferredAudioLanguages } = get();
      savePreferences({
        preferredAudioLanguages,
        preferredSubtitleLanguages: languages,
      });
    },

    moveAudioLanguage: (fromIndex: number, toIndex: number) => {
      const { preferredAudioLanguages, preferredSubtitleLanguages } = get();
      const newLanguages = [...preferredAudioLanguages];
      const [removed] = newLanguages.splice(fromIndex, 1);
      newLanguages.splice(toIndex, 0, removed);
      set({ preferredAudioLanguages: newLanguages });
      savePreferences({
        preferredAudioLanguages: newLanguages,
        preferredSubtitleLanguages,
      });
    },

    moveSubtitleLanguage: (fromIndex: number, toIndex: number) => {
      const { preferredAudioLanguages, preferredSubtitleLanguages } = get();
      const newLanguages = [...preferredSubtitleLanguages];
      const [removed] = newLanguages.splice(fromIndex, 1);
      newLanguages.splice(toIndex, 0, removed);
      set({ preferredSubtitleLanguages: newLanguages });
      savePreferences({
        preferredAudioLanguages,
        preferredSubtitleLanguages: newLanguages,
      });
    },

    addAudioLanguage: (language: LanguageOption) => {
      const { preferredAudioLanguages, preferredSubtitleLanguages } = get();
      if (!preferredAudioLanguages.includes(language)) {
        const newLanguages = [...preferredAudioLanguages, language];
        set({ preferredAudioLanguages: newLanguages });
        savePreferences({
          preferredAudioLanguages: newLanguages,
          preferredSubtitleLanguages,
        });
      }
    },

    addSubtitleLanguage: (language: SubtitleOption) => {
      const { preferredAudioLanguages, preferredSubtitleLanguages } = get();
      if (!preferredSubtitleLanguages.includes(language)) {
        const newLanguages = [...preferredSubtitleLanguages, language];
        set({ preferredSubtitleLanguages: newLanguages });
        savePreferences({
          preferredAudioLanguages,
          preferredSubtitleLanguages: newLanguages,
        });
      }
    },

    removeAudioLanguage: (language: LanguageOption) => {
      const { preferredAudioLanguages, preferredSubtitleLanguages } = get();
      const newLanguages = preferredAudioLanguages.filter((l) => l !== language);
      set({ preferredAudioLanguages: newLanguages });
      savePreferences({
        preferredAudioLanguages: newLanguages,
        preferredSubtitleLanguages,
      });
    },

    removeSubtitleLanguage: (language: SubtitleOption) => {
      const { preferredAudioLanguages, preferredSubtitleLanguages } = get();
      const newLanguages = preferredSubtitleLanguages.filter(
        (l) => l !== language
      );
      set({ preferredSubtitleLanguages: newLanguages });
      savePreferences({
        preferredAudioLanguages,
        preferredSubtitleLanguages: newLanguages,
      });
    },

    resetPreferences: () => {
      set({ ...DEFAULT_PREFERENCES });
      savePreferences(DEFAULT_PREFERENCES);
    },
  })
);

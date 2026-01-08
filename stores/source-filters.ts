import { create } from "zustand";
import { storage } from "@/lib/storage";

const STORAGE_KEY = "source_filters";

// Available quality options
export const QUALITY_OPTIONS = ["2160p", "1080p", "720p", "480p"] as const;
export type QualityOption = (typeof QUALITY_OPTIONS)[number];

// Common language options (based on Torrentio's FLAG_TO_LANGUAGE mapping)
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

export interface SourceFilterSettings {
  // Quality filter - empty array means "all"
  qualities: QualityOption[];
  // Language filter - empty array means "all"
  languages: LanguageOption[];
}

interface SourceFiltersStore extends SourceFilterSettings {
  isLoading: boolean;
  loadFilters: () => void;
  setQualities: (qualities: QualityOption[]) => void;
  setLanguages: (languages: LanguageOption[]) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: SourceFilterSettings = {
  qualities: [],
  languages: [],
};

function saveFilters(filters: SourceFilterSettings) {
  storage.set(STORAGE_KEY, JSON.stringify(filters));
}

function loadFiltersFromStorage(): SourceFilterSettings {
  try {
    const value = storage.getString(STORAGE_KEY);
    if (value) {
      return { ...DEFAULT_FILTERS, ...JSON.parse(value) };
    }
  } catch (error) {
    console.error("[SourceFilters] Error loading filters:", error);
  }
  return DEFAULT_FILTERS;
}

export const useSourceFiltersStore = create<SourceFiltersStore>((set, get) => ({
  ...DEFAULT_FILTERS,
  isLoading: true,

  loadFilters: () => {
    const filters = loadFiltersFromStorage();
    set({ ...filters, isLoading: false });
  },

  setQualities: (qualities: QualityOption[]) => {
    set({ qualities });
    const { languages } = get();
    saveFilters({ qualities, languages });
  },

  setLanguages: (languages: LanguageOption[]) => {
    set({ languages });
    const { qualities } = get();
    saveFilters({ qualities, languages });
  },

  resetFilters: () => {
    set({ ...DEFAULT_FILTERS });
    saveFilters(DEFAULT_FILTERS);
  },
}));

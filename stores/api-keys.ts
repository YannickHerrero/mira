import { create } from "zustand";
import {
  getTmdbApiKey,
  setTmdbApiKey,
  getRealDebridApiKey,
  setRealDebridApiKey,
} from "@/lib/secure-storage";
import { createTMDBClient } from "@/lib/api/tmdb";
import { createRealDebridClient } from "@/lib/api/realdebrid";

interface ApiKeyState {
  // Keys
  tmdbApiKey: string | null;
  realDebridApiKey: string | null;

  // Validation status
  tmdbValid: boolean | null;
  realDebridValid: boolean | null;
  realDebridPremium: boolean | null;
  realDebridUsername: string | null;

  // Loading states
  isLoading: boolean;
  isValidating: boolean;

  // Actions
  loadKeys: () => Promise<void>;
  setTmdbKey: (key: string) => Promise<boolean>;
  setRealDebridKey: (key: string) => Promise<{ valid: boolean; isPremium?: boolean; username?: string }>;
  validateTmdbKey: (key: string) => Promise<boolean>;
  validateRealDebridKey: (key: string) => Promise<{ valid: boolean; isPremium?: boolean; username?: string }>;

  // Computed
  isConfigured: () => boolean;
}

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  // Initial state
  tmdbApiKey: null,
  realDebridApiKey: null,
  tmdbValid: null,
  realDebridValid: null,
  realDebridPremium: null,
  realDebridUsername: null,
  isLoading: true,
  isValidating: false,

  // Load keys from secure storage
  loadKeys: async () => {
    set({ isLoading: true });
    try {
      const [tmdbKey, rdKey] = await Promise.all([
        getTmdbApiKey(),
        getRealDebridApiKey(),
      ]);

      set({
        tmdbApiKey: tmdbKey,
        realDebridApiKey: rdKey,
        // If keys exist, assume they're valid (they were validated when saved)
        tmdbValid: tmdbKey ? true : null,
        realDebridValid: rdKey ? true : null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  // Validate TMDB key
  validateTmdbKey: async (key: string) => {
    if (!key.trim()) return false;

    set({ isValidating: true });
    try {
      const client = createTMDBClient(key);
      const valid = await client.validateApiKey();
      return valid;
    } catch {
      return false;
    } finally {
      set({ isValidating: false });
    }
  },

  // Validate Real-Debrid key
  validateRealDebridKey: async (key: string) => {
    if (!key.trim()) return { valid: false };

    set({ isValidating: true });
    try {
      const client = createRealDebridClient(key);
      const result = await client.validateApiKey();
      return result;
    } catch {
      return { valid: false };
    } finally {
      set({ isValidating: false });
    }
  },

  // Set and validate TMDB key
  setTmdbKey: async (key: string) => {
    const valid = await get().validateTmdbKey(key);

    if (valid) {
      await setTmdbApiKey(key);
      set({
        tmdbApiKey: key,
        tmdbValid: true,
      });
    } else {
      set({ tmdbValid: false });
    }

    return valid;
  },

  // Set and validate Real-Debrid key
  setRealDebridKey: async (key: string) => {
    const result = await get().validateRealDebridKey(key);

    if (result.valid) {
      await setRealDebridApiKey(key);
      set({
        realDebridApiKey: key,
        realDebridValid: true,
        realDebridPremium: result.isPremium ?? null,
        realDebridUsername: result.username ?? null,
      });
    } else {
      set({ realDebridValid: false });
    }

    return result;
  },

  // Check if all required keys are configured
  isConfigured: () => {
    const state = get();
    return !!(state.tmdbApiKey && state.realDebridApiKey);
  },
}));

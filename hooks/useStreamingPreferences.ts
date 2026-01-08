import { useEffect } from "react";
import { useStreamingPreferencesStore } from "@/stores/streaming-preferences";

/**
 * Hook for accessing streaming preferences (audio/subtitle language preferences)
 * Automatically loads preferences from storage on mount
 */
export function useStreamingPreferences() {
  const store = useStreamingPreferencesStore();

  useEffect(() => {
    store.loadPreferences();
  }, []);

  return store;
}

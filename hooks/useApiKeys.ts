import { useEffect } from "react";
import { useApiKeyStore } from "@/stores/api-keys";

/**
 * Hook to manage API keys with automatic loading
 */
export function useApiKeys() {
  const store = useApiKeyStore();

  useEffect(() => {
    store.loadKeys();
  }, []);

  return {
    // State
    tmdbApiKey: store.tmdbApiKey,
    realDebridApiKey: store.realDebridApiKey,
    tmdbValid: store.tmdbValid,
    realDebridValid: store.realDebridValid,
    realDebridPremium: store.realDebridPremium,
    realDebridUsername: store.realDebridUsername,
    isLoading: store.isLoading,
    isValidating: store.isValidating,
    isConfigured: store.isConfigured(),

    // Actions
    setTmdbKey: store.setTmdbKey,
    setRealDebridKey: store.setRealDebridKey,
    validateTmdbKey: store.validateTmdbKey,
    validateRealDebridKey: store.validateRealDebridKey,
  };
}

/**
 * Hook to check if API keys are configured (for guarding screens)
 */
export function useRequireApiKeys() {
  const { isConfigured, isLoading } = useApiKeys();

  return {
    isConfigured,
    isLoading,
    needsSetup: !isLoading && !isConfigured,
  };
}

/**
 * Secure Storage for API Keys
 *
 * Uses expo-secure-store for encrypted storage of sensitive data.
 * On iOS, uses the Keychain.
 * On Android, uses the Keystore.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Keys for secure storage
const KEYS = {
  TMDB_API_KEY: "mira_tmdb_api_key",
  REAL_DEBRID_API_KEY: "mira_real_debrid_api_key",
  ANILIST_ACCESS_TOKEN: "mira_anilist_access_token",
  ANILIST_CLIENT_SECRET: "mira_anilist_client_secret",
} as const;

type StorageKey = (typeof KEYS)[keyof typeof KEYS];

/**
 * Check if secure storage is available (not available on web)
 */
export function isSecureStorageAvailable(): boolean {
  return Platform.OS !== "web";
}

/**
 * Generic secure storage functions
 */
async function setSecureItem(key: StorageKey, value: string): Promise<void> {
  if (!isSecureStorageAvailable()) {
    // Fallback for web - use localStorage (not secure, but works for dev)
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecureItem(key: StorageKey): Promise<string | null> {
  if (!isSecureStorageAvailable()) {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteSecureItem(key: StorageKey): Promise<void> {
  if (!isSecureStorageAvailable()) {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ============================================
// TMDB API Key
// ============================================

export async function setTmdbApiKey(apiKey: string): Promise<void> {
  await setSecureItem(KEYS.TMDB_API_KEY, apiKey);
}

export async function getTmdbApiKey(): Promise<string | null> {
  return getSecureItem(KEYS.TMDB_API_KEY);
}

export async function deleteTmdbApiKey(): Promise<void> {
  await deleteSecureItem(KEYS.TMDB_API_KEY);
}

// ============================================
// Real-Debrid API Key
// ============================================

export async function setRealDebridApiKey(apiKey: string): Promise<void> {
  await setSecureItem(KEYS.REAL_DEBRID_API_KEY, apiKey);
}

export async function getRealDebridApiKey(): Promise<string | null> {
  return getSecureItem(KEYS.REAL_DEBRID_API_KEY);
}

export async function deleteRealDebridApiKey(): Promise<void> {
  await deleteSecureItem(KEYS.REAL_DEBRID_API_KEY);
}

// ============================================
// AniList Access Token
// ============================================

export async function setAniListAccessToken(token: string): Promise<void> {
  await setSecureItem(KEYS.ANILIST_ACCESS_TOKEN, token);
}

export async function getAniListAccessToken(): Promise<string | null> {
  return getSecureItem(KEYS.ANILIST_ACCESS_TOKEN);
}

export async function deleteAniListAccessToken(): Promise<void> {
  await deleteSecureItem(KEYS.ANILIST_ACCESS_TOKEN);
}

export async function setAniListClientSecret(secret: string): Promise<void> {
  await setSecureItem(KEYS.ANILIST_CLIENT_SECRET, secret);
}

export async function getAniListClientSecret(): Promise<string | null> {
  return getSecureItem(KEYS.ANILIST_CLIENT_SECRET);
}

export async function deleteAniListClientSecret(): Promise<void> {
  await deleteSecureItem(KEYS.ANILIST_CLIENT_SECRET);
}

// ============================================
// Utility: Check if all required keys are set
// ============================================

export async function hasRequiredApiKeys(): Promise<{
  hasTmdb: boolean;
  hasRealDebrid: boolean;
  isComplete: boolean;
}> {
  const [tmdbKey, rdKey] = await Promise.all([
    getTmdbApiKey(),
    getRealDebridApiKey(),
  ]);

  const hasTmdb = !!tmdbKey && tmdbKey.length > 0;
  const hasRealDebrid = !!rdKey && rdKey.length > 0;

  return {
    hasTmdb,
    hasRealDebrid,
    isComplete: hasTmdb && hasRealDebrid,
  };
}

// ============================================
// Utility: Clear all API keys
// ============================================

export async function clearAllApiKeys(): Promise<void> {
  await Promise.all([deleteTmdbApiKey(), deleteRealDebridApiKey()]);
}

import { useState, useCallback, useRef, useEffect } from "react";
import type { Media, MediaType } from "@/lib/types";
import { createTMDBClient } from "@/lib/api/tmdb";
import { useApiKeyStore } from "@/stores/api-keys";
import { useLanguageStore } from "@/stores/language";

interface UseSearchOptions {
  debounceMs?: number;
  mediaType?: MediaType;
}

interface UseSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: Media[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  search: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const { debounceMs = 400, mediaType } = options;

  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (searchQuery: string) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const trimmedQuery = searchQuery.trim();

      if (!trimmedQuery) {
        setResults([]);
        setHasSearched(false);
        setError(null);
        return;
      }

      if (!tmdbApiKey) {
        setError("TMDB API key not configured");
        return;
      }

      setIsLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        const client = createTMDBClient(tmdbApiKey, resolvedLanguage);
        const searchResults = await client.search(trimmedQuery, mediaType);
        setResults(searchResults);
        setHasSearched(true);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Ignore aborted requests
        }
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [tmdbApiKey, mediaType, resolvedLanguage]
  );

  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);

      // Clear existing debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the search
      debounceRef.current = setTimeout(() => {
        search(newQuery);
      }, debounceMs);
    },
    [search, debounceMs]
  );

  const clearResults = useCallback(() => {
    setQueryState("");
    setResults([]);
    setHasSearched(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasSearched,
    search,
    clearResults,
  };
}

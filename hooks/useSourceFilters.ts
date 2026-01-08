import { useEffect } from "react";
import { useSourceFiltersStore } from "@/stores/source-filters";

export function useSourceFilters() {
  const store = useSourceFiltersStore();

  useEffect(() => {
    store.loadFilters();
  }, []);

  return store;
}

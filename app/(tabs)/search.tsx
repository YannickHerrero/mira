import * as React from "react";
import { View, Pressable, ActivityIndicator, TextInput } from "react-native";
import { useFocusEffect } from "expo-router";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { MediaGrid } from "@/components/media";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useSearch } from "@/hooks/useSearch";
import { useApiKeys } from "@/hooks/useApiKeys";
import { Search, X, Film, Tv } from "@/lib/icons";
import { selectionChanged } from "@/lib/haptics";
import type { MediaType } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterType = "all" | "movie" | "tv";

export default function SearchScreen() {
  const { isConfigured, isLoading: isLoadingKeys } = useApiKeys();
  const [filter, setFilter] = React.useState<FilterType>("all");
  const inputRef = React.useRef<TextInput>(null);

  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    hasSearched,
    clearResults,
  } = useSearch({
    mediaType: filter === "all" ? undefined : (filter as MediaType),
  });

  // Auto-focus search input when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Small delay to ensure the screen is fully mounted
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }, [])
  );

  // Filter results based on selected filter
  const filteredResults = React.useMemo(() => {
    if (filter === "all") return results;
    return results.filter((m) => m.mediaType === filter);
  }, [results, filter]);

  // Not configured state
  if (!isLoadingKeys && !isConfigured) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Search size={48} className="text-muted-foreground mb-4" />
        <Text className="text-xl font-semibold text-foreground text-center">
          API Keys Required
        </Text>
        <Text className="text-muted-foreground mt-2 text-center">
          Please configure your TMDB and Real-Debrid API keys in Settings to
          start searching.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Search Header */}
      <View className="px-4 pt-2 pb-3 border-b border-border">
        {/* Search Input */}
        <View className="flex-row items-center bg-muted rounded-lg px-3">
          <Search size={20} className="text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies, TV shows, anime..."
            className="flex-1 border-0 bg-transparent"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={clearResults} className="p-1">
              <X size={18} className="text-muted-foreground" />
            </Pressable>
          )}
          {isLoading && <ActivityIndicator size="small" className="ml-2" />}
        </View>

        {/* Filter Tabs */}
        <View className="flex-row mt-3 gap-2">
          <FilterButton
            label="All"
            isActive={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <FilterButton
            label="Movies"
            icon={<Film size={14} className={filter === "movie" ? "text-primary-foreground" : "text-muted-foreground"} />}
            isActive={filter === "movie"}
            onPress={() => setFilter("movie")}
          />
          <FilterButton
            label="TV Shows"
            icon={<Tv size={14} className={filter === "tv" ? "text-primary-foreground" : "text-muted-foreground"} />}
            isActive={filter === "tv"}
            onPress={() => setFilter("tv")}
          />
        </View>
      </View>

      {/* Results */}
      <View className="flex-1">
        {error ? (
          <ErrorState
            error={error}
            onRetry={() => setQuery(query)}
          />
        ) : !hasSearched ? (
          <EmptyState
            icon={<Search size={48} className="text-muted-foreground" />}
            title="Search for content"
            description="Find movies, TV shows, and anime"
          />
        ) : (
          <MediaGrid
            data={filteredResults}
            isLoading={isLoading}
            emptyMessage="No results found"
            emptyIcon={<Search size={48} className="text-muted-foreground" />}
          />
        )}
      </View>
    </View>
  );
}

interface FilterButtonProps {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
}

function FilterButton({ label, icon, isActive, onPress }: FilterButtonProps) {
  const handlePress = () => {
    selectionChanged();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "flex-row items-center px-3 py-1.5 rounded-full",
        isActive ? "bg-primary" : "bg-muted"
      )}
    >
      {icon && <View className="mr-1.5">{icon}</View>}
      <Text
        className={cn(
          "text-sm font-medium",
          isActive ? "text-primary-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

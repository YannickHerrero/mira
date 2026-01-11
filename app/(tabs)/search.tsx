import * as React from "react";
import { View, Pressable, ActivityIndicator, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { MediaGrid } from "@/components/media";
import { ErrorState } from "@/components/ui/error-state";
import { useSearch } from "@/hooks/useSearch";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { useApiKeys } from "@/hooks/useApiKeys";
import { Search, Film, Tv } from "@/lib/icons";
import { selectionChanged } from "@/lib/haptics";
import type { MediaType } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterType = "all" | "movie" | "tv";

export default function SearchScreen() {
  const { t } = useTranslation();
  const { isConfigured, isLoading: isLoadingKeys } = useApiKeys();
  const [filter, setFilter] = React.useState<FilterType>("all");
  const inputRef = React.useRef<TextInput>(null);
  const { suggestions, isPersonalized } = useSearchSuggestions();

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

  // Handle cancel button press
  const handleCancel = () => {
    clearResults();
    inputRef.current?.focus();
  };

  // Handle suggestion tap
  const handleSuggestionTap = (title: string) => {
    setQuery(title);
  };

  // Not configured state
  if (!isLoadingKeys && !isConfigured) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Search size={48} className="text-muted-foreground mb-4" />
        <Text className="text-xl font-semibold text-foreground text-center">
          {t("search.apiRequired")}
        </Text>
        <Text className="text-muted-foreground mt-2 text-center">
          {t("search.apiRequiredDesc")}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Page Title */}
      <View className="px-4 pt-4">
        <Text variant="pageTitle">
          {t("search.title")}
        </Text>
      </View>

      {/* Search Header */}
      <View className="px-4 pt-3 pb-3">
        {/* Search Input Row */}
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-surface0 rounded-lg px-4 py-2 gap-2">
            <Search size={24} className="text-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={t("search.placeholder")}
              placeholderClassName="text-muted-foreground"
              className="flex-1 border-0 bg-transparent text-[11px] h-8"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {isLoading && <ActivityIndicator size="small" />}
          </View>
          {query.length > 0 && (
            <Pressable onPress={handleCancel} className="px-2 py-4">
              <Text variant="body">
                {t("search.cancel")}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Filter Tabs - only show when searched */}
        {hasSearched && (
          <View className="flex-row mt-3 gap-2">
            <FilterButton
              label={t("search.filterAll")}
              isActive={filter === "all"}
              onPress={() => setFilter("all")}
            />
            <FilterButton
              label={t("search.filterMovies")}
              icon={<Film size={14} className={filter === "movie" ? "text-primary-foreground" : "text-muted-foreground"} />}
              isActive={filter === "movie"}
              onPress={() => setFilter("movie")}
            />
            <FilterButton
              label={t("search.filterTvShows")}
              icon={<Tv size={14} className={filter === "tv" ? "text-primary-foreground" : "text-muted-foreground"} />}
              isActive={filter === "tv"}
              onPress={() => setFilter("tv")}
            />
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        {error ? (
          <ErrorState
            error={error}
            onRetry={() => setQuery(query)}
          />
        ) : !hasSearched ? (
          // Default view: Suggestions (personalized or trending)
          <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingBottom: 96 }}
          >
            <Text variant="sectionTitle" className="mt-4 mb-2">
              {isPersonalized ? t("search.suggestedForYou") : t("search.mostSearched")}
            </Text>
            {suggestions.map((item) => (
              <Pressable
                key={`${item.mediaType}-${item.id}`}
                onPress={() => handleSuggestionTap(item.title)}
                className="py-3"
              >
                <Text variant="cardTitle" className="font-normal">
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <MediaGrid
            data={filteredResults}
            isLoading={isLoading}
            emptyMessage={t("search.noResults")}
            emptyIcon={<Search size={48} className="text-muted-foreground" />}
            contentPaddingBottom={96}
          />
        )}
      </View>
    </SafeAreaView>
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

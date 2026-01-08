import * as React from "react";
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { MediaSection } from "@/components/library";
import { useMigrationHelper } from "@/db/drizzle";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useTrending } from "@/hooks/useTrending";
import { useContinueWatching } from "@/hooks/useLibrary";
import { useLists, useListItems, useListActions } from "@/hooks/useLists";
import { useRecommendations } from "@/hooks/useRecommendations";
import { Search, Settings } from "@/lib/icons";
import type { Media, MediaType } from "@/lib/types";

export default function HomeScreen() {
  const router = useRouter();
  const { success, error: migrationError } = useMigrationHelper();
  const { isConfigured, isLoading: loadingKeys } = useApiKeys();

  const {
    trendingMovies,
    trendingTv,
    isLoading: loadingTrending,
    refetch: refetchTrending,
  } = useTrending();

  const { items: continueItems, refetch: refetchContinue } = useContinueWatching();
  const { lists, refetch: refetchLists } = useLists();
  const { ensureDefaultList, migrateFromWatchlist } = useListActions();

  // Personalized recommendations
  const {
    sections: recommendationSections,
    isLoading: loadingRecommendations,
    hasPersonalization,
    refetch: refetchRecommendations,
  } = useRecommendations();

  // Find the default watchlist
  const defaultList = lists.find((l) => l.isDefault);
  const { items: watchlistItems, refetch: refetchWatchlist } = useListItems(defaultList?.id ?? null);

  const [refreshing, setRefreshing] = React.useState(false);

  // Ensure default list exists on first load
  React.useEffect(() => {
    const initLists = async () => {
      await ensureDefaultList();
      await migrateFromWatchlist();
      refetchLists();
    };
    initLists();
  }, [ensureDefaultList, migrateFromWatchlist, refetchLists]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchTrending(),
      refetchContinue(),
      refetchLists(),
      refetchWatchlist(),
      refetchRecommendations(),
    ]);
    setRefreshing(false);
  };

  const handleSearchPress = () => {
    router.push("/search" as any);
  };

  // Convert database records to Media type with episode info for continue watching
  const continueWatchingItems = continueItems.map((item) => ({
    media: {
      id: item.media.tmdbId,
      mediaType: item.media.mediaType as MediaType,
      title: item.media.title,
      posterPath: item.media.posterPath,
      backdropPath: item.media.backdropPath,
      year: item.media.year,
      score: item.media.score,
      genres: item.media.genres ? JSON.parse(item.media.genres) : [],
    } as Media,
    // Include episode info for TV shows
    episodeInfo:
      item.media.mediaType === "tv" &&
      item.progress.seasonNumber != null &&
      item.progress.episodeNumber != null
        ? {
            seasonNumber: item.progress.seasonNumber,
            episodeNumber: item.progress.episodeNumber,
          }
        : undefined,
  }));

  const watchlistMedia: Media[] = watchlistItems.map((item) => ({
    id: item.media.tmdbId,
    mediaType: item.media.mediaType as MediaType,
    title: item.media.title,
    posterPath: item.media.posterPath ?? undefined,
    backdropPath: item.media.backdropPath ?? undefined,
    year: item.media.year ?? undefined,
    score: item.media.score ?? undefined,
    genres: item.media.genres ? JSON.parse(item.media.genres) : [],
  }));

  // Migration error
  if (migrationError) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-destructive">Migration error: {migrationError.message}</Text>
      </View>
    );
  }

  // Loading migration
  if (!success) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-4">Loading...</Text>
      </View>
    );
  }

  // Not configured - prompt to set up API keys
  if (!loadingKeys && !isConfigured) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Settings size={48} className="text-muted-foreground mb-4" />
        <Text className="text-xl font-semibold text-foreground text-center">
          Welcome to Mira
        </Text>
        <Text className="text-muted-foreground mt-2 text-center">
          To get started, configure your TMDB and Real-Debrid API keys in Settings.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Search bar */}
        <View className="px-4 pt-4 pb-2">
          <Pressable onPress={handleSearchPress}>
            <View className="flex-row items-center bg-muted rounded-lg px-3">
              <Search size={20} className="text-muted-foreground" />
              <Input
                placeholder="Search movies, TV shows..."
                className="flex-1 border-0 bg-transparent"
                editable={false}
                pointerEvents="none"
              />
            </View>
          </Pressable>
        </View>

        {/* Continue Watching */}
        {continueWatchingItems.length > 0 && (
          <MediaSection
            title="Continue Watching"
            items={continueWatchingItems}
          />
        )}

        {/* Watchlist */}
        {watchlistMedia.length > 0 && (
          <MediaSection
            title="Your Watchlist"
            items={watchlistMedia.slice(0, 10)}
            onSeeAll={() => router.push("/library" as any)}
          />
        )}

        {/* Personalized Recommendations */}
        {hasPersonalization && recommendationSections.map((section) => (
          <MediaSection
            key={section.id}
            title={section.title}
            items={section.items}
          />
        ))}

        {/* Trending Movies */}
        {loadingTrending ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <>
            <MediaSection
              title="Trending Movies"
              items={trendingMovies}
            />

            <MediaSection
              title="Trending TV Shows"
              items={trendingTv}
            />
          </>
        )}

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

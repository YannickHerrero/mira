import * as React from "react";
import { View, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { MediaSection } from "@/components/library";
import { useMigrationHelper } from "@/db/drizzle";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useTrending } from "@/hooks/useTrending";
import { useContinueWatching, useWatchlist } from "@/hooks/useLibrary";
import { Search, Film, Tv, Settings } from "@/lib/icons";
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
  const { items: watchlistItems, refetch: refetchWatchlist } = useWatchlist();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchTrending(), refetchContinue(), refetchWatchlist()]);
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
    posterPath: item.media.posterPath,
    backdropPath: item.media.backdropPath,
    year: item.media.year,
    score: item.media.score,
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
          <View className="flex-row items-center bg-muted rounded-lg px-3" onTouchEnd={handleSearchPress}>
            <Search size={20} className="text-muted-foreground" />
            <Input
              placeholder="Search movies, TV shows..."
              className="flex-1 border-0 bg-transparent"
              editable={false}
              pointerEvents="none"
            />
          </View>
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

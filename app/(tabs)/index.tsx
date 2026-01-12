import * as React from "react";
import { View, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { MediaSection } from "@/components/library";
import {
  HeroSection,
  ContinueWatchingList,
  NewReleasesCarousel,
} from "@/components/home";
import { useMigrationHelper } from "@/db/drizzle";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useTrending } from "@/hooks/useTrending";
import { useContinueWatching } from "@/hooks/useLibrary";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useRecentReleases } from "@/hooks/useRecentReleases";
import { useLists, useListActions } from "@/hooks/useLists";
import { Settings } from "@/lib/icons";
import type { Media, MediaType } from "@/lib/types";

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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

  // Recent releases from watchlist
  const { releases: recentReleases, refetch: refetchReleases } = useRecentReleases();

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
      refetchRecommendations(),
      refetchReleases(),
    ]);
    setRefreshing(false);
  };

  // Determine hero media: last TV show from continue watching, or first trending TV
  const heroData = React.useMemo(() => {
    // Priority 1: Last TV show from continue watching
    const lastTvItem = continueItems.find(
      (item) => item.media.mediaType === "tv"
    );
    if (lastTvItem) {
      return {
        media: {
          id: lastTvItem.media.tmdbId,
          mediaType: lastTvItem.media.mediaType as MediaType,
          title: lastTvItem.media.title,
          posterPath: lastTvItem.media.posterPath,
          backdropPath: lastTvItem.media.backdropPath,
          year: lastTvItem.media.year,
          score: lastTvItem.media.score,
          description: lastTvItem.media.description,
          genres: lastTvItem.media.genres
            ? JSON.parse(lastTvItem.media.genres)
            : [],
        } as Media,
        episodeInfo:
          lastTvItem.progress.seasonNumber != null &&
          lastTvItem.progress.episodeNumber != null
            ? {
                seasonNumber: lastTvItem.progress.seasonNumber,
                episodeNumber: lastTvItem.progress.episodeNumber,
              }
            : undefined,
      };
    }

    // Priority 2: First trending TV show
    if (trendingTv.length > 0) {
      return {
        media: trendingTv[0],
        episodeInfo: undefined,
      };
    }

    return null;
  }, [continueItems, trendingTv]);

  // Migration error
  if (migrationError) {
    return (
      <View className="flex-1 bg-base items-center justify-center px-6">
        <Text className="text-red">{t("home.migrationError", { message: migrationError.message })}</Text>
      </View>
    );
  }

  // Loading migration
  if (!success) {
    return (
      <View className="flex-1 bg-base items-center justify-center px-6">
        <ActivityIndicator size="large" />
        <Text className="text-subtext0 mt-4">{t("home.loading")}</Text>
      </View>
    );
  }

  // Not configured - prompt to set up API keys
  if (!loadingKeys && !isConfigured) {
    return (
      <View className="flex-1 bg-base items-center justify-center px-6">
        <Settings size={48} className="text-subtext0 mb-4" />
        <Text className="text-xl font-semibold text-text text-center">
          {t("home.welcome")}
        </Text>
        <Text className="text-subtext0 mt-2 text-center">
          {t("home.configureKeys")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-base">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Hero Section */}
        {heroData && (
          <HeroSection
            media={heroData.media}
            episodeInfo={heroData.episodeInfo}
          />
        )}

        {/* Sections container with gap */}
        <View className="gap-8 pb-32 mt-8">
          {/* Continue Watching (list style) */}
          {continueItems.length > 0 && (
            <ContinueWatchingList items={continueItems} maxItems={3} />
          )}

          {/* New Releases */}
          {recentReleases.length > 0 && (
            <NewReleasesCarousel releases={recentReleases} />
          )}

          {/* Personalized Recommendations */}
          {hasPersonalization &&
            recommendationSections.map((section) => (
              <MediaSection
                key={section.id}
                title={section.title}
                items={section.items}
                headerStyle="muted"
                uppercase={false}
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
                title={t("home.trendingMovies")}
                items={trendingMovies}
                headerStyle="muted"
              />

              <MediaSection
                title={t("home.trendingTvShows")}
                items={trendingTv}
                headerStyle="muted"
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

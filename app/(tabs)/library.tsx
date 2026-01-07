import * as React from "react";
import { View, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { Text } from "@/components/ui/text";
import { MediaCard, MediaCardSkeleton } from "@/components/media";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useContinueWatching,
  useWatchlist,
  useFavorites,
} from "@/hooks/useLibrary";
import { Play, Plus, Heart, Clock } from "@/lib/icons";
import { selectionChanged } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { Media, MediaType } from "@/lib/types";

type TabType = "continue" | "watchlist" | "favorites";

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = React.useState<TabType>("continue");
  const [refreshing, setRefreshing] = React.useState(false);

  const { items: continueItems, isLoading: loadingContinue, refetch: refetchContinue } = useContinueWatching();
  const { items: watchlistItems, isLoading: loadingWatchlist, refetch: refetchWatchlist } = useWatchlist();
  const { items: favoriteItems, isLoading: loadingFavorites, refetch: refetchFavorites } = useFavorites();

  // Refetch data when screen gains focus (e.g., after adding to favorites/watchlist)
  useFocusEffect(
    React.useCallback(() => {
      refetchContinue();
      refetchWatchlist();
      refetchFavorites();
    }, [refetchContinue, refetchWatchlist, refetchFavorites])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchContinue(), refetchWatchlist(), refetchFavorites()]);
    setRefreshing(false);
  }, [refetchContinue, refetchWatchlist, refetchFavorites]);

  const renderContent = () => {
    switch (activeTab) {
      case "continue":
        if (loadingContinue && continueItems.length === 0) {
          return <LoadingState />;
        }
        if (continueItems.length === 0) {
          return (
            <EmptyState
              icon={<Play size={48} className="text-muted-foreground" />}
              title="Nothing to continue"
              description="Start watching something and it will appear here"
            />
          );
        }
        return (
          <MediaGridFromJoin
            items={continueItems.map((item) => item.media)}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        );

      case "watchlist":
        if (loadingWatchlist && watchlistItems.length === 0) {
          return <LoadingState />;
        }
        if (watchlistItems.length === 0) {
          return (
            <EmptyState
              icon={<Plus size={48} className="text-muted-foreground" />}
              title="Watchlist is empty"
              description="Add movies and TV shows to watch later"
            />
          );
        }
        return (
          <MediaGridFromJoin
            items={watchlistItems.map((item) => item.media)}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        );

      case "favorites":
        if (loadingFavorites && favoriteItems.length === 0) {
          return <LoadingState />;
        }
        if (favoriteItems.length === 0) {
          return (
            <EmptyState
              icon={<Heart size={48} className="text-muted-foreground" />}
              title="No favorites yet"
              description="Mark movies and TV shows as favorites"
            />
          );
        }
        return (
          <MediaGridFromRecord
            items={favoriteItems}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        );
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Tabs */}
      <View className="flex-row px-4 pt-2 pb-3 border-b border-border">
        <TabButton
          label="Continue"
          icon={<Clock size={16} />}
          isActive={activeTab === "continue"}
          onPress={() => setActiveTab("continue")}
          badge={continueItems.length > 0 ? continueItems.length : undefined}
        />
        <TabButton
          label="Watchlist"
          icon={<Plus size={16} />}
          isActive={activeTab === "watchlist"}
          onPress={() => setActiveTab("watchlist")}
          badge={watchlistItems.length > 0 ? watchlistItems.length : undefined}
        />
        <TabButton
          label="Favorites"
          icon={<Heart size={16} />}
          isActive={activeTab === "favorites"}
          onPress={() => setActiveTab("favorites")}
          badge={favoriteItems.length > 0 ? favoriteItems.length : undefined}
        />
      </View>

      {/* Content */}
      <View className="flex-1">{renderContent()}</View>
    </View>
  );
}

interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}

function TabButton({ label, icon, isActive, onPress, badge }: TabButtonProps) {
  const handlePress = () => {
    selectionChanged();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "flex-row items-center px-4 py-2 mr-2 rounded-full",
        isActive ? "bg-primary" : "bg-muted"
      )}
    >
      <View className={cn("mr-1.5", isActive ? "text-primary-foreground" : "text-muted-foreground")}>
        {icon}
      </View>
      <Text
        className={cn(
          "text-sm font-medium",
          isActive ? "text-primary-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </Text>
      {badge !== undefined && (
        <View className="ml-1.5 bg-background/20 rounded-full px-1.5 py-0.5">
          <Text className="text-xs text-primary-foreground">{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function LoadingState() {
  return (
    <View className="flex-1 px-4 pt-4">
      <View className="flex-row flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} className="p-1.5">
            <MediaCardSkeleton size="medium" />
          </View>
        ))}
      </View>
    </View>
  );
}

// Convert database record to Media type for MediaCard
function dbRecordToMedia(record: any): Media {
  return {
    id: record.tmdbId,
    mediaType: record.mediaType as MediaType,
    title: record.title,
    titleOriginal: record.titleOriginal,
    year: record.year,
    score: record.score,
    posterPath: record.posterPath,
    backdropPath: record.backdropPath,
    description: record.description,
    genres: record.genres ? JSON.parse(record.genres) : [],
    seasonCount: record.seasonCount,
    episodeCount: record.episodeCount,
  };
}

interface MediaGridLocalProps {
  items: any[];
  refreshing?: boolean;
  onRefresh?: () => void;
}

function MediaGridFromJoin({ items, refreshing, onRefresh }: MediaGridLocalProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 12 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <View className="flex-row flex-wrap">
        {items.map((item) => (
          <View key={`${item.tmdbId}-${item.mediaType}`} className="p-1.5">
            <MediaCard media={dbRecordToMedia(item)} size="medium" />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MediaGridFromRecord({ items, refreshing, onRefresh }: MediaGridLocalProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 12 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      <View className="flex-row flex-wrap">
        {items.map((item) => (
          <View key={`${item.tmdbId}-${item.mediaType}`} className="p-1.5">
            <MediaCard media={dbRecordToMedia(item)} size="medium" />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

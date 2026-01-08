import * as React from "react";
import { View, ScrollView, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { MediaCard, MediaCardSkeleton } from "@/components/media";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DownloadedItemCard,
  DownloadInfoSheet,
} from "@/components/downloads";
import { BottomSheet } from "@/components/primitives/bottomSheet/bottom-sheet.native";
import {
  useContinueWatching,
  useWatchlist,
  useFavorites,
} from "@/hooks/useLibrary";
import { useDownloads, useDownloadsList } from "@/hooks/useDownloads";
import { useMediaPlayer } from "@/hooks/useSettings";
import { Play, Plus, Heart, Clock, Download } from "@/lib/icons";
import { selectionChanged, mediumImpact } from "@/lib/haptics";
import { fileExists } from "@/lib/download-manager";
import { cn } from "@/lib/utils";
import type { Media, MediaType } from "@/lib/types";
import type { DownloadItem } from "@/stores/downloads";

type TabType = "continue" | "watchlist" | "favorites" | "downloads";

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabType>("continue");
  const [refreshing, setRefreshing] = React.useState(false);

  const { items: continueItems, isLoading: loadingContinue, refetch: refetchContinue } = useContinueWatching();
  const { items: watchlistItems, isLoading: loadingWatchlist, refetch: refetchWatchlist } = useWatchlist();
  const { items: favoriteItems, isLoading: loadingFavorites, refetch: refetchFavorites } = useFavorites();
  const { items: downloadItems, isLoading: loadingDownloads } = useDownloadsList();
  const { deleteDownload, retryDownload } = useDownloads();
  const { playMedia } = useMediaPlayer();

  // Bottom sheet for download info
  const [selectedDownload, setSelectedDownload] = React.useState<DownloadItem | null>(null);
  const downloadInfoSheetRef = React.useRef<BottomSheetModal>(null);

  // Refetch data when screen gains focus
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

  const handleDownloadPress = React.useCallback(
    async (download: DownloadItem) => {
      if (download.status === "completed") {
        // Play the downloaded file
        const exists = fileExists(download.filePath);
        if (exists) {
          await playMedia({
            url: download.filePath,
            title: download.title,
            tmdbId: download.tmdbId,
            mediaType: download.mediaType,
            seasonNumber: download.seasonNumber,
            episodeNumber: download.episodeNumber,
          });
        } else {
          // File doesn't exist, show error
          console.error("Downloaded file not found:", download.filePath);
        }
      } else if (download.status === "failed") {
        // Retry failed download
        retryDownload(download.id);
      }
    },
    [playMedia, retryDownload]
  );

  const handleDownloadLongPress = React.useCallback((download: DownloadItem) => {
    mediumImpact();
    setSelectedDownload(download);
    downloadInfoSheetRef.current?.present();
  }, []);

  const handlePlayDownload = React.useCallback(async () => {
    if (selectedDownload?.status === "completed") {
      await playMedia({
        url: selectedDownload.filePath,
        title: selectedDownload.title,
        tmdbId: selectedDownload.tmdbId,
        mediaType: selectedDownload.mediaType,
        seasonNumber: selectedDownload.seasonNumber,
        episodeNumber: selectedDownload.episodeNumber,
      });
    }
  }, [selectedDownload, playMedia]);

  const handleDeleteDownload = React.useCallback(() => {
    if (selectedDownload) {
      deleteDownload(selectedDownload.id);
      setSelectedDownload(null);
    }
  }, [selectedDownload, deleteDownload]);

  const handleRetryDownload = React.useCallback(() => {
    if (selectedDownload?.status === "failed") {
      retryDownload(selectedDownload.id);
      setSelectedDownload(null);
    }
  }, [selectedDownload, retryDownload]);

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
          <ContinueWatchingGrid
            items={continueItems}
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

      case "downloads":
        if (loadingDownloads && downloadItems.length === 0) {
          return <DownloadLoadingState />;
        }
        if (downloadItems.length === 0) {
          return (
            <EmptyState
              icon={<Download size={48} className="text-muted-foreground" />}
              title="No downloads"
              description="Long press a source to download for offline viewing"
            />
          );
        }
        return (
          <DownloadsList
            items={downloadItems}
            onPress={handleDownloadPress}
            onLongPress={handleDownloadLongPress}
          />
        );
    }
  };

  // Don't show downloads tab on web
  const showDownloadsTab = Platform.OS !== "web";

  return (
    <View className="flex-1 bg-background">
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-grow-0 border-b border-border"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}
      >
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
        {showDownloadsTab && (
          <TabButton
            label="Downloads"
            icon={<Download size={16} />}
            isActive={activeTab === "downloads"}
            onPress={() => setActiveTab("downloads")}
            badge={downloadItems.length > 0 ? downloadItems.length : undefined}
          />
        )}
      </ScrollView>

      {/* Content */}
      <View className="flex-1">{renderContent()}</View>

      {/* Download Info Sheet */}
      {Platform.OS !== "web" && (
        <BottomSheet>
          <DownloadInfoSheet
            sheetRef={downloadInfoSheetRef}
            download={selectedDownload}
            onPlay={handlePlayDownload}
            onDelete={handleDeleteDownload}
            onRetry={handleRetryDownload}
          />
        </BottomSheet>
      )}
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

function DownloadLoadingState() {
  return (
    <View className="flex-1 px-4 pt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <View
          key={i}
          className="flex-row bg-card rounded-lg overflow-hidden mb-3 border border-border h-28"
        >
          <View className="w-20 h-full bg-muted animate-pulse" />
          <View className="flex-1 p-3 justify-center">
            <View className="h-4 bg-muted rounded w-3/4 animate-pulse mb-2" />
            <View className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </View>
        </View>
      ))}
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

interface ContinueWatchingGridProps {
  items: Array<{
    progress: {
      seasonNumber: number | null;
      episodeNumber: number | null;
    };
    media: any;
  }>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

function ContinueWatchingGrid({ items, refreshing, onRefresh }: ContinueWatchingGridProps) {
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
        {items.map((item) => {
          const episodeInfo =
            item.media.mediaType === "tv" &&
            item.progress.seasonNumber != null &&
            item.progress.episodeNumber != null
              ? {
                  seasonNumber: item.progress.seasonNumber,
                  episodeNumber: item.progress.episodeNumber,
                }
              : undefined;

          return (
            <View key={`${item.media.tmdbId}-${item.media.mediaType}`} className="p-1.5">
              <MediaCard
                media={dbRecordToMedia(item.media)}
                size="medium"
                episodeInfo={episodeInfo}
              />
            </View>
          );
        })}
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

interface DownloadsListProps {
  items: DownloadItem[];
  onPress: (download: DownloadItem) => void;
  onLongPress: (download: DownloadItem) => void;
}

function DownloadsList({ items, onPress, onLongPress }: DownloadsListProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {items.map((download) => (
        <DownloadedItemCard
          key={download.id}
          download={download}
          onPress={() => onPress(download)}
          onLongPress={() => onLongPress(download)}
        />
      ))}
    </ScrollView>
  );
}

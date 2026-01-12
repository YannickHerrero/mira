import * as React from "react";
import { View, ScrollView, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { MediaCard, MediaCardSkeleton, MediaGrid, useGridColumns, GRID_GAP, GRID_PADDING } from "@/components/media";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DownloadedItemCard,
  DownloadInfoSheet,
} from "@/components/downloads";
import { BottomSheet } from "@/components/primitives/bottomSheet/bottom-sheet.native";
import {
  useContinueWatching,
  useFavorites,
} from "@/hooks/useLibrary";
import { useListActions, useListItems, useLists } from "@/hooks/useLists";
import { useDownloads, useDownloadsList } from "@/hooks/useDownloads";
import { useMediaPlayer } from "@/hooks/useSettings";
import {
  Play,
  Plus,
  Heart,
  Clock,
  Download,
  List,
  ChevronRight,
  ListChecks,
} from "@/lib/icons";
import { selectionChanged, mediumImpact, lightImpact } from "@/lib/haptics";
import { fileExists } from "@/lib/download-manager";
import { cn } from "@/lib/utils";
import type { Media, MediaType } from "@/lib/types";
import type { DownloadItem } from "@/stores/downloads";
import type { ListWithCount } from "@/hooks/useLists";

type TabType = "watchlist" | "continue" | "lists" | "favorites" | "downloads";

export default function LibraryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const normalizedTab = Array.isArray(tab) ? tab[0] : tab;
  const isTab = (value?: string): value is TabType =>
    value === "watchlist" ||
    value === "continue" ||
    value === "lists" ||
    value === "favorites" ||
    value === "downloads";
  const [activeTab, setActiveTab] = React.useState<TabType>(() =>
    isTab(normalizedTab) ? normalizedTab : "watchlist"
  );
  const [refreshing, setRefreshing] = React.useState(false);

  const { items: continueItems, isLoading: loadingContinue, refetch: refetchContinue } = useContinueWatching();
  const { lists, isLoading: loadingLists, refetch: refetchLists } = useLists();
  const { ensureDefaultList, migrateFromWatchlist } = useListActions();
  const defaultList = lists.find((list) => list.isDefault);
  const customLists = lists.filter((list) => !list.isDefault);
  const {
    items: watchlistItems,
    isLoading: loadingWatchlist,
    refetch: refetchWatchlist,
  } = useListItems(defaultList?.id ?? null);
  const { items: favoriteItems, isLoading: loadingFavorites, refetch: refetchFavorites } = useFavorites();
  const { items: downloadItems, isLoading: loadingDownloads } = useDownloadsList();
  const { deleteDownload, retryDownload } = useDownloads();
  const { playMedia } = useMediaPlayer();

  // Ensure default list exists and migrate old watchlist on first load
  React.useEffect(() => {
    const initLists = async () => {
      await ensureDefaultList();
      await migrateFromWatchlist();
      refetchLists();
    };
    initLists();
  }, [ensureDefaultList, migrateFromWatchlist, refetchLists]);

  // Bottom sheet for download info
  const [selectedDownload, setSelectedDownload] = React.useState<DownloadItem | null>(null);
  const downloadInfoSheetRef = React.useRef<BottomSheetModal>(null);


  // Refetch data when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refetchContinue();
      refetchLists();
      refetchWatchlist();
      refetchFavorites();
    }, [refetchContinue, refetchLists, refetchWatchlist, refetchFavorites])
  );

  React.useEffect(() => {
    if (isTab(normalizedTab)) {
      setActiveTab(normalizedTab);
    }
  }, [normalizedTab]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchContinue(),
      refetchLists(),
      refetchWatchlist(),
      refetchFavorites(),
    ]);
    setRefreshing(false);
  }, [refetchContinue, refetchLists, refetchWatchlist, refetchFavorites]);

  const handleTabChange = React.useCallback(
    (nextTab: TabType) => {
      if (normalizedTab) {
        router.setParams({ tab: undefined });
      }
      setActiveTab(nextTab);
    },
    [normalizedTab, router]
  );

  const handleListPress = (listId: string) => {
    lightImpact();
    router.push(`/lists/${listId}`);
  };

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
      case "watchlist":
        return (
          <MediaGrid
            data={watchlistItems.map((item) => dbRecordToMedia(item.media))}
            isLoading={loadingWatchlist}
            emptyMessage={t("library.noWatchlist")}
            emptyIcon={<ListChecks size={48} className="text-subtext0" />}
            onRefresh={handleRefresh}
            isRefreshing={refreshing}
            contentPaddingBottom={96}
          />
        );

      case "continue":
        return (
          <ContinueWatchingGrid
            items={continueItems}
            isLoading={loadingContinue}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentPaddingBottom={96}
          />
        );

      case "lists":
        if (loadingLists && customLists.length === 0) {
          return <ListsLoadingState />;
        }
        if (customLists.length === 0) {
          return (
            <EmptyState
              icon={<List size={48} className="text-subtext0" />}
              title={t("library.noLists")}
              description={t("library.noListsDesc")}
            />
          );
        }
        return (
          <ListsGrid
            lists={customLists}
            onListPress={handleListPress}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentPaddingBottom={96}
          />
        );

      case "favorites":
        return (
          <MediaGrid
            data={favoriteItems.map(dbRecordToMedia)}
            isLoading={loadingFavorites}
            emptyMessage={t("library.noFavorites")}
            emptyIcon={<Heart size={48} className="text-subtext0" />}
            onRefresh={handleRefresh}
            isRefreshing={refreshing}
            contentPaddingBottom={96}
          />
        );

      case "downloads":
        if (loadingDownloads && downloadItems.length === 0) {
          return <DownloadLoadingState />;
        }
        if (downloadItems.length === 0) {
          return (
            <EmptyState
              icon={<Download size={48} className="text-subtext0" />}
              title={t("library.noDownloads")}
              description={t("library.noDownloadsDesc")}
            />
          );
        }
        return (
          <DownloadsList
            items={downloadItems}
            onPress={handleDownloadPress}
            onLongPress={handleDownloadLongPress}
            contentPaddingBottom={96}
          />
        );
    }
  };


  // Don't show downloads tab on web
  const showDownloadsTab = Platform.OS !== "web";

  return (
    <View className="flex-1 bg-base">
      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-grow-0 border-b border-surface1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}
      >
        <TabButton
          label={t("library.watchlist")}
          icon={<ListChecks size={16} />}
          isActive={activeTab === "watchlist"}
          onPress={() => handleTabChange("watchlist")}
          badge={watchlistItems.length > 0 ? watchlistItems.length : undefined}
        />
        <TabButton
          label={t("library.continue")}
          icon={<Clock size={16} />}
          isActive={activeTab === "continue"}
          onPress={() => handleTabChange("continue")}
          badge={continueItems.length > 0 ? continueItems.length : undefined}
        />
        <TabButton
          label={t("library.lists")}
          icon={<List size={16} />}
          isActive={activeTab === "lists"}
          onPress={() => handleTabChange("lists")}
          badge={customLists.length > 0 ? customLists.length : undefined}
        />
        <TabButton
          label={t("library.favorites")}
          icon={<Heart size={16} />}
          isActive={activeTab === "favorites"}
          onPress={() => handleTabChange("favorites")}
          badge={favoriteItems.length > 0 ? favoriteItems.length : undefined}
        />
        {showDownloadsTab && (
          <TabButton
            label={t("library.downloads")}
            icon={<Download size={16} />}
            isActive={activeTab === "downloads"}
            onPress={() => handleTabChange("downloads")}
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
  icon: React.ReactElement<{ className?: string }>;
  isActive: boolean;
  onPress: () => void;
  badge?: number;
}

function TabButton({ label, icon, isActive, onPress, badge }: TabButtonProps) {
  const handlePress = () => {
    selectionChanged();
    onPress();
  };

  const iconElement = React.cloneElement(icon, {
    className: cn(icon.props.className, isActive ? "text-crust" : "text-subtext0"),
  });

  return (
    <Pressable
      onPress={handlePress}
      className={cn(
        "flex-row items-center px-4 py-2 mr-2 rounded-full",
        isActive ? "bg-lavender" : "bg-surface0"
      )}
    >
      <View className="mr-1.5">{iconElement}</View>
      <Text
        className={cn(
          "text-sm font-medium",
          isActive ? "text-crust" : "text-subtext0"
        )}
      >
        {label}
      </Text>
      {badge !== undefined && (
        <View className="ml-1.5 bg-base/20 rounded-full px-1.5 py-0.5">
          <Text className={cn("text-xs", isActive ? "text-crust" : "text-subtext0")}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}


function DownloadLoadingState() {
  return (
    <View className="flex-1 px-4 pt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <View
          key={i}
          className="flex-row bg-surface0 rounded-lg overflow-hidden mb-3 border border-surface1 h-28"
        >
          <View className="w-20 h-full bg-surface0 animate-pulse" />
          <View className="flex-1 p-3 justify-center">
            <View className="h-4 bg-surface0 rounded w-3/4 animate-pulse mb-2" />
            <View className="h-3 bg-surface0 rounded w-1/2 animate-pulse" />
          </View>
        </View>
      ))}
    </View>
  );
}

function ListsLoadingState() {
  return (
    <View className="flex-1 px-4 pt-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          className="flex-row items-center bg-surface0 rounded-lg mb-3 border border-surface1 p-4"
        >
          <View className="w-10 h-10 bg-surface0 rounded-lg animate-pulse mr-3" />
          <View className="flex-1">
            <View className="h-4 bg-surface0 rounded w-1/3 animate-pulse mb-2" />
            <View className="h-3 bg-surface0 rounded w-1/4 animate-pulse" />
          </View>
        </View>
      ))}
    </View>
  );
}

interface ListsGridProps {
  lists: ListWithCount[];
  onListPress: (listId: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentPaddingBottom?: number;
}

function ListsGrid({
  lists,
  onListPress,
  refreshing,
  onRefresh,
  contentPaddingBottom = 0,
}: ListsGridProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 16 + contentPaddingBottom }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {lists.map((list) => (
        <Pressable
          key={list.id}
          onPress={() => onListPress(list.id)}
          className="flex-row items-center bg-surface0 rounded-lg mb-3 border border-surface1 p-4 active:opacity-70"
        >
          <View className="w-10 h-10 bg-lavender/10 rounded-lg items-center justify-center mr-3">
            <List size={20} className="text-lavender" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-text">
              {list.name}
              {list.isDefault && (
                <Text className="text-subtext0"> {t("library.default")}</Text>
              )}
            </Text>
            <Text className="text-sm text-subtext0">
              {t("library.item", { count: list.itemCount })}
            </Text>
          </View>
          <ChevronRight size={20} className="text-subtext0" />
        </Pressable>
      ))}
    </ScrollView>
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


interface ContinueWatchingItem {
  progress: {
    seasonNumber: number | null;
    episodeNumber: number | null;
  };
  media: any;
}

interface ContinueWatchingGridProps {
  items: ContinueWatchingItem[];
  isLoading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentPaddingBottom?: number;
}

function ContinueWatchingGrid({
  items,
  isLoading,
  refreshing,
  onRefresh,
  contentPaddingBottom = 0,
}: ContinueWatchingGridProps) {
  const { t } = useTranslation();
  // Build a map from media id to episode info for custom rendering
  const episodeInfoMap = React.useMemo(() => {
    const map = new Map<string, { seasonNumber: number; episodeNumber: number }>();
    items.forEach((item) => {
      if (
        item.media.mediaType === "tv" &&
        item.progress.seasonNumber != null &&
        item.progress.episodeNumber != null
      ) {
        const key = `${item.media.mediaType}-${item.media.tmdbId}`;
        map.set(key, {
          seasonNumber: item.progress.seasonNumber,
          episodeNumber: item.progress.episodeNumber,
        });
      }
    });
    return map;
  }, [items]);

  const mediaItems = React.useMemo(
    () => items.map((item) => dbRecordToMedia(item.media)),
    [items]
  );

  const renderItem = React.useCallback(
    (media: Media) => {
      const key = `${media.mediaType}-${media.id}`;
      const episodeInfo = episodeInfoMap.get(key);
      return <MediaCard media={media} size="medium" fillWidth episodeInfo={episodeInfo} />;
    },
    [episodeInfoMap]
  );

  return (
    <MediaGrid
      data={mediaItems}
      isLoading={isLoading}
      emptyMessage={t("library.nothingToContinue")}
      emptyIcon={<Play size={48} className="text-subtext0" />}
      renderItem={renderItem}
      onRefresh={onRefresh}
      isRefreshing={refreshing}
      contentPaddingBottom={contentPaddingBottom}
    />
  );
}

interface DownloadsListProps {
  items: DownloadItem[];
  onPress: (download: DownloadItem) => void;
  onLongPress: (download: DownloadItem) => void;
  contentPaddingBottom?: number;
}

function DownloadsList({
  items,
  onPress,
  onLongPress,
  contentPaddingBottom = 0,
}: DownloadsListProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 16 + contentPaddingBottom }}
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

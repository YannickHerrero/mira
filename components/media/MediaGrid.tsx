import * as React from "react";
import { View, FlatList, RefreshControl, useWindowDimensions } from "react-native";
import { MediaCard } from "./MediaCard";
import { MediaCardSkeleton } from "./MediaCardSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "@/lib/icons";
import type { Media } from "@/lib/types";

interface MediaGridProps {
  data: Media[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  numColumns?: number;
  onEndReached?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  ListHeaderComponent?: React.ReactElement;
}

const CARD_WIDTH = 130;
const GAP = 16;
const PADDING = 16;
const TABLET_BREAKPOINT = 768;

export function MediaGrid({
  data,
  isLoading,
  emptyMessage = "No results found",
  emptyIcon,
  numColumns: customColumns,
  onEndReached,
  onRefresh,
  isRefreshing = false,
  ListHeaderComponent,
}: MediaGridProps) {
  const { width: screenWidth } = useWindowDimensions();

  // Calculate number of columns based on screen width
  // 2 columns on mobile, more on tablet
  const numColumns =
    customColumns ??
    (screenWidth >= TABLET_BREAKPOINT
      ? Math.max(3, Math.floor((screenWidth - 2 * PADDING + GAP) / (CARD_WIDTH + GAP)))
      : 2);

  const renderItem = React.useCallback(
    ({ item }: { item: Media }) => (
      <View style={{ flex: 1 / numColumns, padding: GAP / 2 }}>
        <MediaCard media={item} size="medium" fillWidth />
      </View>
    ),
    [numColumns]
  );

  const keyExtractor = React.useCallback(
    (item: Media) => `${item.mediaType}-${item.id}`,
    []
  );

  // Loading skeleton
  if (isLoading && data.length === 0) {
    return (
      <View className="flex-1" style={{ paddingHorizontal: PADDING - GAP / 2 }}>
        {ListHeaderComponent}
        <View className="flex-row flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ flex: 1 / numColumns, padding: GAP / 2 }}>
              <MediaCardSkeleton size="medium" fillWidth />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Empty state
  if (!isLoading && data.length === 0) {
    return (
      <View className="flex-1" style={{ paddingHorizontal: PADDING }}>
        {ListHeaderComponent}
        <EmptyState
          icon={emptyIcon ?? <Search size={48} className="text-muted-foreground" />}
          title={emptyMessage}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      key={numColumns} // Re-render when columns change
      contentContainerStyle={{
        paddingHorizontal: PADDING - GAP / 2,
        paddingVertical: GAP / 2,
      }}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    />
  );
}

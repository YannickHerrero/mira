import * as React from "react";
import { View, FlatList, RefreshControl, useWindowDimensions } from "react-native";
import { MediaCard } from "./MediaCard";
import { MediaCardSkeleton } from "./MediaCardSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "@/lib/icons";
import type { Media } from "@/lib/types";

const CARD_WIDTH = 130;

// Export layout constants for reuse in other components
export const GRID_GAP = 16;
export const GRID_PADDING = 16;
export const TABLET_BREAKPOINT = 768;

/** Hook to calculate responsive grid columns */
export function useGridColumns(customColumns?: number) {
  const { width: screenWidth } = useWindowDimensions();
  return (
    customColumns ??
    (screenWidth >= TABLET_BREAKPOINT
      ? Math.max(3, Math.floor((screenWidth - 2 * GRID_PADDING + GRID_GAP) / (CARD_WIDTH + GRID_GAP)))
      : 2)
  );
}

interface MediaGridProps {
  data: Media[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  numColumns?: number;
  /** Custom render function for grid items */
  renderItem?: (item: Media, index: number) => React.ReactElement;
  onEndReached?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  ListHeaderComponent?: React.ReactElement;
  contentPaddingBottom?: number;
}

export function MediaGrid({
  data,
  isLoading,
  emptyMessage = "No results found",
  emptyIcon,
  numColumns: customColumns,
  renderItem: customRenderItem,
  onEndReached,
  onRefresh,
  isRefreshing = false,
  ListHeaderComponent,
  contentPaddingBottom = 0,
}: MediaGridProps) {
  const numColumns = useGridColumns(customColumns);

  const renderItem = React.useCallback(
    ({ item, index }: { item: Media; index: number }) => (
      <View style={{ flex: 1 / numColumns, padding: GRID_GAP / 2 }}>
        {customRenderItem ? (
          customRenderItem(item, index)
        ) : (
          <MediaCard media={item} size="medium" fillWidth />
        )}
      </View>
    ),
    [numColumns, customRenderItem]
  );

  const keyExtractor = React.useCallback(
    (item: Media) => `${item.mediaType}-${item.id}`,
    []
  );

  // Loading skeleton
  if (isLoading && data.length === 0) {
    return (
      <View
        className="flex-1"
        style={{
          paddingHorizontal: GRID_PADDING - GRID_GAP / 2,
          paddingBottom: contentPaddingBottom,
        }}
      >
        {ListHeaderComponent}
        <View className="flex-row flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ flex: 1 / numColumns, padding: GRID_GAP / 2 }}>
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
      <View
        className="flex-1"
        style={{ paddingHorizontal: GRID_PADDING, paddingBottom: contentPaddingBottom }}
      >
        {ListHeaderComponent}
        <EmptyState
          icon={emptyIcon ?? <Search size={48} className="text-subtext0" />}
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
        paddingHorizontal: GRID_PADDING - GRID_GAP / 2,
        paddingTop: GRID_GAP / 2,
        paddingBottom: GRID_GAP / 2 + contentPaddingBottom,
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

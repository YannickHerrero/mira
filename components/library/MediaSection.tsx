import * as React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { MediaCard } from "@/components/media";
import { ChevronRight } from "@/lib/icons";
import type { Media } from "@/lib/types";

export interface MediaSectionItem {
  media: Media;
  episodeInfo?: {
    seasonNumber: number;
    episodeNumber: number;
  };
}

interface MediaSectionProps {
  title: string;
  items: Media[] | MediaSectionItem[];
  onSeeAll?: () => void;
  emptyMessage?: string;
}

// Type guard to check if item is MediaSectionItem (has media property)
function isMediaSectionItem(item: Media | MediaSectionItem): item is MediaSectionItem {
  return "media" in item;
}

export function MediaSection({
  title,
  items,
  onSeeAll,
  emptyMessage = "No items",
}: MediaSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View className="mb-6">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-lg font-semibold text-foreground">{title}</Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} className="flex-row items-center">
            <Text className="text-sm text-primary mr-1">See all</Text>
            <ChevronRight size={16} className="text-primary" />
          </Pressable>
        )}
      </View>

      {/* Horizontal scroll list */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {items.map((item) => {
          const media = isMediaSectionItem(item) ? item.media : item;
          const episodeInfo = isMediaSectionItem(item) ? item.episodeInfo : undefined;

          return (
            <View key={`${media.mediaType}-${media.id}`} className="px-1.5">
              <MediaCard
                media={media}
                size="medium"
                showBadge={false}
                episodeInfo={episodeInfo}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

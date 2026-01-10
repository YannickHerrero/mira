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
  /** Header style: default or muted (uppercase, 50% opacity) */
  headerStyle?: "default" | "muted";
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
  headerStyle = "default",
}: MediaSectionProps) {
  const isMuted = headerStyle === "muted";
  if (items.length === 0) {
    return null;
  }

  return (
    <View className="mb-12">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text
          className={
            isMuted
              ? "text-[10px] font-bold uppercase text-foreground/50"
              : "text-lg font-semibold text-foreground"
          }
        >
          {isMuted ? title.toUpperCase() : title}
        </Text>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} className="flex-row items-center">
            <Text
              className={
                isMuted
                  ? "text-[10px] font-bold uppercase text-lavender mr-1"
                  : "text-sm text-primary mr-1"
              }
            >
              {isMuted ? "SEE MORE" : "See all"}
            </Text>
            <ChevronRight size={isMuted ? 14 : 16} className={isMuted ? "text-lavender" : "text-primary"} />
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

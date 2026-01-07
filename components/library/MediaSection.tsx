import * as React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { MediaCard } from "@/components/media";
import { ChevronRight } from "@/lib/icons";
import type { Media } from "@/lib/types";

interface MediaSectionProps {
  title: string;
  items: Media[];
  onSeeAll?: () => void;
  emptyMessage?: string;
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
        {items.map((item) => (
          <View key={`${item.mediaType}-${item.id}`} className="px-1.5">
            <MediaCard media={item} size="medium" showBadge={false} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

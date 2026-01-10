import * as React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { SectionHeader } from "./SectionHeader";
import { ContinueWatchingItem } from "./ContinueWatchingItem";
import type { ContinueWatchingItem as ContinueWatchingItemType } from "@/hooks/useLibrary";

interface ContinueWatchingListProps {
  items: ContinueWatchingItemType[];
  maxItems?: number;
}

export function ContinueWatchingList({
  items,
  maxItems = 3,
}: ContinueWatchingListProps) {
  const router = useRouter();

  const handleSeeMore = () => {
    router.push("/library" as any);
  };

  if (items.length === 0) {
    return null;
  }

  const displayItems = items.slice(0, maxItems);

  return (
    <View className="mt-12">
      <SectionHeader title="Continue watching" onSeeMore={handleSeeMore} />
      <View className="gap-2">
        {displayItems.map((item) => (
          <ContinueWatchingItem
            key={`${item.media.mediaType}-${item.media.tmdbId}`}
            item={item}
          />
        ))}
      </View>
    </View>
  );
}

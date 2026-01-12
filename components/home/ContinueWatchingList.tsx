import * as React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "./SectionHeader";
import { ContinueWatchingItem } from "./ContinueWatchingItem";
import type { ContinueWatchingItem as ContinueWatchingItemType } from "@/hooks/useLibrary";

interface ContinueWatchingListProps {
  items: ContinueWatchingItemType[];
  maxItems?: number;
}

export function ContinueWatchingList({
  items,
  maxItems = 2,
}: ContinueWatchingListProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleSeeMore = () => {
    router.push("/library" as any);
  };

  if (items.length === 0) {
    return null;
  }

  const displayItems = items.slice(0, maxItems);

  return (
    <View>
      <SectionHeader title={t("home.continueWatching")} onSeeMore={handleSeeMore} />
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

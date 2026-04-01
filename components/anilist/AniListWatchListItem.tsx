import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { Plus, Minus, BookOpen } from "@/lib/icons";
import { lightImpact } from "@/lib/haptics";
import type { AniListMediaListEntry } from "@/lib/api/anilist";

function getTitle(title: { english: string | null; romaji: string | null; native: string | null }) {
  return title.english || title.romaji || title.native || "Unknown";
}

interface AniListWatchListItemProps {
  entry: AniListMediaListEntry;
  onUpdateProgress: (mediaId: number, newProgress: number, totalEpisodes: number | null) => void;
}

export function AniListWatchListItem({ entry, onUpdateProgress }: AniListWatchListItemProps) {
  const { t } = useTranslation();
  const { media, progress } = entry;
  const totalEpisodes = media.episodes;

  const handleDecrement = () => {
    if (progress <= 0) return;
    lightImpact();
    onUpdateProgress(media.id, progress - 1, totalEpisodes);
  };

  const handleIncrement = () => {
    if (totalEpisodes !== null && progress >= totalEpisodes) return;
    lightImpact();
    onUpdateProgress(media.id, progress + 1, totalEpisodes);
  };

  const progressText =
    totalEpisodes !== null
      ? t("library.anilistEpisodes", { progress, total: totalEpisodes })
      : t("library.anilistEpisodesUnknown", { progress });

  return (
    <View className="flex-row bg-surface0 rounded-lg overflow-hidden mb-3 border border-surface1">
      {/* Cover image */}
      <View className="w-16 h-24 bg-surface0">
        {media.coverImage?.medium ? (
          <Image
            source={{ uri: media.coverImage.medium }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <BookOpen size={20} className="text-subtext0" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 p-3 justify-center">
        <Text className="text-sm font-medium text-text" numberOfLines={2}>
          {getTitle(media.title)}
        </Text>
        <Text className="text-xs text-subtext0 mt-1">{progressText}</Text>
        {media.format && (
          <Text className="text-xs text-subtext0 mt-0.5">{media.format}</Text>
        )}
      </View>

      {/* Progress controls */}
      <View className="flex-row items-center pr-3 gap-2">
        <Pressable
          onPress={handleDecrement}
          disabled={progress <= 0}
          className="w-8 h-8 rounded-full bg-surface1 items-center justify-center active:opacity-70"
          style={{ opacity: progress <= 0 ? 0.3 : 1 }}
        >
          <Minus size={16} className="text-text" />
        </Pressable>

        <Text className="text-base font-semibold text-text min-w-[24px] text-center">
          {progress}
        </Text>

        <Pressable
          onPress={handleIncrement}
          disabled={totalEpisodes !== null && progress >= totalEpisodes}
          className="w-8 h-8 rounded-full bg-lavender items-center justify-center active:opacity-70"
          style={{
            opacity: totalEpisodes !== null && progress >= totalEpisodes ? 0.3 : 1,
          }}
        >
          <Plus size={16} className="text-crust" />
        </Pressable>
      </View>
    </View>
  );
}

import * as React from "react";
import { View, Pressable, Image, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Plus, Minus, BookOpen } from "@/lib/icons";
import { lightImpact } from "@/lib/haptics";
import type { AniListMediaListEntry } from "@/lib/api/anilist";
import { createTMDBClient } from "@/lib/api/tmdb";
import { useAniListStore } from "@/stores/anilist";
import { useApiKeyStore } from "@/stores/api-keys";
import { useLanguageStore } from "@/stores/language";
import {
  findMappingByAniListId,
  buildAniListMappingKey,
} from "@/lib/anilist-storage";

function getTitle(title: { english: string | null; romaji: string | null; native: string | null }) {
  return title.english || title.romaji || title.native || "Unknown";
}

interface AniListWatchListItemProps {
  entry: AniListMediaListEntry;
  onUpdateProgress: (mediaId: number, newProgress: number, totalEpisodes: number | null) => void;
}

export function AniListWatchListItem({ entry, onUpdateProgress }: AniListWatchListItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { media, progress } = entry;
  const totalEpisodes = media.episodes;

  const mappings = useAniListStore((s) => s.mappings);
  const setMapping = useAniListStore((s) => s.setMapping);
  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage);

  const [isNavigating, setIsNavigating] = React.useState(false);

  const handleNavigate = async () => {
    if (isNavigating) return;

    const existing = findMappingByAniListId(mappings, media.id);
    if (existing) {
      lightImpact();
      router.push({
        pathname: "/media/[id]",
        params: { id: existing.tmdbId.toString(), type: existing.mediaType },
      } as any);
      return;
    }

    if (!tmdbApiKey) return;

    setIsNavigating(true);
    try {
      const client = createTMDBClient(tmdbApiKey, resolvedLanguage);
      const title = getTitle(media.title);
      const isMovie = media.format === "MOVIE";
      const results = isMovie
        ? await client.searchMovies(title)
        : await client.searchTv(title);

      if (results.length > 0) {
        const result = results[0];
        const key = buildAniListMappingKey(result.id, result.mediaType);
        setMapping(key, {
          tmdbId: result.id,
          mediaType: result.mediaType,
          seasonNumber: null,
          anilistId: media.id,
          title,
          format: media.format,
          year: null,
        });

        lightImpact();
        router.push({
          pathname: "/media/[id]",
          params: { id: result.id.toString(), type: result.mediaType },
        } as any);
      }
    } finally {
      setIsNavigating(false);
    }
  };

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
      {/* Cover image + Info — tappable area */}
      <Pressable onPress={handleNavigate} className="flex-row flex-1 active:opacity-70">
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

        <View className="flex-1 p-3 justify-center">
          <Text className="text-sm font-medium text-text" numberOfLines={2}>
            {getTitle(media.title)}
          </Text>
          <Text className="text-xs text-subtext0 mt-1">{progressText}</Text>
          {media.format && (
            <Text className="text-xs text-subtext0 mt-0.5">{media.format}</Text>
          )}
          {isNavigating && (
            <ActivityIndicator size="small" className="mt-1" />
          )}
        </View>
      </Pressable>

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

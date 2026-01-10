import * as React from "react";
import { View, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Play, ChevronRight, Film, Tv } from "@/lib/icons";
import { lightImpact } from "@/lib/haptics";
import type { ContinueWatchingItem as ContinueWatchingItemType } from "@/hooks/useLibrary";
import { getPosterUrl } from "@/lib/types";

interface ContinueWatchingItemProps {
  item: ContinueWatchingItemType;
}

export function ContinueWatchingItem({ item }: ContinueWatchingItemProps) {
  const router = useRouter();
  const { media, progress } = item;
  const posterUrl = getPosterUrl(media.posterPath, "small");

  const handlePress = () => {
    lightImpact();
    router.push({
      pathname: "/media/[id]",
      params: {
        id: media.tmdbId.toString(),
        type: media.mediaType,
      },
    } as any);
  };

  const isTV = media.mediaType === "tv";
  const episodeLabel = isTV && progress.episodeNumber
    ? `Episode ${progress.episodeNumber}`
    : media.mediaType === "movie"
      ? "Movie"
      : "";

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center justify-between px-4 py-2"
    >
      <View className="flex-row items-center flex-1 gap-4">
        {/* Square thumbnail */}
        <View className="w-24 h-24 rounded-2xl overflow-hidden bg-muted">
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              {isTV ? (
                <Tv size={24} className="text-muted-foreground" />
              ) : (
                <Film size={24} className="text-muted-foreground" />
              )}
            </View>
          )}
        </View>

        {/* Info */}
        <View className="flex-1 gap-2">
          {/* Episode number */}
          <Text variant="body" className="text-foreground/50">
            {episodeLabel}
          </Text>

          {/* Title */}
          <Text variant="cardTitle" className="font-extrabold" numberOfLines={2}>
            {media.title}
          </Text>

          {/* Continue with play icon */}
          <View className="flex-row items-center gap-2">
            <Play size={14} className="text-foreground/50" />
            <Text variant="body" className="text-foreground/50">
              Continue
            </Text>
          </View>
        </View>
      </View>

      {/* Chevron */}
      <ChevronRight size={20} className="text-foreground/50" />
    </Pressable>
  );
}

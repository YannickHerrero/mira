import * as React from "react";
import { View, Image, Pressable, ImageBackground, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Play, Film } from "@/lib/icons";
import { lightImpact } from "@/lib/haptics";
import type { UpcomingRelease } from "@/lib/api/tmdb";
import { getPosterUrl } from "@/lib/types";

function formatReleaseDate(dateString: string): string {
  const releaseDate = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (releaseDate.getTime() === today.getTime()) {
    return "Today";
  }
  if (releaseDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  return releaseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface NewReleaseCardProps {
  release: UpcomingRelease;
  cardWidth: number;
}

export function NewReleaseCard({ release, cardWidth }: NewReleaseCardProps) {
  const router = useRouter();
  const { media, episodeInfo } = release;
  const posterUrl = getPosterUrl(media.posterPath, "medium");

  const handleWatch = () => {
    lightImpact();
    router.push({
      pathname: "/media/[id]",
      params: {
        id: media.id.toString(),
        type: media.mediaType,
      },
    } as any);
  };

  return (
    <View
      style={{ width: cardWidth }}
      className="h-[150px] rounded-2xl overflow-hidden"
    >
      {/* Blurred background */}
      {posterUrl ? (
        <ImageBackground
          source={{ uri: posterUrl }}
          style={{ flex: 1 }}
          blurRadius={25}
          resizeMode="cover"
        >
          <View className="flex-1 flex-row p-4 gap-4 bg-black/30">
            {/* Poster thumbnail */}
            <View className="w-[86px] h-[122px] rounded-lg overflow-hidden bg-muted">
              <Image
                source={{ uri: posterUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>

            {/* Info */}
            <View className="flex-1 justify-between">
              <View className="gap-2">
                {/* Release date badge */}
                <View className="self-start bg-mauve/10 rounded-lg px-1.5 py-0.5">
                  <Text variant="tag">
                    {formatReleaseDate(release.releaseDate)}
                  </Text>
                </View>

                {/* Title */}
                <Text variant="cardTitle" numberOfLines={2}>
                  {media.title}
                </Text>

                {/* Description or episode info */}
                <Text variant="subtitle" numberOfLines={2}>
                  {episodeInfo
                    ? `S${episodeInfo.seasonNumber} E${episodeInfo.episodeNumber} - ${episodeInfo.episodeName}`
                    : media.description || ""}
                </Text>
              </View>

              {/* Watch button */}
              <Pressable
                onPress={handleWatch}
                className="self-start flex-row items-center bg-[#cad3f5] rounded-lg py-2 px-4 gap-2"
              >
                <Play size={14} className="text-[#24273a]" fill="#24273a" />
                <Text variant="button" className="text-[#24273a]">
                  Watch
                </Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View className="flex-1 items-center justify-center bg-muted">
          <Film size={32} className="text-muted-foreground" />
        </View>
      )}
    </View>
  );
}

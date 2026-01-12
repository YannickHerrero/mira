import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Film, Tv } from "@/lib/icons";
import { lightImpact } from "@/lib/haptics";
import { getPosterUrl } from "@/lib/types";
import type { UpcomingRelease } from "@/lib/api/tmdb";
import { cn } from "@/lib/utils";

interface ReleaseItemProps {
  release: UpcomingRelease;
}

export function ReleaseItem({ release }: ReleaseItemProps) {
  const router = useRouter();
  const posterUrl = getPosterUrl(release.media.posterPath, "small");

  const handlePress = () => {
    lightImpact();
    router.push({
      pathname: "/media/[id]",
      params: {
        id: release.media.id.toString(),
        type: release.media.mediaType,
      },
    } as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row bg-surface0 rounded-lg border border-surface1 p-3 mb-3 active:opacity-70"
    >
      {/* Poster */}
      <View className="w-16 h-24 rounded-md overflow-hidden bg-surface0 mr-3">
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={{ width: 64, height: 96 }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            {release.media.mediaType === "movie" ? (
              <Film size={24} className="text-subtext0" />
            ) : (
              <Tv size={24} className="text-subtext0" />
            )}
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 justify-center">
        <Text className="text-sm font-medium text-text mb-1">
          {release.media.title}
        </Text>

        {/* Release info */}
        {release.releaseType === "episode" && release.episodeInfo ? (
          <Text className="text-xs text-subtext0">
            S{release.episodeInfo.seasonNumber} E{release.episodeInfo.episodeNumber}{" "}
            • {release.episodeInfo.episodeName}
          </Text>
        ) : (
          <Text className="text-xs text-subtext0">Movie Release</Text>
        )}

        {/* Media type badge */}
        <View className="flex-row items-center mt-2 gap-2">
          <Badge variant="secondary" className="px-1.5 py-0.5 bg-lavender/10">
            <Text variant="sectionTitle" className="text-lavender font-medium">
              {release.media.mediaType === "movie" ? "Movie" : "TV"}
            </Text>
          </Badge>
          {release.media.score !== undefined && release.media.score > 0 && (
            <Text className="text-xs text-subtext0">
              {release.media.score.toFixed(1)}★
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

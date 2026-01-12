import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { Text } from "@/components/ui/text";
import { Star, Film, Tv } from "@/lib/icons";
import { lightImpact } from "@/lib/haptics";
import type { Media } from "@/lib/types";
import { getPosterUrl } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MediaCardProps {
  media: Media;
  size?: "small" | "medium" | "large";
  showBadge?: boolean;
  className?: string;
  /** When true, card fills container width with 2:3 aspect ratio */
  fillWidth?: boolean;
  /** Episode info for continue watching (TV shows only) */
  episodeInfo?: {
    seasonNumber: number;
    episodeNumber: number;
  };
}

const SIZES = {
  small: { width: 100, height: 150 },
  medium: { width: 130, height: 195 },
  large: { width: 160, height: 240 },
};

export function MediaCard({
  media,
  size = "medium",
  showBadge = true,
  className,
  fillWidth = false,
  episodeInfo,
}: MediaCardProps) {
  const router = useRouter();
  const { width, height } = SIZES[size];
  const posterUrl = getPosterUrl(media.posterPath, "medium");

  // When fillWidth is true, use flexible sizing with aspect ratio
  const containerStyle = fillWidth
    ? { width: "100%" as const }
    : { width };
  const posterStyle = fillWidth
    ? { width: "100%" as const, aspectRatio: 2 / 3 }
    : { width, height };

  const handlePress = () => {
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
    <Pressable
      onPress={handlePress}
      className={cn("", className)}
      style={containerStyle}
    >
      {/* Poster */}
      <View
        className="rounded-lg overflow-hidden bg-surface0"
        style={posterStyle}
      >
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={fillWidth ? { width: "100%", height: "100%" } : { width, height }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            {media.mediaType === "movie" ? (
              <Film size={32} className="text-subtext0" />
            ) : (
              <Tv size={32} className="text-subtext0" />
            )}
          </View>
        )}

        {/* Media type badge */}
        {showBadge && (
          <View className="absolute top-1.5 left-1.5 overflow-hidden rounded">
            <BlurView intensity={45} tint="dark" className="px-1.5 py-0.5 bg-base/70">
              <Text variant="sectionTitle" className="text-white font-medium">
                {media.mediaType === "movie" ? "Movie" : "TV"}
              </Text>
            </BlurView>
          </View>
        )}

        {/* Rating badge */}
        {media.score !== undefined && media.score > 0 && (
          <View className="absolute top-1.5 right-1.5 overflow-hidden rounded">
            <BlurView
              intensity={45}
              tint="dark"
              className="flex-row items-center px-1.5 py-0.5 bg-base/70"
            >
              <Star size={10} className="text-yellow-400 mr-0.5" fill="#facc15" stroke="none" />
              <Text variant="caption" className="text-white">
                {media.score.toFixed(1)}
              </Text>
            </BlurView>
          </View>
        )}

        {/* Episode info badge for continue watching */}
        {episodeInfo && (
          <View className="absolute bottom-0 left-0 right-0 overflow-hidden">
            <BlurView intensity={45} tint="dark" className="px-2 py-1.5 bg-base/70">
              <Text variant="body" className="text-white font-medium">
                S{episodeInfo.seasonNumber} E{episodeInfo.episodeNumber}
              </Text>
            </BlurView>
          </View>
        )}
      </View>

      {/* Title and year */}
      <View className="mt-2" style={fillWidth ? undefined : { width }}>
        <Text
          className="text-sm font-medium text-text"
          numberOfLines={2}
        >
          {media.title}
        </Text>
        {media.year && (
          <Text className="text-xs text-subtext0 mt-0.5">
            {media.year}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

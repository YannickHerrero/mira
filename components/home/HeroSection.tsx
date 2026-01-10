import * as React from "react";
import { View, Image, Pressable, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { Play } from "@/lib/icons";
import { lightImpact } from "@/lib/haptics";
import type { Media } from "@/lib/types";
import { getBackdropUrl } from "@/lib/types";

interface HeroSectionProps {
  media: Media;
  episodeInfo?: {
    seasonNumber: number;
    episodeNumber: number;
  };
}

export function HeroSection({ media, episodeInfo }: HeroSectionProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const backdropUrl = getBackdropUrl(media.backdropPath, "large");

  // Hero height - taller to match Figma (roughly 435px on standard 393px wide phone)
  const heroHeight = screenWidth * 1.1;

  const handleContinueWatch = () => {
    lightImpact();
    router.push({
      pathname: "/media/[id]",
      params: {
        id: media.id.toString(),
        type: media.mediaType,
      },
    } as any);
  };

  const firstGenre = media.genres[0];

  return (
    <View style={{ height: heroHeight, marginBottom: 40 }}>
      {/* Backdrop image */}
      {backdropUrl ? (
        <Image
          source={{ uri: backdropUrl }}
          style={{
            width: screenWidth,
            height: heroHeight,
            position: "absolute",
            top: 0,
          }}
          resizeMode="cover"
        />
      ) : (
        <View className="flex-1 bg-muted" />
      )}

      {/* Gradient overlay - flush with bottom */}
      <LinearGradient
        colors={[
          "rgba(36, 39, 58, 0)",
          "rgba(36, 39, 58, 1)",
        ]}
        locations={[0, 1]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: heroHeight * 0.58,
        }}
      />

      {/* Content at bottom - overlapping below the image */}
      <View
        className="absolute left-0 right-0 px-4"
        style={{ bottom: -40 }}
      >
        <View className="gap-2 mb-4">
          {/* Genre badge */}
          {firstGenre && (
            <View className="self-start bg-[#1e2030] rounded-lg px-1.5 py-0.5">
              <Text variant="tag" className="text-[#cad3f5]">
                {firstGenre}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text variant="pageTitle" className="leading-tight" numberOfLines={2}>
            {media.title}
          </Text>

          {/* Description */}
          {media.description && (
            <Text variant="subtitle" numberOfLines={2}>
              {media.description}
            </Text>
          )}
        </View>

        {/* Continue watching button */}
        <Pressable
          onPress={handleContinueWatch}
          className="flex-row items-center justify-center bg-[#cad3f5] rounded-lg py-3.5 gap-4"
        >
          <Play size={16} className="text-[#24273a]" fill="#24273a" />
          <Text variant="button" className="text-[#24273a]">
            {episodeInfo
              ? t("home.continueEpisode", { season: episodeInfo.seasonNumber, episode: episodeInfo.episodeNumber })
              : t("home.continueWatching")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

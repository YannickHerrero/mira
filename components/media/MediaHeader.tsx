import * as React from "react";
import { View, Image, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Star } from "@/lib/icons";
import type { Media } from "@/lib/types";
import { getBackdropUrl, getPosterUrl } from "@/lib/types";

interface MediaHeaderProps {
  media: Media;
  /** Sidebar variant for iPad landscape two-column layout */
  variant?: "default" | "sidebar";
}

export function MediaHeader({ media, variant = "default" }: MediaHeaderProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const backdropUrl = getBackdropUrl(media.backdropPath, "large");
  const posterUrl = getPosterUrl(media.posterPath, "medium");

  // Sidebar variant: full height fixed panel
  if (variant === "sidebar") {
    return (
      <View className="flex-1">
        {/* Full-height backdrop */}
        <View className="absolute inset-0">
          {backdropUrl ? (
            <Image
              source={{ uri: backdropUrl }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 bg-surface0" />
          )}

          {/* Gradient overlay - from top and bottom */}
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "transparent"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 120,
            }}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "60%",
            }}
          />
        </View>

        {/* Content at bottom */}
        <View
          className="flex-1 justify-end px-6 pb-6"
          style={{ paddingTop: insets.top + 60 }}
        >
          {/* Poster */}
          <View className="rounded-lg overflow-hidden bg-surface0 shadow-lg mb-4" style={{ width: 140, height: 210 }}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={{ width: 140, height: 210 }}
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 bg-surface0" />
            )}
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-text" numberOfLines={3}>
            {media.title}
          </Text>

          {/* Metadata row */}
          <View className="flex-row items-center flex-wrap mt-3 gap-2">
            {media.year && (
              <Text className="text-sm text-subtext0">{media.year}</Text>
            )}

            {media.score !== undefined && media.score > 0 && (
              <View className="flex-row items-center">
                <Star size={14} className="text-yellow-400 mr-1" fill="#facc15" />
                <Text className="text-sm text-text font-medium">
                  {media.score.toFixed(1)}
                </Text>
              </View>
            )}

            <Badge variant="secondary" className="px-2 py-0.5">
              <Text className="text-xs uppercase">
                {media.mediaType === "movie" ? "Movie" : "TV Series"}
              </Text>
            </Badge>
          </View>

          {/* Genres */}
          {media.genres.length > 0 && (
            <View className="flex-row flex-wrap mt-3 gap-1">
              {media.genres.slice(0, 3).map((genre) => (
                <Badge key={genre} variant="outline" className="px-2 py-0.5">
                  <Text className="text-xs text-subtext0">{genre}</Text>
                </Badge>
              ))}
            </View>
          )}

          {/* Description - more lines in sidebar */}
          {media.description && (
            <Text
              className="text-sm text-subtext0 mt-4 leading-relaxed"
              numberOfLines={6}
            >
              {media.description}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Default variant: original layout
  const backdropHeight = screenWidth * 0.6;

  return (
    <View>
      {/* Backdrop */}
      <View style={{ height: backdropHeight }}>
        {backdropUrl ? (
          <Image
            source={{ uri: backdropUrl }}
            style={{ width: screenWidth, height: backdropHeight }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 bg-surface0" />
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)", "hsl(240, 10%, 3.9%)"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: backdropHeight * 0.7,
          }}
        />
      </View>

      {/* Content overlapping backdrop */}
      <View
        className="px-4"
        style={{ marginTop: -80 }}
      >
        <View className="flex-row">
          {/* Poster */}
          <View className="rounded-lg overflow-hidden bg-surface0 shadow-lg" style={{ width: 120, height: 180 }}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={{ width: 120, height: 180 }}
                resizeMode="cover"
              />
            ) : (
              <View className="flex-1 bg-surface0" />
            )}
          </View>

          {/* Info */}
          <View className="flex-1 ml-4 justify-end pb-2">
            {/* Title */}
            <Text className="text-xl font-bold text-text" numberOfLines={2}>
              {media.title}
            </Text>

            {/* Metadata row */}
            <View className="flex-row items-center flex-wrap mt-2 gap-2">
              {media.year && (
                <Text className="text-sm text-subtext0">{media.year}</Text>
              )}

              {media.score !== undefined && media.score > 0 && (
                <View className="flex-row items-center">
                  <Star size={14} className="text-yellow-400 mr-1" fill="#facc15" />
                  <Text className="text-sm text-text font-medium">
                    {media.score.toFixed(1)}
                  </Text>
                </View>
              )}

              <Badge variant="secondary" className="px-2 py-0.5">
                <Text className="text-xs uppercase">
                  {media.mediaType === "movie" ? "Movie" : "TV Series"}
                </Text>
              </Badge>
            </View>

            {/* Genres */}
            {media.genres.length > 0 && (
              <View className="flex-row flex-wrap mt-2 gap-1">
                {media.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="outline" className="px-2 py-0.5">
                    <Text className="text-xs text-subtext0">{genre}</Text>
                  </Badge>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {media.description && (
          <Text
            className="text-sm text-subtext0 mt-4 leading-relaxed"
            numberOfLines={4}
          >
            {media.description}
          </Text>
        )}
      </View>
    </View>
  );
}

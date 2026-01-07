import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Star, Film, Tv } from "@/lib/icons";
import { lightImpact } from "@/lib/haptics";
import type { Media } from "@/lib/types";
import { getPosterUrl } from "@/lib/types";
import { cn } from "@/lib/utils";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface MediaCardProps {
  media: Media;
  size?: "small" | "medium" | "large";
  showBadge?: boolean;
  className?: string;
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
}: MediaCardProps) {
  const router = useRouter();
  const { width, height } = SIZES[size];
  const posterUrl = getPosterUrl(media.posterPath, "medium");

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

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
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={cn("", className)}
      style={[{ width }, animatedStyle]}
    >
      {/* Poster */}
      <View
        className="rounded-lg overflow-hidden bg-muted"
        style={{ width, height }}
      >
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={{ width, height }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            {media.mediaType === "movie" ? (
              <Film size={32} className="text-muted-foreground" />
            ) : (
              <Tv size={32} className="text-muted-foreground" />
            )}
          </View>
        )}

        {/* Media type badge */}
        {showBadge && (
          <View className="absolute top-1.5 left-1.5">
            <Badge variant="secondary" className="px-1.5 py-0.5 bg-black/70">
              <Text className="text-[10px] text-white uppercase font-medium">
                {media.mediaType === "movie" ? "Movie" : "TV"}
              </Text>
            </Badge>
          </View>
        )}

        {/* Rating badge */}
        {media.score !== undefined && media.score > 0 && (
          <View className="absolute top-1.5 right-1.5 flex-row items-center bg-black/70 rounded px-1.5 py-0.5">
            <Star size={10} className="text-yellow-400 mr-0.5" fill="#facc15" />
            <Text className="text-[10px] text-white font-medium">
              {media.score.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Title and year */}
      <View className="mt-2" style={{ width }}>
        <Text
          className="text-sm font-medium text-foreground"
          numberOfLines={2}
        >
          {media.title}
        </Text>
        {media.year && (
          <Text className="text-xs text-muted-foreground mt-0.5">
            {media.year}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

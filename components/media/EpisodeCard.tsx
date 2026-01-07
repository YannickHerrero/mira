import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { Text } from "@/components/ui/text";
import { Play, Check } from "@/lib/icons";
import type { Episode } from "@/lib/types";
import { TMDB_IMAGE_BASE } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EpisodeCardProps {
  episode: Episode;
  onPress: () => void;
  watchProgress?: number; // 0-100
  isCompleted?: boolean;
}

export function EpisodeCard({ episode, onPress, watchProgress, isCompleted }: EpisodeCardProps) {
  const stillUrl = episode.stillPath
    ? `${TMDB_IMAGE_BASE}/w300${episode.stillPath}`
    : null;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row bg-card rounded-lg overflow-hidden mb-3 active:opacity-80"
    >
      {/* Thumbnail */}
      <View className="relative" style={{ width: 140, height: 80 }}>
        {stillUrl ? (
          <Image
            source={{ uri: stillUrl }}
            style={{ width: 140, height: 80 }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 bg-muted items-center justify-center">
            <Play size={24} className="text-muted-foreground" />
          </View>
        )}

        {/* Play overlay or completed indicator */}
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          {isCompleted ? (
            <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
              <Check size={20} className="text-primary-foreground" />
            </View>
          ) : (
            <View className="w-10 h-10 rounded-full bg-white/90 items-center justify-center">
              <Play size={20} className="text-black ml-0.5" fill="black" />
            </View>
          )}
        </View>

        {/* Progress bar */}
        {watchProgress !== undefined && watchProgress > 0 && (
          <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <View
              className="h-full bg-primary"
              style={{ width: `${watchProgress}%` }}
            />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 p-3 justify-center">
        <Text className="text-xs text-muted-foreground mb-0.5">
          Episode {episode.episodeNumber}
        </Text>
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {episode.title}
        </Text>
        {episode.runtime && (
          <Text className="text-xs text-muted-foreground mt-1">
            {episode.runtime} min
          </Text>
        )}
      </View>
    </Pressable>
  );
}

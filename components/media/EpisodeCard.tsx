import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { Text } from "@/components/ui/text";
import { Play, Check } from "@/lib/icons";
import type { Episode } from "@/lib/types";
import { TMDB_IMAGE_BASE } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EpisodeCardProps {
  episode: Episode;
  onPress?: () => void;
  onLongPress?: () => void;
  watchProgress?: number; // 0-100
  isCompleted?: boolean;
  /** When true, renders as a View instead of Pressable (for use with external press handlers) */
  asView?: boolean;
}

export function EpisodeCard({ episode, onPress, onLongPress, watchProgress, isCompleted, asView = false }: EpisodeCardProps) {
  const stillUrl = episode.stillPath
    ? `${TMDB_IMAGE_BASE}/w300${episode.stillPath}`
    : null;
  const releaseDate = episode.airDate ? new Date(`${episode.airDate}T00:00:00`) : null;
  const releaseTimestamp = releaseDate?.getTime();
  const isReleaseDateValid = releaseTimestamp !== undefined && !Number.isNaN(releaseTimestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isUnreleased = isReleaseDateValid && releaseTimestamp > today.getTime();
  const releaseLabel = isReleaseDateValid && releaseDate
    ? releaseDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;
  const showMeta = Boolean(isUnreleased && releaseLabel) || Boolean(episode.runtime);

  const Container = asView ? View : Pressable;
  const containerProps = asView ? {} : { onPress, onLongPress, delayLongPress: 400 };

  return (
    <Container
      {...containerProps}
      className={cn(
        "flex-row bg-surface0 rounded-lg overflow-hidden mb-3",
        !asView && "active:opacity-80"
      )}
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
          <View className="flex-1 bg-surface0 items-center justify-center">
            <Play size={24} className="text-subtext0" />
          </View>
        )}

        {/* Play overlay or completed indicator */}
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          {isCompleted ? (
            <View className="w-10 h-10 rounded-full bg-lavender items-center justify-center">
              <Check size={20} className="text-crust" />
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
              className="h-full bg-lavender"
              style={{ width: `${watchProgress}%` }}
            />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 p-3 justify-center">
        <Text className="text-xs text-subtext0 mb-0.5">
          Episode {episode.episodeNumber}
        </Text>
        <Text className="text-sm font-medium text-text" numberOfLines={1}>
          {episode.title}
        </Text>
        {showMeta && (
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            {isUnreleased && releaseLabel && (
              <View className="rounded bg-mauve/10 px-1.5 py-0.5">
                <Text variant="tag" className="text-mauve">
                  Airs {releaseLabel}
                </Text>
              </View>
            )}
            {episode.runtime && (
              <Text className="text-xs text-subtext0">
                {episode.runtime} min
              </Text>
            )}
          </View>
        )}
      </View>
    </Container>
  );
}

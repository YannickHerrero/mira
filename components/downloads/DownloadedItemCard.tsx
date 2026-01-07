import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { Text } from "@/components/ui/text";
import { Download, Play, AlertCircle } from "@/lib/icons";
import { formatBytes } from "@/stores/downloads";
import { getPosterUrl } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { DownloadItem } from "@/stores/downloads";

interface DownloadedItemCardProps {
  download: DownloadItem;
  onPress: () => void;
  onLongPress: () => void;
}

export function DownloadedItemCard({
  download,
  onPress,
  onLongPress,
}: DownloadedItemCardProps) {
  const posterUrl = getPosterUrl(download.posterPath, "small");
  const isDownloading =
    download.status === "downloading" || download.status === "pending";
  const isFailed = download.status === "failed";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className="flex-row bg-card rounded-lg overflow-hidden mb-3 border border-border active:opacity-80"
    >
      {/* Poster */}
      <View className="w-20 h-28 bg-muted">
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Download size={24} className="text-muted-foreground" />
          </View>
        )}

        {/* Overlay for status */}
        {isDownloading && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center">
            <View className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 p-3 justify-center">
        <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
          {download.title}
        </Text>

        <View className="flex-row items-center mt-1 gap-2">
          {download.quality && (
            <Text className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {download.quality}
            </Text>
          )}
          {download.fileSize && (
            <Text className="text-xs text-muted-foreground">
              {formatBytes(download.fileSize)}
            </Text>
          )}
        </View>

        {/* Status indicator */}
        <View className="flex-row items-center mt-2">
          {isFailed ? (
            <>
              <AlertCircle size={14} className="text-destructive mr-1" />
              <Text className="text-xs text-destructive">
                Download failed - tap to retry
              </Text>
            </>
          ) : isDownloading ? (
            <>
              <Download size={14} className="text-muted-foreground mr-1" />
              <Text className="text-xs text-muted-foreground">
                {download.status === "pending"
                  ? "Waiting..."
                  : `${Math.round(download.progress)}%`}
              </Text>
            </>
          ) : (
            <Text className="text-xs text-muted-foreground">
              Ready to watch
            </Text>
          )}
        </View>

        {/* Progress bar for downloading */}
        {isDownloading && download.status === "downloading" && (
          <View className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
            <View
              className="h-full bg-primary"
              style={{ width: `${download.progress}%` }}
            />
          </View>
        )}
      </View>

      {/* Play button for completed */}
      {download.status === "completed" && (
        <View className="justify-center pr-3">
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
            <Play
              size={18}
              className="text-primary-foreground ml-0.5"
              fill="currentColor"
            />
          </View>
        </View>
      )}
    </Pressable>
  );
}

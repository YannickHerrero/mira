import * as React from "react";
import { View, Pressable, Platform } from "react-native";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Check } from "@/lib/icons";
import type { Stream } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  stream: Stream;
  onPress: () => void;
  onLongPress?: () => void;
  downloadStatus?: "downloading" | "completed" | "pending" | null;
  downloadProgress?: number;
  isDownloadedSource?: boolean;
}

export function SourceCard({
  stream,
  onPress,
  onLongPress,
  downloadStatus,
  downloadProgress,
  isDownloadedSource,
}: SourceCardProps) {
  const showDownloadIndicator =
    Platform.OS !== "web" &&
    (downloadStatus === "downloading" || downloadStatus === "pending");

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      className="bg-card rounded-lg p-4 mb-3 active:opacity-80 border border-border"
    >
      <View className="flex-row items-start justify-between">
        {/* Left side - main info */}
        <View className="flex-1">
          {/* Quality and badges row */}
          <View className="flex-row items-center flex-wrap gap-1.5">
            {stream.quality && (
              <Badge
                variant="default"
                className={cn(
                  "px-2 py-0.5",
                  stream.quality === "2160p" || stream.quality === "4K"
                    ? "bg-purple-600"
                    : stream.quality === "1080p"
                      ? "bg-blue-600"
                      : "bg-muted"
                )}
              >
                <Text className="text-xs font-bold text-white">
                  {stream.quality}
                </Text>
              </Badge>
            )}

            {stream.hdr && (
              <Badge variant="secondary" className="px-2 py-0.5 bg-amber-600">
                <Text className="text-xs font-medium text-white">{stream.hdr}</Text>
              </Badge>
            )}

            {stream.videoCodec && (
              <Badge variant="outline" className="px-2 py-0.5">
                <Text className="text-xs text-muted-foreground">
                  {stream.videoCodec}
                </Text>
              </Badge>
            )}

            {stream.audio && (
              <Badge variant="outline" className="px-2 py-0.5">
                <Text className="text-xs text-muted-foreground">{stream.audio}</Text>
              </Badge>
            )}

            {isDownloadedSource && (
              <Badge variant="default" className="px-2 py-0.5 bg-green-600">
                <Text className="text-xs font-medium text-white">Downloaded</Text>
              </Badge>
            )}
          </View>

          {/* Title */}
          <Text
            className="text-sm text-foreground mt-2"
            numberOfLines={2}
          >
            {stream.title}
          </Text>

          {/* Meta row */}
          <View className="flex-row items-center mt-2 gap-3">
            <Text className="text-xs text-muted-foreground">
              {stream.provider}
            </Text>

            {stream.size && (
              <Text className="text-xs text-muted-foreground">{stream.size}</Text>
            )}

            {stream.seeders !== undefined && stream.seeders > 0 && (
              <Text className="text-xs text-muted-foreground">
                {stream.seeders} seeders
              </Text>
            )}
          </View>

          {/* Languages */}
          {stream.languages.length > 0 && (
            <View className="flex-row flex-wrap gap-1 mt-2">
              {stream.languages.slice(0, 3).map((lang) => (
                <Text key={lang} className="text-xs text-muted-foreground">
                  {lang}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Right side - play button or download indicator */}
        <View className="ml-3">
          {isDownloadedSource ? (
            <View className="w-12 h-12 rounded-full bg-green-600 items-center justify-center">
              <Check size={20} className="text-white" />
            </View>
          ) : showDownloadIndicator ? (
            <View className="w-12 h-12 rounded-full bg-muted items-center justify-center relative">
              <Download size={20} className="text-foreground" />
              {downloadStatus === "downloading" && downloadProgress !== undefined && (
                <View
                  className="absolute bottom-0 left-0 right-0 h-1 bg-primary/30 rounded-full overflow-hidden"
                >
                  <View
                    className="h-full bg-primary"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </View>
              )}
            </View>
          ) : downloadStatus === "completed" ? (
            <View className="w-12 h-12 rounded-full bg-muted items-center justify-center">
              <Play size={20} className="text-muted-foreground ml-0.5" fill="currentColor" />
            </View>
          ) : (
            <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
              <Play size={20} className="text-primary-foreground ml-0.5" fill="currentColor" />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

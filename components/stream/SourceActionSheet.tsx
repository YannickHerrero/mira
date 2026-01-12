import * as React from "react";
import { View, Platform } from "react-native";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import {
  BottomSheetActionGroup,
  BottomSheetActionRow,
  BottomSheetContent,
  BottomSheetView,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Badge } from "@/components/ui/badge";
import { Play, Download } from "@/lib/icons";
import type { Stream } from "@/lib/types";
import { formatBytes } from "@/lib/download-manager";
import { cn } from "@/lib/utils";

interface SourceActionSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  stream: Stream | null;
  onPlay: () => Promise<boolean> | boolean;
  onDownload: () => void;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  playbackStatus?: "idle" | "caching" | "ready" | "failed";
}

export function SourceActionSheet({
  sheetRef,
  stream,
  onPlay,
  onDownload,
  isDownloading,
  isDownloaded,
  playbackStatus = "idle",
}: SourceActionSheetProps) {
  const { dismiss } = useBottomSheetModal();

  const isCaching = playbackStatus === "caching";
  const isReadyToPlay = playbackStatus === "ready";
  const isFailed = playbackStatus === "failed";
  const canPlay = !isCaching;
  const canDownload =
    Platform.OS !== "web" &&
    !isDownloading &&
    !isDownloaded &&
    !!stream &&
    (!!stream.url || !!stream.infoHash);

  return (
    <BottomSheetContent ref={sheetRef}>
      <BottomSheetView className="pb-8 gap-4">
        {stream && (
          <>
            {/* Stream info header */}
            <View className="mb-4">
              {/* Quality badges */}
              <View className="flex-row items-center flex-wrap gap-1.5 mb-2">
                {stream.quality && (
                  <Badge
                    variant="default"
                    className={cn(
                      "px-2 py-0.5",
                      stream.quality === "2160p" || stream.quality === "4K"
                        ? "bg-purple-600"
                        : stream.quality === "1080p"
                          ? "bg-blue-600"
                          : "bg-surface0"
                    )}
                  >
                    <Text className="text-xs font-bold text-white">
                      {stream.quality}
                    </Text>
                  </Badge>
                )}

                {stream.hdr && (
                  <Badge variant="secondary" className="px-2 py-0.5 bg-amber-600">
                    <Text className="text-xs font-medium text-white">
                      {stream.hdr}
                    </Text>
                  </Badge>
                )}

                {stream.videoCodec && (
                  <Badge variant="outline" className="px-2 py-0.5">
                    <Text className="text-xs text-subtext0">
                      {stream.videoCodec}
                    </Text>
                  </Badge>
                )}
              </View>

              {/* Title */}
              <Text
                className="text-sm text-text"
                numberOfLines={2}
              >
                {stream.title}
              </Text>

              {/* Meta info */}
              <View className="flex-row items-center mt-2 gap-3">
                <Text className="text-xs text-subtext0">
                  {stream.provider}
                </Text>
                {stream.size && (
                  <Text className="text-xs text-subtext0">
                    {stream.size}
                  </Text>
                )}
              </View>
            </View>

            {/* Actions */}
            <View className="border-t border-surface1/60 pt-4">
              <BottomSheetActionGroup>
                <BottomSheetActionRow
                  layout="grouped"
                  title={
                    isCaching
                      ? "Caching..."
                      : isReadyToPlay
                        ? "Play Now"
                        : isFailed
                          ? "Retry Cache"
                          : stream?.url
                            ? "Play Now"
                            : "Cache & Play"
                  }
                  description={
                    isCaching
                      ? "Preparing stream on Real-Debrid"
                      : isReadyToPlay
                        ? "Ready to stream"
                        : isFailed
                          ? "Tap to try again"
                          : stream?.url
                            ? "Stream directly"
                            : "Prepare stream on Real-Debrid"
                  }
                  icon={<Play size={20} className="text-text" />}
                  disabled={!canPlay}
                  onPress={async () => {
                    if (!canPlay) return;
                    const shouldDismiss = await onPlay();
                    if (shouldDismiss) {
                      dismiss();
                    }
                  }}
                />

                {Platform.OS !== "web" && (
                  <BottomSheetActionRow
                    layout="grouped"
                    title={
                      isDownloaded
                        ? "Already Downloaded"
                        : isDownloading
                          ? "Downloading..."
                          : "Download"
                    }
                    description={
                      isDownloaded
                        ? "Available offline"
                        : isDownloading
                        ? "Check progress in library"
                        : stream.sizeBytes
                          ? `${formatBytes(stream.sizeBytes)} will be saved`
                          : stream.url
                            ? "Save for offline viewing"
                            : "Caches on Real-Debrid first"

                    }
                    icon={<Download size={20} className="text-text" />}
                    className={!canDownload ? "opacity-60" : undefined}
                    onPress={() => {
                      if (canDownload) {
                        onDownload();
                        dismiss();
                      }
                    }}
                    disabled={!canDownload}
                  />
                )}
              </BottomSheetActionGroup>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetContent>
  );
}

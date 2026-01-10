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
  onPlay: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
  isDownloaded?: boolean;
}

export function SourceActionSheet({
  sheetRef,
  stream,
  onPlay,
  onDownload,
  isDownloading,
  isDownloaded,
}: SourceActionSheetProps) {
  const { dismiss } = useBottomSheetModal();

  const canDownload = Platform.OS !== "web" && !isDownloading && !isDownloaded;

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
                    <Text className="text-xs font-medium text-white">
                      {stream.hdr}
                    </Text>
                  </Badge>
                )}

                {stream.videoCodec && (
                  <Badge variant="outline" className="px-2 py-0.5">
                    <Text className="text-xs text-muted-foreground">
                      {stream.videoCodec}
                    </Text>
                  </Badge>
                )}
              </View>

              {/* Title */}
              <Text
                className="text-sm text-foreground"
                numberOfLines={2}
              >
                {stream.title}
              </Text>

              {/* Meta info */}
              <View className="flex-row items-center mt-2 gap-3">
                <Text className="text-xs text-muted-foreground">
                  {stream.provider}
                </Text>
                {stream.size && (
                  <Text className="text-xs text-muted-foreground">
                    {stream.size}
                  </Text>
                )}
              </View>
            </View>

            {/* Actions */}
            <View className="border-t border-border/60 pt-4">
              <BottomSheetActionGroup>
                <BottomSheetActionRow
                  layout="grouped"
                  title="Play Now"
                  description="Stream directly"
                  icon={<Play size={20} className="text-foreground" />}
                  onPress={() => {
                    onPlay();
                    dismiss();
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
                            : "Save for offline viewing"
                    }
                    icon={<Download size={20} className="text-foreground" />}
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

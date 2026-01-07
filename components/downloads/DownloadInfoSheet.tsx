import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  BottomSheetContent,
  BottomSheetView,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Trash, Play, RefreshCw, Download } from "@/lib/icons";
import { formatBytes, type DownloadItem } from "@/stores/downloads";
import { getPosterUrl } from "@/lib/types";

interface DownloadInfoSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  download: DownloadItem | null;
  onPlay: () => void;
  onDelete: () => void;
  onRetry?: () => void;
}

export function DownloadInfoSheet({
  sheetRef,
  download,
  onPlay,
  onDelete,
  onRetry,
}: DownloadInfoSheetProps) {
  const { dismiss } = useBottomSheetModal();

  if (!download) return null;

  const posterUrl = getPosterUrl(download.posterPath, "small");
  const isCompleted = download.status === "completed";
  const isFailed = download.status === "failed";
  const isDownloading =
    download.status === "downloading" || download.status === "pending";

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <BottomSheetContent ref={sheetRef}>
      <BottomSheetView className="px-4 pb-8 bg-background">
        {/* Header with poster and title */}
        <View className="flex-row mb-4">
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              className="w-16 h-24 rounded-lg"
              resizeMode="cover"
            />
          ) : (
            <View className="w-16 h-24 rounded-lg bg-muted items-center justify-center">
              <Download size={24} className="text-muted-foreground" />
            </View>
          )}
          <View className="flex-1 ml-3 justify-center">
            <Text className="text-lg font-semibold text-foreground" numberOfLines={2}>
              {download.title}
            </Text>
            {download.quality && (
              <Text className="text-sm text-muted-foreground mt-1">
                {download.quality}
              </Text>
            )}
          </View>
        </View>

        {/* Info rows */}
        <View className="border-t border-border pt-4 mb-4">
          <InfoRow label="File name" value={download.fileName} />
          {download.fileSize && (
            <InfoRow label="Size" value={formatBytes(download.fileSize)} />
          )}
          <InfoRow label="Added" value={formatDate(download.addedAt)} />
          {download.completedAt && (
            <InfoRow label="Completed" value={formatDate(download.completedAt)} />
          )}
          <InfoRow
            label="Status"
            value={
              isCompleted
                ? "Ready to watch"
                : isFailed
                  ? "Download failed"
                  : isDownloading
                    ? `Downloading (${Math.round(download.progress)}%)`
                    : download.status
            }
            valueClassName={isFailed ? "text-destructive" : undefined}
          />
        </View>

        {/* Actions */}
        <View className="gap-2">
          {isCompleted && (
            <Button
              className="flex-row items-center justify-center"
              onPress={() => {
                onPlay();
                dismiss();
              }}
            >
              <Play
                size={18}
                className="text-primary-foreground mr-2"
                fill="currentColor"
              />
              <Text className="text-primary-foreground font-semibold">
                Play Now
              </Text>
            </Button>
          )}

          {isFailed && onRetry && (
            <Button
              variant="outline"
              className="flex-row items-center justify-center"
              onPress={() => {
                onRetry();
                dismiss();
              }}
            >
              <RefreshCw size={18} className="text-foreground mr-2" />
              <Text className="text-foreground font-semibold">Retry Download</Text>
            </Button>
          )}

          <Button
            variant="destructive"
            className="flex-row items-center justify-center"
            onPress={() => {
              onDelete();
              dismiss();
            }}
          >
            <Trash size={18} className="text-destructive-foreground mr-2" />
            <Text className="text-destructive-foreground font-semibold">
              Delete Download
            </Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheetContent>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function InfoRow({ label, value, valueClassName }: InfoRowProps) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text
        className={`text-sm text-foreground flex-1 text-right ml-4 ${valueClassName ?? ""}`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

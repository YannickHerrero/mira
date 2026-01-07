import * as React from "react";
import { View, FlatList, ActivityIndicator, Platform } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { SourceCard } from "./SourceCard";
import { SourceActionSheet } from "./SourceActionSheet";
import { useDownloads, useDownloadStatus } from "@/hooks/useDownloads";
import { useMediaPlayer } from "@/hooks/useSettings";
import { mediumImpact } from "@/lib/haptics";
import { Check, Play } from "@/lib/icons";
import type { Stream, MediaType } from "@/lib/types";

interface SourceListProps {
  streams: Stream[];
  isLoading: boolean;
  error: string | null;
  onSelectStream: (stream: Stream) => void;
  // For download functionality
  tmdbId?: number;
  mediaType?: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  title?: string;
  posterPath?: string;
}

export function SourceList({
  streams,
  isLoading,
  error,
  onSelectStream,
  tmdbId,
  mediaType,
  seasonNumber,
  episodeNumber,
  title,
  posterPath,
}: SourceListProps) {
  const [selectedStream, setSelectedStream] = React.useState<Stream | null>(null);
  const actionSheetRef = React.useRef<BottomSheetModal>(null);
  
  const { queueDownload } = useDownloads();
  const { download, isDownloading, isDownloaded } = useDownloadStatus(
    tmdbId ?? 0,
    seasonNumber,
    episodeNumber
  );
  const { playMedia } = useMediaPlayer();

  // Sort streams to show downloaded source at top
  const sortedStreams = React.useMemo(() => {
    if (!download || download.status !== "completed") return streams;
    
    // Find the downloaded stream by URL and move it to top
    const downloadedIndex = streams.findIndex(s => s.url === download.streamUrl);
    if (downloadedIndex === -1) return streams;
    
    const downloadedStream = streams[downloadedIndex];
    const otherStreams = streams.filter((_, i) => i !== downloadedIndex);
    return [downloadedStream, ...otherStreams];
  }, [streams, download]);

  // Handler to play downloaded content
  const handlePlayDownloaded = React.useCallback(async () => {
    if (!download || download.status !== "completed") return;
    await playMedia({
      url: download.filePath,
      title: download.title,
      tmdbId: download.tmdbId,
      mediaType: download.mediaType,
      seasonNumber: download.seasonNumber,
      episodeNumber: download.episodeNumber,
    });
  }, [download, playMedia]);

  const handleLongPress = React.useCallback(
    (stream: Stream) => {
      // Only show action sheet on native platforms
      if (Platform.OS === "web") return;
      
      mediumImpact();
      setSelectedStream(stream);
      actionSheetRef.current?.present();
    },
    []
  );

  const handlePlay = React.useCallback(() => {
    if (selectedStream) {
      onSelectStream(selectedStream);
    }
  }, [selectedStream, onSelectStream]);

  const handleDownload = React.useCallback(async () => {
    if (!selectedStream || !tmdbId || !mediaType || !title) return;

    try {
      await queueDownload({
        tmdbId,
        mediaType,
        seasonNumber,
        episodeNumber,
        title,
        posterPath,
        stream: selectedStream,
      });
    } catch (err) {
      console.error("Failed to queue download:", err);
      // TODO: Show error toast
    }
  }, [
    selectedStream,
    tmdbId,
    mediaType,
    seasonNumber,
    episodeNumber,
    title,
    posterPath,
    queueDownload,
  ]);

  const renderItem = React.useCallback(
    ({ item }: { item: Stream }) => {
      // Check if this specific stream is the downloaded one
      const isThisStreamDownloaded = 
        download?.status === "completed" && 
        download.streamUrl === item.url;
      
      // For download status indicator (downloading/pending)
      const streamDownloadStatus = isThisStreamDownloaded
        ? "completed"
        : download?.status === "downloading" || download?.status === "pending"
          ? download.status
          : download?.status === "completed"
            ? "completed" // Another source is downloaded, show muted state
            : null;

      return (
        <SourceCard
          stream={item}
          onPress={() => onSelectStream(item)}
          onLongPress={() => handleLongPress(item)}
          downloadStatus={streamDownloadStatus}
          downloadProgress={download?.progress}
          isDownloadedSource={isThisStreamDownloaded}
        />
      );
    },
    [onSelectStream, handleLongPress, download]
  );

  const keyExtractor = React.useCallback(
    (item: Stream, index: number) => `${item.provider}-${item.title}-${index}`,
    []
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-12">
        <ActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-4">Loading sources...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-6">
        <Text className="text-destructive text-center">{error}</Text>
      </View>
    );
  }

  if (streams.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-6">
        <Text className="text-muted-foreground text-center">
          No sources found for this title.
        </Text>
        <Text className="text-muted-foreground text-center text-sm mt-2">
          Try a different quality or check back later.
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={sortedStreams}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Downloaded banner */}
            {Platform.OS !== "web" && download?.status === "completed" && (
              <View className="bg-green-600/10 border border-green-600/30 rounded-lg p-3 mb-4">
                <View className="flex-row items-center mb-2">
                  <Check size={18} className="text-green-600 mr-2" />
                  <Text className="text-green-600 font-medium">
                    Downloaded - Ready to watch offline
                  </Text>
                </View>
                <Button
                  size="sm"
                  className="flex-row items-center justify-center"
                  onPress={handlePlayDownloaded}
                >
                  <Play size={16} className="text-primary-foreground mr-2" fill="currentColor" />
                  <Text className="text-primary-foreground font-medium">
                    Play Downloaded
                  </Text>
                </Button>
              </View>
            )}

            <Text className="text-sm text-muted-foreground mb-1">
              {streams.length} source{streams.length !== 1 ? "s" : ""} found
            </Text>
            {Platform.OS !== "web" && !isDownloaded && (
              <Text className="text-xs text-muted-foreground mb-3">
                Long press a source to download for offline viewing
              </Text>
            )}
          </View>
        }
      />

      {Platform.OS !== "web" && (
        <BottomSheet>
          <SourceActionSheet
            sheetRef={actionSheetRef}
            stream={selectedStream}
            onPlay={handlePlay}
            onDownload={handleDownload}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded}
          />
        </BottomSheet>
      )}
    </>
  );
}

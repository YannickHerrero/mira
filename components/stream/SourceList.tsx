import * as React from "react";
import { View, FlatList, Platform } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomSheet } from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { SourceCard } from "./SourceCard";
import { SourceActionSheet } from "./SourceActionSheet";
import { useDownloads, useDownloadStatus } from "@/hooks/useDownloads";
import { useMediaPlayer } from "@/hooks/useSettings";
import { useApiKeyStore } from "@/stores/api-keys";
import { createRealDebridClient } from "@/lib/api/realdebrid";
import { mediumImpact } from "@/lib/haptics";
import { Check, Play, Eye } from "@/lib/icons";
import type { Stream, MediaType } from "@/lib/types";
import { useSourceFilters } from "@/hooks/useSourceFilters";
import { useStreamingPreferences } from "@/hooks/useStreamingPreferences";
import { useRealDebridTorrents } from "@/hooks/useRealDebridTorrents";
import { filterStreams, hasActiveFilters } from "@/lib/filter-streams";

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

function sanitizeFileName(value: string): string {
  return value.replace(INVALID_FILENAME_CHARS, "").replace(/\s+/g, " ").trim();
}

function getUrlExtension(url?: string): string | null {
  if (!url) return null;
  const cleanUrl = url.split(/[?#]/)[0];
  const extension = cleanUrl.split(".").pop();
  if (!extension || extension.length > 5) return null;
  return extension.toLowerCase();
}

function getStreamKey(stream: Stream): string {
  return stream.url ?? stream.infoHash ?? stream.title;
}

type PlaybackCacheStatus = "idle" | "caching" | "ready" | "failed";

interface PlaybackCacheState {
  status: PlaybackCacheStatus;
  streamKey?: string;
  url?: string;
}

function buildWebDownloadFileName({
  title,
  mediaTitle,
  episodeTitle,
  mediaType,
  seasonNumber,
  episodeNumber,
  year,
  quality,
  url,
}: {
  title?: string;
  mediaTitle?: string;
  episodeTitle?: string;
  mediaType?: MediaType;
  seasonNumber?: number;
  episodeNumber?: number;
  year?: number;
  quality?: string;
  url?: string;
}): string {
  const safeTitle = sanitizeFileName(mediaTitle ?? title ?? "download");
  const extension = getUrlExtension(url) ?? "mp4";
  const qualitySuffix = quality ? ` [${quality}]` : "";

  if (mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined) {
    const season = String(seasonNumber).padStart(2, "0");
    const episode = String(episodeNumber).padStart(2, "0");
    const safeEpisodeTitle = episodeTitle ? ` - ${sanitizeFileName(episodeTitle)}` : "";
    return `${safeTitle} - S${season}E${episode}${safeEpisodeTitle}${qualitySuffix}.${extension}`;
  }

  const yearSuffix = year ? ` (${year})` : "";
  return `${safeTitle}${yearSuffix}${qualitySuffix}.${extension}`;
}

function triggerWebDownload(url: string, fileName: string): void {
  const webScope = globalThis as typeof globalThis & {
    document?: Document;
  };
  const link = webScope.document?.createElement("a");
  if (!link) return;
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.target = "_blank";
  link.style.display = "none";
  webScope.document.body.appendChild(link);
  link.click();
  webScope.document.body.removeChild(link);
}

interface SourceListProps {
  streams: Stream[];
  recommendedStreams?: Stream[];
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
  mediaTitle?: string;
  episodeTitle?: string;
  year?: number;
  // Custom header component (e.g., hero section)
  ListHeaderComponent?: React.ReactNode;
}

export function SourceList({
  streams,
  recommendedStreams = [],
  isLoading,
  error,
  onSelectStream,
  tmdbId,
  mediaType,
  seasonNumber,
  episodeNumber,
  title,
  posterPath,
  mediaTitle,
  episodeTitle,
  year,
  ListHeaderComponent: CustomHeaderComponent,
}: SourceListProps) {
  const [selectedStream, setSelectedStream] = React.useState<Stream | null>(null);
  const [playbackState, setPlaybackState] = React.useState<PlaybackCacheState>({
    status: "idle",
  });
  const [showAllSources, setShowAllSources] = React.useState(false);
  const actionSheetRef = React.useRef<BottomSheetModal>(null);
  
  const realDebridApiKey = useApiKeyStore((s) => s.realDebridApiKey);
  const { queueDownload } = useDownloads();
  const { download, isDownloading, isDownloaded } = useDownloadStatus(
    tmdbId ?? 0,
    seasonNumber,
    episodeNumber
  );
  const { playMedia } = useMediaPlayer();
  const { preferredAudioLanguages, preferredSubtitleLanguages } = useStreamingPreferences();
  const { cachingHashes } = useRealDebridTorrents({ enabled: !!realDebridApiKey });

  const preferredLanguages = React.useMemo(() => {
    const subtitleLanguages = preferredSubtitleLanguages.filter((language) => language !== "Off");
    return [...preferredAudioLanguages, ...subtitleLanguages];
  }, [preferredAudioLanguages, preferredSubtitleLanguages]);

  // Get filter settings from store (hook loads filters on mount)
  const { qualities, languages } = useSourceFilters();
  const filters = React.useMemo(
    () => ({ qualities, languages }),
    [qualities, languages]
  );
  const filtersActive = hasActiveFilters(filters);


  const ensurePlaybackState = React.useCallback((stream: Stream) => {
    const streamKey = getStreamKey(stream);
    setPlaybackState((prev) => {
      if (prev.streamKey === streamKey) {
        return prev;
      }
      return {
        status: stream.url ? "ready" : "idle",
        streamKey,
        url: stream.url,
      };
    });
  }, []);

  const startPlaybackCache = React.useCallback(
    async (stream: Stream) => {
      if (!stream.infoHash || !realDebridApiKey) {
        setPlaybackState({ status: "failed", streamKey: getStreamKey(stream) });
        return;
      }

      const streamKey = getStreamKey(stream);
      setPlaybackState({ status: "caching", streamKey });

      try {
        const client = createRealDebridClient(realDebridApiKey);
        const url = await client.resolveInfoHashToStreamUrl(stream.infoHash, stream.title);
        setPlaybackState({ status: "ready", streamKey, url });
      } catch {
        setPlaybackState({ status: "failed", streamKey });
      }
    },
    [realDebridApiKey]
  );

  // Apply filters to streams (unless "Show All" is active)
  const filteredStreams = React.useMemo(() => {
    if (showAllSources || !filtersActive) {
      return streams;
    }
    return filterStreams(streams, filters);
  }, [streams, filters, showAllSources, filtersActive]);

  // Sort streams to show downloaded source at top, followed by recommended
  const sortedStreams = React.useMemo(() => {
    let result = [...filteredStreams];
    
    // 1. Move recommended to top
    if (recommendedStreams.length > 0) {
      const recommendedKeys = new Set(recommendedStreams.map((stream) => getStreamKey(stream)));
      const recommended = result.filter((stream) => recommendedKeys.has(getStreamKey(stream)));
      const others = result.filter((stream) => !recommendedKeys.has(getStreamKey(stream)));
      result = [...recommended, ...others];
    }

    // 2. Move downloaded to very top (overrides recommended)
    if (download && download.status === "completed") {
      const downloadedIndex = result.findIndex(s => s.url === download.streamUrl);
      if (downloadedIndex !== -1) {
        const downloadedStream = result[downloadedIndex];
        const otherStreams = result.filter((_, i) => i !== downloadedIndex);
        result = [downloadedStream, ...otherStreams];
      }
    }
    
    return result;
  }, [filteredStreams, download, recommendedStreams]);


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

  const openActionSheet = React.useCallback(
    (stream: Stream) => {
      if (Platform.OS === "web") return;
      ensurePlaybackState(stream);
      setSelectedStream(stream);
      actionSheetRef.current?.present();
    },
    [ensurePlaybackState]
  );

  const handleLongPress = React.useCallback(
    (stream: Stream) => {
      // Only show action sheet on native platforms
      if (Platform.OS === "web") return;

      mediumImpact();
      openActionSheet(stream);
    },
    [openActionSheet]
  );

  const handleCardPress = React.useCallback(
    (stream: Stream) => {
      if (stream.url) {
        onSelectStream(stream);
        return;
      }

      if (Platform.OS === "web") {
        return;
      }

      openActionSheet(stream);
      const streamKey = getStreamKey(stream);
      if (
        playbackState.streamKey !== streamKey ||
        playbackState.status === "idle" ||
        playbackState.status === "failed"
      ) {
        startPlaybackCache(stream);
      }
    },
    [onSelectStream, openActionSheet, playbackState, startPlaybackCache]
  );

  const handlePlay = React.useCallback(async () => {
    if (!selectedStream) return false;

    if (selectedStream.url) {
      await onSelectStream(selectedStream);
      return true;
    }

    const streamKey = getStreamKey(selectedStream);
    if (playbackState.status === "ready" && playbackState.streamKey === streamKey && playbackState.url) {
      await onSelectStream({ ...selectedStream, url: playbackState.url });
      return true;
    }

    if (playbackState.status !== "caching") {
      await startPlaybackCache(selectedStream);
    }

    return false;
  }, [selectedStream, onSelectStream, playbackState, startPlaybackCache]);

  const handleDownload = React.useCallback(async () => {
    if (!selectedStream || !tmdbId || !mediaType || !title) return;
    if (!selectedStream.url && !selectedStream.infoHash) return;

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

  const selectedPlaybackState = React.useMemo<PlaybackCacheState>(() => {
    if (!selectedStream) {
      return { status: "idle" };
    }

    const streamKey = getStreamKey(selectedStream);
    if (playbackState.streamKey === streamKey) {
      return playbackState;
    }

    return {
      status: selectedStream.url ? "ready" : "idle",
      streamKey,
      url: selectedStream.url,
    };
  }, [selectedStream, playbackState]);

  const handleWebDownload = React.useCallback(
    (stream: Stream) => {
      if (Platform.OS !== "web" || !stream.url) return;
      const fileName = buildWebDownloadFileName({
        title,
        mediaTitle,
        episodeTitle,
        mediaType,
        seasonNumber,
        episodeNumber,
        year,
        quality: stream.quality,
        url: stream.url,
      });
      triggerWebDownload(stream.url, fileName);
    },
    [
      title,
      mediaTitle,
      episodeTitle,
      mediaType,
      seasonNumber,
      episodeNumber,
      year,
    ]
  );

  const renderItem = React.useCallback(
    ({ item }: { item: Stream }) => {
      // Check if this specific stream is the downloaded one
      const streamKey = getStreamKey(item);
      const isThisStreamDownloaded =
        download?.status === "completed" && download.streamUrl === item.url;

      const isRecommended = recommendedStreams.some(
        (stream) => getStreamKey(stream) === streamKey
      );

      const normalizedHash = item.infoHash?.toLowerCase();
      const isCaching = normalizedHash ? cachingHashes.has(normalizedHash) : false;

      // For download status indicator (downloading/pending/caching)
      const streamDownloadStatus = isThisStreamDownloaded
        ? "completed"
        : download?.status === "downloading" ||
            download?.status === "pending" ||
            download?.status === "caching"
          ? download.status
          : download?.status === "completed"
            ? "completed" // Another source is downloaded, show muted state
            : null;

       return (
          <SourceCard
            stream={item}
            onPress={() => handleCardPress(item)}
            onLongPress={() => handleLongPress(item)}
            onDownload={() => handleWebDownload(item)}
            showWebDownload={Platform.OS === "web" && !!item.url}
            downloadStatus={streamDownloadStatus}
            downloadProgress={download?.progress}
            isDownloadedSource={isThisStreamDownloaded}
            isRecommended={isRecommended}
            isCaching={isCaching}
            rawStreamName={item.rawStreamName}
            preferredLanguages={preferredLanguages}
          />

       );
    },
    [
      handleCardPress,
      handleLongPress,
      handleWebDownload,
      download,
      recommendedStreams,
      preferredLanguages,
      cachingHashes,
    ]
  );

  const keyExtractor = React.useCallback(
    (item: Stream, index: number) => `${item.provider}-${item.title}-${index}`,
    []
  );

  const loadingItems = React.useMemo(() => Array.from({ length: 6 }, (_, index) => index), []);

  if (isLoading) {
    return (
      <FlatList
        data={loadingItems}
        keyExtractor={(item) => `skeleton-${item}`}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<View>{CustomHeaderComponent}</View>}
        renderItem={() => (
          <View className="mb-3">
            <Skeleton className="h-24 rounded-lg" />
          </View>
        )}
      />
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-12 px-6">
        <Text className="text-red text-center">{error}</Text>
      </View>
    );
  }

  const listEmptyComponent = (
    <View className="flex-1 items-center justify-center py-12 px-6">
      {streams.length === 0 ? (
        <>
          <Text className="text-subtext0 text-center">
            No sources found for this title.
          </Text>
          <Text className="text-subtext0 text-center text-sm mt-2">
            Check back later for new sources.
          </Text>
        </>
      ) : (
        <>
          <Text className="text-subtext0 text-center">
            No sources match your filters.
          </Text>
          <Text className="text-subtext0 text-center text-sm mt-2">
            {streams.length} source{streams.length !== 1 ? "s" : ""} available
          </Text>
          <Button
            variant="secondary"
            className="flex-row items-center justify-center mt-4"
            onPress={() => setShowAllSources(true)}
          >
            <Eye size={16} className="text-text mr-2" />
            <Text className="text-text">
              Show All {streams.length} Sources
            </Text>
          </Button>
        </>
      )}
    </View>
  );

  return (
    <>
      <FlatList
        data={sortedStreams}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Custom header (e.g., hero section) */}
            {CustomHeaderComponent}

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
                  <Play size={16} className="text-crust mr-2" fill="currentColor" />
                  <Text className="text-crust font-medium">
                    Play Downloaded
                  </Text>
                </Button>
              </View>
            )}

            {streams.length > 0 && (
              <>
                <Text className="text-sm text-subtext0 mb-1">
                  {filtersActive && !showAllSources ? (
                    <>
                      Showing {filteredStreams.length} of {streams.length} source
                      {streams.length !== 1 ? "s" : ""} (filtered)
                    </>
                  ) : (
                    <>
                      {streams.length} source{streams.length !== 1 ? "s" : ""} found
                    </>
                  )}
                </Text>
                {recommendedStreams.length > 0 && !showAllSources && (
                  <Text className="text-xs font-semibold text-amber-500 mb-2 uppercase tracking-wider">
                    Recommended for you
                  </Text>
                )}
              </>
            )}
            {Platform.OS !== "web" && !isDownloaded && streams.length > 0 && (
              <Text className="text-xs text-subtext0 mb-3">
                Long press a source to download for offline viewing
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          streams.length === 0 || (filtersActive && !showAllSources) ? listEmptyComponent : null
        }
        ListFooterComponent={
          <View className="mt-4 mb-8">
            {filtersActive && !showAllSources && filteredStreams.length < streams.length ? (
              <Button
                variant="secondary"
                className="flex-row items-center justify-center"
                onPress={() => setShowAllSources(true)}
              >
                <Eye size={16} className="text-text mr-2" />
                <Text className="text-text">
                  Show All {streams.length} Sources
                </Text>
              </Button>
            ) : null}
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
            playbackStatus={selectedPlaybackState.status}
          />
        </BottomSheet>
      )}
    </>
  );
}

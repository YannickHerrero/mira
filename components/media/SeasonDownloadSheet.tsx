import * as React from "react";
import { View, Pressable, ActivityIndicator, Alert, ScrollView } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import { Text } from "@/components/ui/text";
import {
  BottomSheetContent,
  BottomSheetView,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Download, Check } from "@/lib/icons";
import { fetchBestSource } from "@/lib/fetch-best-source";
import { useDownloads } from "@/hooks/useDownloads";
import { useDownloadsStore } from "@/stores/downloads";
import { useApiKeyStore } from "@/stores/api-keys";
import { useStreamingPreferences } from "@/hooks/useStreamingPreferences";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { useLibraryActions } from "@/hooks/useLibrary";
import type { Episode, MediaType, Media } from "@/lib/types";

interface SeasonDownloadSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  episodes: Episode[];
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath?: string;
  imdbId: string | null;
  isAnime: boolean;
  originalTitle?: string;
}

export function SeasonDownloadSheet({
  sheetRef,
  episodes,
  tmdbId,
  mediaType,
  title,
  posterPath,
  imdbId,
  isAnime,
  originalTitle,
}: SeasonDownloadSheetProps) {
  const { dismiss } = useBottomSheetModal();
  const { startDownload } = useDownloads();
  const { saveProgress } = useWatchProgress();
  const { saveMedia } = useLibraryActions();
  const realDebridApiKey = useApiKeyStore((s) => s.realDebridApiKey);
  const { preferredAudioLanguages } = useStreamingPreferences();
  const activeDownloadId = useDownloadsStore((s) => s.activeDownloadId);

  const [downloadedEpisodes, setDownloadedEpisodes] = React.useState<Set<number>>(new Set());
  const [loadingEpisode, setLoadingEpisode] = React.useState<number | null>(null);
  const pendingEpisodeRef = React.useRef<number | null>(null);

  // Track when a download completes to mark the episode as downloaded
  const prevActiveDownloadId = React.useRef(activeDownloadId);
  React.useEffect(() => {
    const wasDownloading = prevActiveDownloadId.current !== null;
    const isNowIdle = activeDownloadId === null;

    if (wasDownloading && isNowIdle && pendingEpisodeRef.current !== null) {
      const episodeNum = pendingEpisodeRef.current;
      pendingEpisodeRef.current = null;
      setDownloadedEpisodes((prev) => new Set(prev).add(episodeNum));
      setLoadingEpisode(null);
    }

    prevActiveDownloadId.current = activeDownloadId;
  }, [activeDownloadId]);

  const handleDownloadEpisode = React.useCallback(
    async (episode: Episode) => {
      if (!imdbId || !realDebridApiKey) {
        Alert.alert("Error", "API keys are required to fetch sources.");
        return;
      }

      if (activeDownloadId) {
        Alert.alert("Download in Progress", "Please wait for the current download to finish.");
        return;
      }

      setLoadingEpisode(episode.episodeNumber);

      try {
        const bestSource = await fetchBestSource({
          imdbId,
          mediaType,
          season: episode.seasonNumber,
          episode: episode.episodeNumber,
          title,
          originalTitle,
          isAnime,
          realDebridApiKey,
          preferredLanguages: preferredAudioLanguages,
        });

        if (!bestSource) {
          setLoadingEpisode(null);
          Alert.alert("No Sources", "No sources found for this episode.");
          return;
        }

        pendingEpisodeRef.current = episode.episodeNumber;

        const episodeTitle = `${title} - S${String(episode.seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`;

        await startDownload({
          tmdbId,
          mediaType,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          title: episodeTitle,
          posterPath,
          stream: bestSource,
        });

        // Add to continue watching
        saveMedia({
          id: tmdbId,
          mediaType,
          title,
          posterPath,
          genres: [],
        } as Media);

        saveProgress({
          tmdbId,
          mediaType,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          position: 0,
          duration: 1,
        });
      } catch (err: unknown) {
        pendingEpisodeRef.current = null;
        setLoadingEpisode(null);
        const message = err instanceof Error ? err.message : "Download failed";
        Alert.alert("Download Error", message);
      }
    },
    [imdbId, realDebridApiKey, activeDownloadId, mediaType, title, originalTitle, isAnime, preferredAudioLanguages, tmdbId, posterPath, startDownload, saveMedia, saveProgress]
  );

  if (episodes.length === 0) return null;

  const seasonNumber = episodes[0].seasonNumber;

  return (
    <BottomSheetContent ref={sheetRef} snapPoints={["70%"]}>
      <BottomSheetView className="pb-8">
        {/* Header */}
        <View className="px-4 pb-4 border-b border-surface1/30">
          <Text className="text-lg font-semibold text-text">
            Download Season {seasonNumber}
          </Text>
          <Text className="text-sm text-subtext0 mt-1">
            {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Episode list */}
        <ScrollView className="px-4" style={{ maxHeight: 400 }}>
          {episodes.map((episode) => {
            const isDownloaded = downloadedEpisodes.has(episode.episodeNumber);
            const isLoading = loadingEpisode === episode.episodeNumber;

            return (
              <View
                key={episode.episodeNumber}
                className="flex-row items-center py-3 border-b border-surface1/20"
              >
                {/* Episode info */}
                <View className="flex-1 mr-3">
                  <Text className="text-sm font-medium text-text" numberOfLines={1}>
                    E{String(episode.episodeNumber).padStart(2, "0")} - {episode.title}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    {episode.runtime && (
                      <Text className="text-xs text-subtext0">{episode.runtime}m</Text>
                    )}
                    {episode.airDate && (
                      <Text className="text-xs text-subtext0">{episode.airDate}</Text>
                    )}
                  </View>
                </View>

                {/* Download button / status */}
                {isDownloaded ? (
                  <View className="w-10 h-10 rounded-full bg-green/20 items-center justify-center">
                    <Check size={20} className="text-green" />
                  </View>
                ) : isLoading ? (
                  <View className="w-10 h-10 items-center justify-center">
                    <ActivityIndicator size="small" />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleDownloadEpisode(episode)}
                    className="w-10 h-10 rounded-full bg-surface0 items-center justify-center active:opacity-70"
                    disabled={activeDownloadId !== null}
                  >
                    <Download size={20} className="text-text" />
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      </BottomSheetView>
    </BottomSheetContent>
  );
}

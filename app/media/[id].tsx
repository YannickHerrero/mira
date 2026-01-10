import * as React from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetActionRow,
  BottomSheetContent,
  BottomSheetView,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import {
  MediaHeader,
  SeasonPicker,
  EpisodeCard,
  MediaSectionSkeleton,
} from "@/components/media";
import { MediaSection } from "@/components/library";
import { ListSelectorSheet } from "@/components/lists";
import { Play, Heart, Check, Eye, EyeOff, ListChecks, List, ChevronLeft } from "@/lib/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useLibraryActions } from "@/hooks/useLibrary";
import { useListActions } from "@/hooks/useLists";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { useApiKeyStore } from "@/stores/api-keys";
import { useLanguageStore } from "@/stores/language";
import { createTMDBClient } from "@/lib/api/tmdb";
import { useEpisodes } from "@/hooks/useMedia";
import type { Media, MediaType, Season, Episode } from "@/lib/types";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";

interface EpisodeActionSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  episode: Episode | null;
  isCompleted: boolean;
  onToggleWatched: () => void;
  onMarkWatchedUpToHere: () => void;
}

function EpisodeActionSheet({
  sheetRef,
  episode,
  isCompleted,
  onToggleWatched,
  onMarkWatchedUpToHere,
}: EpisodeActionSheetProps) {
  const { dismiss } = useBottomSheetModal();
  const { t } = useTranslation();

  return (
    <BottomSheetContent ref={sheetRef}>
      <BottomSheetView className="pb-8 gap-4">
        {episode && (
          <>
            <Text className="text-lg font-semibold text-foreground">
              {t("media.episode", { number: episode.episodeNumber })}
            </Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {episode.title}
            </Text>

            <BottomSheetActionRow
              title={isCompleted ? t("media.markUnwatched") : t("media.markWatched")}
              icon={
                isCompleted ? (
                  <EyeOff size={20} className="text-foreground" />
                ) : (
                  <Eye size={20} className="text-foreground" />
                )
              }
              onPress={() => {
                onToggleWatched();
                dismiss();
              }}
            />

            <BottomSheetActionRow
              title={t("media.markWatchedUpTo")}
              icon={<ListChecks size={20} className="text-foreground" />}
              onPress={() => {
                onMarkWatchedUpToHere();
                dismiss();
              }}
            />
          </>
        )}
      </BottomSheetView>
    </BottomSheetContent>
  );
}

export default function MediaDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { id, type } = useLocalSearchParams<{ id: string; type: MediaType }>();

  const [media, setMedia] = React.useState<Media | null>(null);
  const [imdbId, setImdbId] = React.useState<string | null>(null);
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [episodeProgress, setEpisodeProgress] = React.useState<
    Map<string, { position: number; duration: number; completed: boolean }>
  >(new Map());
  const [isMovieWatched, setIsMovieWatched] = React.useState(false);
  const [similarMovies, setSimilarMovies] = React.useState<Media[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = React.useState(false);
  const [actionSheetEpisode, setActionSheetEpisode] = React.useState<Episode | null>(null);
  const [isInAnyList, setIsInAnyList] = React.useState(false);
  const actionSheetRef = React.useRef<BottomSheetModal>(null);
  const listSelectorSheetRef = React.useRef<BottomSheetModal>(null);

  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage);
  const {
    toggleFavorite,
    checkIsFavorite,
  } = useLibraryActions();
  const { checkIsInAnyList } = useListActions();
  const { getShowProgress, getProgress, markAsCompleted, clearProgress, markEpisodesAsCompleted } = useWatchProgress();
  const mediaType = type || "movie";
  const tmdbId = id ? parseInt(id, 10) : 0;

  // Fetch episodes for selected season (TV only)
  const { episodes, isLoading: isLoadingEpisodes } = useEpisodes(
    tmdbId,
    mediaType === "tv" ? selectedSeason : 0
  );

  // Fetch media details
  React.useEffect(() => {
    if (!tmdbApiKey || !tmdbId) {
      setError(t("media.invalidMediaId"));
      setIsLoading(false);
      return;
    }

    const fetchMedia = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = createTMDBClient(tmdbApiKey, resolvedLanguage);

        // Get IMDB ID
        const externalId = await client.getImdbId(tmdbId, mediaType);
        setImdbId(externalId ?? null);

        // Fetch media details by ID
        if (mediaType === "tv") {
          const { media: tvMedia, seasons: tvSeasons } =
            await client.getTvDetailsById(tmdbId);
          setMedia(tvMedia);
          setSeasons(tvSeasons);
          if (tvSeasons.length > 0) {
            setSelectedSeason(tvSeasons[0].seasonNumber);
          }
        } else {
          const movieMedia = await client.getMovieDetails(tmdbId);
          setMedia(movieMedia);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load media");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, [tmdbApiKey, tmdbId, mediaType, resolvedLanguage]);

  // Check favorite and list status when media loads
  React.useEffect(() => {
    if (!media) return;

    const checkStatus = async () => {
      try {
        const [favorite, inList] = await Promise.all([
          checkIsFavorite(media.id, media.mediaType),
          checkIsInAnyList(media.id, media.mediaType),
        ]);
        setIsFavorite(favorite);
        setIsInAnyList(inList);
      } catch {
        // Silently ignore errors
      }
    };

    checkStatus();
  }, [media, checkIsFavorite, checkIsInAnyList]);

  // Fetch episode watch progress for TV shows
  React.useEffect(() => {
    if (!media || media.mediaType !== "tv") return;

    const fetchProgress = async () => {
      try {
        const progress = await getShowProgress(media.id);
        setEpisodeProgress(progress);
      } catch {
        // Silently ignore errors
      }
    };

    fetchProgress();
  }, [media, getShowProgress]);

  // Fetch watch progress for movies
  React.useEffect(() => {
    if (!media || media.mediaType !== "movie") return;

    const fetchMovieProgress = async () => {
      try {
        const progress = await getProgress({
          tmdbId: media.id,
          mediaType: "movie",
        });
        setIsMovieWatched(progress?.completed ?? false);
      } catch {
        // Silently ignore errors
      }
    };

    fetchMovieProgress();
  }, [media, getProgress]);

  // Fetch recommended content (movies or TV shows)
  React.useEffect(() => {
    if (!media || !tmdbApiKey) return;

    const fetchRecommendations = async () => {
      setIsLoadingSimilar(true);
      try {
        const client = createTMDBClient(tmdbApiKey, resolvedLanguage);
        const recommendations = await client.getRecommendations(media.id, media.mediaType);
        setSimilarMovies(recommendations.slice(0, 10)); // Limit to 10 items
      } catch {
        // Silently ignore errors
      } finally {
        setIsLoadingSimilar(false);
      }
    };

    fetchRecommendations();
  }, [media, tmdbApiKey, resolvedLanguage]);

  const handleToggleFavorite = async () => {
    if (!media) return;
    try {
      await toggleFavorite(media, imdbId ?? undefined);
      setIsFavorite((prev) => !prev);
    } catch {
      // Silently ignore errors
    }
  };

  const handleOpenListSelector = () => {
    listSelectorSheetRef.current?.present();
  };

  const handleListSelectorComplete = async () => {
    if (!media) return;
    // Refresh list status
    const inList = await checkIsInAnyList(media.id, media.mediaType);
    setIsInAnyList(inList);
  };

  const handleWatchMovie = () => {
    router.push(`/media/${tmdbId}/sources?type=${mediaType}` as any);
  };

  const handleToggleMovieWatched = async () => {
    if (!media) return;

    try {
      if (isMovieWatched) {
        await clearProgress({
          tmdbId: media.id,
          mediaType: "movie",
        });
      } else {
        await markAsCompleted({
          tmdbId: media.id,
          mediaType: "movie",
        });
      }
      setIsMovieWatched((prev) => !prev);
    } catch {
      // Silently ignore errors
    }
  };

  const handleWatchEpisode = (episode: Episode) => {
    router.push(
      `/media/${tmdbId}/sources?type=${mediaType}&season=${episode.seasonNumber}&episode=${episode.episodeNumber}` as any
    );
  };

  const handleEpisodeLongPress = (episode: Episode) => {
    setActionSheetEpisode(episode);
    actionSheetRef.current?.present();
  };

  const handleToggleWatched = async (episode: Episode) => {
    if (!media) return;

    const progressKey = `${episode.seasonNumber}-${episode.episodeNumber}`;
    const progress = episodeProgress.get(progressKey);
    const isCompleted = progress?.completed ?? false;

    if (isCompleted) {
      // Mark as unwatched
      await clearProgress({
        tmdbId: media.id,
        mediaType: "tv",
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      });
    } else {
      // Mark as watched
      await markAsCompleted({
        tmdbId: media.id,
        mediaType: "tv",
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      });
    }

    // Refresh progress
    const updatedProgress = await getShowProgress(media.id);
    setEpisodeProgress(updatedProgress);
  };

  const handleMarkWatchedUpToHere = async (episode: Episode) => {
    if (!media) return;

    // Get all episodes from current season up to and including the selected episode
    const episodesToMark = episodes
      .filter(
        (ep) =>
          ep.seasonNumber === episode.seasonNumber &&
          ep.episodeNumber <= episode.episodeNumber
      )
      .map((ep) => ({
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
      }));

    await markEpisodesAsCompleted(media.id, episodesToMark);

    // Refresh progress
    const updatedProgress = await getShowProgress(media.id);
    setEpisodeProgress(updatedProgress);
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable
          onPress={() => router.back()}
          className="absolute z-10 overflow-hidden rounded-full"
          style={{ top: insets.top + 8, left: 16 }}
        >
          <BlurView intensity={50} tint="dark" className="p-2.5">
            <ChevronLeft size={24} className="text-foreground" />
          </BlurView>
        </Pressable>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (error || !media) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable
          onPress={() => router.back()}
          className="absolute z-10 overflow-hidden rounded-full"
          style={{ top: insets.top + 8, left: 16 }}
        >
          <BlurView intensity={50} tint="dark" className="p-2.5">
            <ChevronLeft size={24} className="text-foreground" />
          </BlurView>
        </Pressable>
        <Text className="text-destructive text-center">
          {error || t("media.failedToLoad")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom back button */}
      <Pressable
        onPress={() => router.back()}
        className="absolute z-10 overflow-hidden rounded-full"
        style={{ top: insets.top + 8, left: 16 }}
      >
        <BlurView intensity={50} tint="dark" className="p-2.5">
          <ChevronLeft size={24} className="text-foreground" />
        </BlurView>
      </Pressable>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header with backdrop and info */}
        <MediaHeader media={media} />

        {/* Action buttons */}
        <View className="flex-row px-4 mt-6 gap-3">
          {mediaType === "movie" ? (
            <Button
              className="flex-1 flex-row items-center justify-center"
              onPress={handleWatchMovie}
              disabled={!imdbId}
            >
              <Play size={18} className="text-primary-foreground mr-2" fill="currentColor" />
              <Text className="text-primary-foreground font-semibold">{t("media.watchNow")}</Text>
            </Button>
          ) : (
            <View className="flex-1">
              <Text className="text-sm text-muted-foreground mb-2">
                {t("media.selectEpisode")}
              </Text>
            </View>
          )}

          {mediaType === "movie" && (
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12"
              onPress={handleToggleMovieWatched}
            >
              {isMovieWatched ? (
                <Eye size={20} className="text-primary" />
              ) : (
                <EyeOff size={20} className="text-foreground" />
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12"
            onPress={handleOpenListSelector}
          >
            {isInAnyList ? (
              <Check size={20} className="text-primary" />
            ) : (
              <List size={20} className="text-foreground" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12"
            onPress={handleToggleFavorite}
          >
            <Heart
              size={20}
              className={isFavorite ? "text-red-500" : "text-foreground"}
              fill={isFavorite ? "#ef4444" : "none"}
            />
          </Button>
        </View>

        {/* TV Show: Season picker and episodes */}
        {mediaType === "tv" && seasons.length > 0 && (
          <View className="mt-6">
            <SeasonPicker
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSelectSeason={setSelectedSeason}
            />

            <View className="px-4 mt-2">
              {isLoadingEpisodes ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" />
                </View>
              ) : (
                episodes.map((episode) => {
                  const progressKey = `${episode.seasonNumber}-${episode.episodeNumber}`;
                  const progress = episodeProgress.get(progressKey);
                  const watchPercent = progress && progress.duration > 0
                    ? Math.round((progress.position / progress.duration) * 100)
                    : undefined;

                  return (
                    <EpisodeCard
                      key={progressKey}
                      episode={episode}
                      onPress={() => handleWatchEpisode(episode)}
                      onLongPress={() => handleEpisodeLongPress(episode)}
                      watchProgress={watchPercent}
                      isCompleted={progress?.completed}
                    />
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* Similar Content */}
        {similarMovies.length > 0 && (
          <View className="mt-6">
            {isLoadingSimilar ? (
              <MediaSectionSkeleton />
            ) : (
              <MediaSection
                title={t("home.youMightAlsoLike")}
                items={similarMovies}
              />
            )}
          </View>
        )}

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>

      {/* Episode Action Sheet */}
      <BottomSheet>
        <EpisodeActionSheet
          sheetRef={actionSheetRef}
          episode={actionSheetEpisode}
          isCompleted={
            actionSheetEpisode
              ? episodeProgress.get(
                  `${actionSheetEpisode.seasonNumber}-${actionSheetEpisode.episodeNumber}`
                )?.completed ?? false
              : false
          }
          onToggleWatched={() => {
            if (actionSheetEpisode) {
              handleToggleWatched(actionSheetEpisode);
            }
          }}
          onMarkWatchedUpToHere={() => {
            if (actionSheetEpisode) {
              handleMarkWatchedUpToHere(actionSheetEpisode);
            }
          }}
        />
      </BottomSheet>

      {/* List Selector Sheet */}
      <BottomSheet>
        <ListSelectorSheet
          sheetRef={listSelectorSheetRef}
          media={media}
          imdbId={imdbId ?? undefined}
          onComplete={handleListSelectorComplete}
        />
      </BottomSheet>
    </View>
  );
}

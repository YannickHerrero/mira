import * as React from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
  FlatList,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  MediaHeader,
  SeasonPicker,
  EpisodeCard,
} from "@/components/media";
import { SourceList } from "@/components/stream";
import { Play, Heart, Plus, Check } from "@/lib/icons";
import { useLibraryActions } from "@/hooks/useLibrary";
import { useApiKeyStore } from "@/stores/api-keys";
import { createTMDBClient } from "@/lib/api/tmdb";
import { useSources } from "@/hooks/useSources";
import { useEpisodes } from "@/hooks/useMedia";
import { useMediaPlayer } from "@/hooks/useSettings";
import type { Media, MediaType, Season, Episode } from "@/lib/types";

type ViewMode = "details" | "sources";

export default function MediaDetailScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: MediaType }>();
  const { playMedia } = useMediaPlayer();

  const [media, setMedia] = React.useState<Media | null>(null);
  const [imdbId, setImdbId] = React.useState<string | null>(null);
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [selectedEpisode, setSelectedEpisode] = React.useState<Episode | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("details");
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [isInWatchlist, setIsInWatchlist] = React.useState(false);

  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);
  const {
    toggleFavorite,
    addToWatchlist,
    removeFromWatchlist,
    checkIsFavorite,
    checkIsInWatchlist,
  } = useLibraryActions();
  const mediaType = type || "movie";
  const tmdbId = id ? parseInt(id, 10) : 0;

  // Fetch episodes for selected season (TV only)
  const { episodes, isLoading: isLoadingEpisodes } = useEpisodes(
    tmdbId,
    mediaType === "tv" ? selectedSeason : 0
  );

  // Fetch sources when in sources mode
  const {
    streams,
    isLoading: isLoadingSources,
    error: sourcesError,
  } = useSources({
    imdbId,
    season: mediaType === "tv" ? selectedEpisode?.seasonNumber : undefined,
    episode: mediaType === "tv" ? selectedEpisode?.episodeNumber : undefined,
    enabled: viewMode === "sources" && !!imdbId,
  });

  // Fetch media details
  React.useEffect(() => {
    if (!tmdbApiKey || !tmdbId) {
      setError("Invalid media ID");
      setIsLoading(false);
      return;
    }

    const fetchMedia = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const client = createTMDBClient(tmdbApiKey);

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
  }, [tmdbApiKey, tmdbId, mediaType]);

  // Check favorite and watchlist status when media loads
  React.useEffect(() => {
    if (!media) return;

    const checkStatus = async () => {
      try {
        const [favorite, watchlist] = await Promise.all([
          checkIsFavorite(media.id, media.mediaType),
          checkIsInWatchlist(media.id, media.mediaType),
        ]);
        setIsFavorite(favorite);
        setIsInWatchlist(watchlist);
      } catch {
        // Silently ignore errors
      }
    };

    checkStatus();
  }, [media, checkIsFavorite, checkIsInWatchlist]);

  const handleToggleFavorite = async () => {
    if (!media) return;
    try {
      await toggleFavorite(media, imdbId ?? undefined);
      setIsFavorite((prev) => !prev);
    } catch {
      // Silently ignore errors
    }
  };

  const handleToggleWatchlist = async () => {
    if (!media) return;
    try {
      if (isInWatchlist) {
        await removeFromWatchlist(media.id, media.mediaType);
      } else {
        await addToWatchlist(media, imdbId ?? undefined);
      }
      setIsInWatchlist((prev) => !prev);
    } catch {
      // Silently ignore errors
    }
  };

  const handleWatchMovie = () => {
    setViewMode("sources");
  };

  const handleWatchEpisode = (episode: Episode) => {
    setSelectedEpisode(episode);
    setViewMode("sources");
  };

  const handleSelectStream = async (stream: { url?: string }) => {
    if (!stream.url || !media) {
      return;
    }

    await playMedia({
      url: stream.url,
      title: selectedEpisode
        ? `${media.title} - S${selectedEpisode.seasonNumber}E${selectedEpisode.episodeNumber}`
        : media.title,
      tmdbId: media.id,
      mediaType: media.mediaType,
      seasonNumber: selectedEpisode?.seasonNumber,
      episodeNumber: selectedEpisode?.episodeNumber,
    });
  };

  const handleBackToDetails = () => {
    setViewMode("details");
    setSelectedEpisode(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Stack.Screen options={{ title: "", headerTransparent: true }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (error || !media) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Stack.Screen options={{ title: "Error", headerTransparent: true }} />
        <Text className="text-destructive text-center">
          {error || "Failed to load media"}
        </Text>
      </View>
    );
  }

  // Sources view
  if (viewMode === "sources") {
    return (
      <View className="flex-1 bg-background">
        <Stack.Screen
          options={{
            title: selectedEpisode
              ? `S${selectedEpisode.seasonNumber} E${selectedEpisode.episodeNumber}`
              : "Select Source",
            headerTransparent: false,
            headerLeft: () => (
              <Pressable onPress={handleBackToDetails} className="mr-4">
                <Text className="text-primary">Back</Text>
              </Pressable>
            ),
          }}
        />
        <SourceList
          streams={streams}
          isLoading={isLoadingSources}
          error={sourcesError}
          onSelectStream={handleSelectStream}
        />
      </View>
    );
  }

  // Details view
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "", headerTransparent: true }} />

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
              <Text className="text-primary-foreground font-semibold">Watch Now</Text>
            </Button>
          ) : (
            <View className="flex-1">
              <Text className="text-sm text-muted-foreground mb-2">
                Select an episode below to watch
              </Text>
            </View>
          )}

          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12"
            onPress={handleToggleWatchlist}
          >
            {isInWatchlist ? (
              <Check size={20} className="text-primary" />
            ) : (
              <Plus size={20} className="text-foreground" />
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
                episodes.map((episode) => (
                  <EpisodeCard
                    key={`${episode.seasonNumber}-${episode.episodeNumber}`}
                    episode={episode}
                    onPress={() => handleWatchEpisode(episode)}
                  />
                ))
              )}
            </View>
          </View>
        )}

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

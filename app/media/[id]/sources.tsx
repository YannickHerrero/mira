import * as React from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { SourceList } from "@/components/stream";
import { useApiKeyStore } from "@/stores/api-keys";
import { createTMDBClient } from "@/lib/api/tmdb";
import { useSources } from "@/hooks/useSources";
import { useMediaPlayer } from "@/hooks/useSettings";
import type { MediaType } from "@/lib/types";

export default function SourcesScreen() {
  const router = useRouter();
  const { id, type, season, episode } = useLocalSearchParams<{
    id: string;
    type: MediaType;
    season?: string;
    episode?: string;
  }>();

  const { playMedia } = useMediaPlayer();
  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);

  const [imdbId, setImdbId] = React.useState<string | null>(null);
  const [mediaTitle, setMediaTitle] = React.useState<string>("");
  const [posterPath, setPosterPath] = React.useState<string | undefined>();
  const [isAnime, setIsAnime] = React.useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const tmdbId = id ? parseInt(id, 10) : 0;
  const mediaType = type || "movie";
  const seasonNumber = season ? parseInt(season, 10) : undefined;
  const episodeNumber = episode ? parseInt(episode, 10) : undefined;

  // Fetch IMDB ID and media info
  React.useEffect(() => {
    if (!tmdbApiKey || !tmdbId) {
      setError("Invalid media ID");
      setIsLoadingMedia(false);
      return;
    }

    const fetchMediaInfo = async () => {
      setIsLoadingMedia(true);
      setError(null);

      try {
        const client = createTMDBClient(tmdbApiKey);

        // Get IMDB ID
        const externalId = await client.getImdbId(tmdbId, mediaType);
        setImdbId(externalId ?? null);

        // Fetch media details for title and poster
        let genres: string[] = [];
        if (mediaType === "tv") {
          const { media } = await client.getTvDetailsById(tmdbId);
          setMediaTitle(media.title);
          setPosterPath(media.posterPath);
          genres = media.genres;
        } else {
          const media = await client.getMovieDetails(tmdbId);
          setMediaTitle(media.title);
          setPosterPath(media.posterPath);
          genres = media.genres;
        }

        // Check if it's anime (genre ID 16 is Animation)
        setIsAnime(genres.includes("Animation"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load media");
      } finally {
        setIsLoadingMedia(false);
      }
    };

    fetchMediaInfo();
  }, [tmdbApiKey, tmdbId, mediaType]);

  // Fetch sources
  const {
    streams,
    recommendedStreams,
    isLoading: isLoadingSources,
    error: sourcesError,
  } = useSources({
    imdbId,
    mediaType,
    season: seasonNumber,
    episode: episodeNumber,
    isAnime,
    enabled: !!imdbId,
  });

  const handleSelectStream = async (stream: { url?: string }) => {
    if (!stream.url) return;

    const title =
      seasonNumber !== undefined && episodeNumber !== undefined
        ? `${mediaTitle} - S${seasonNumber}E${episodeNumber}`
        : mediaTitle;

    await playMedia({
      url: stream.url,
      title,
      tmdbId,
      mediaType,
      seasonNumber,
      episodeNumber,
    });
  };

  // Build screen title
  const screenTitle =
    seasonNumber !== undefined && episodeNumber !== undefined
      ? `S${seasonNumber} E${episodeNumber}`
      : "Select Source";

  // Build full title for source list
  const fullTitle =
    seasonNumber !== undefined && episodeNumber !== undefined
      ? `${mediaTitle} - S${seasonNumber}E${episodeNumber}`
      : mediaTitle;

  // Loading state
  if (isLoadingMedia) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Stack.Screen
          options={{
            title: screenTitle,
            headerTransparent: false,
          }}
        />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Stack.Screen
          options={{
            title: "Error",
            headerTransparent: false,
          }}
        />
        <Text className="text-destructive text-center">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: screenTitle,
          headerTransparent: false,
        }}
      />
      <SourceList
        streams={streams}
        recommendedStreams={recommendedStreams}
        isLoading={isLoadingSources}
        error={sourcesError}
        onSelectStream={handleSelectStream}
        tmdbId={tmdbId}
        mediaType={mediaType}
        seasonNumber={seasonNumber}
        episodeNumber={episodeNumber}
        title={fullTitle}
        posterPath={posterPath}
      />
    </View>
  );
}

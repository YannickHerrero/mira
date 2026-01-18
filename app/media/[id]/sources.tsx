import * as React from "react";
import { View, Pressable, Image } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceList } from "@/components/stream";
import { useApiKeyStore } from "@/stores/api-keys";
import { useLanguageStore } from "@/stores/language";
import { createTMDBClient } from "@/lib/api/tmdb";
import { useSources } from "@/hooks/useSources";
import { useMediaPlayer } from "@/hooks/useSettings";
import { ChevronLeft } from "@/lib/icons";
import { type MediaType, getBackdropUrl } from "@/lib/types";

export default function SourcesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, type, season, episode } = useLocalSearchParams<{
    id: string;
    type: MediaType;
    season?: string;
    episode?: string;
  }>();

  const { playMedia } = useMediaPlayer();
  const tmdbApiKey = useApiKeyStore((s) => s.tmdbApiKey);
  const resolvedLanguage = useLanguageStore((s) => s.resolvedLanguage);

  const [imdbId, setImdbId] = React.useState<string | null>(null);
  const [mediaTitle, setMediaTitle] = React.useState<string>("");
  const [mediaOriginalTitle, setMediaOriginalTitle] = React.useState<string | undefined>();
  const [posterPath, setPosterPath] = React.useState<string | undefined>();
  const [backdropPath, setBackdropPath] = React.useState<string | undefined>();
  const [episodeStillPath, setEpisodeStillPath] = React.useState<string | undefined>();
  const [episodeTitle, setEpisodeTitle] = React.useState<string | undefined>();
  const [genres, setGenres] = React.useState<string[]>([]);
  const [year, setYear] = React.useState<number | undefined>();
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
      const fetchStart = Date.now();
      setIsLoadingMedia(true);
      setError(null);

      try {
        const client = createTMDBClient(tmdbApiKey, resolvedLanguage);

        // Get IMDB ID
        const externalId = await client.getImdbId(tmdbId, mediaType);
        setImdbId(externalId ?? null);

        // Fetch media details for title, poster, backdrop, and genres
        let fetchedGenres: string[] = [];
        if (mediaType === "tv") {
          const { media } = await client.getTvDetailsById(tmdbId);
          setMediaTitle(media.title);
          setMediaOriginalTitle(media.titleOriginal);
          setPosterPath(media.posterPath);
          setBackdropPath(media.backdropPath);
          setGenres(media.genres);
          setYear(media.year);
          fetchedGenres = media.genres;

          // Fetch episode details if we have season and episode numbers
          if (seasonNumber !== undefined && episodeNumber !== undefined) {
            try {
              const episodes = await client.getSeasonEpisodes(tmdbId, seasonNumber);
              const episode = episodes.find((e) => e.episodeNumber === episodeNumber);
              if (episode) {
                setEpisodeTitle(episode.title);
                setEpisodeStillPath(episode.stillPath);
              }
            } catch {
              // Episode details are optional, continue without them
            }
          }
        } else {
          const media = await client.getMovieDetails(tmdbId);
          setMediaTitle(media.title);
          setMediaOriginalTitle(media.titleOriginal);
          setPosterPath(media.posterPath);
          setBackdropPath(media.backdropPath);
          setGenres(media.genres);
          setYear(media.year);
          fetchedGenres = media.genres;
        }

        // Check if it's anime (genre ID 16 is Animation)
        setIsAnime(fetchedGenres.includes("Animation"));

        // Log slow requests (> 2s)
        const duration = Date.now() - fetchStart;
        if (duration > 2000) {
          console.warn(`[Sources] Slow TMDB fetch: ${duration}ms for ${mediaType}/${tmdbId}`);
        }
      } catch (err) {
        console.error(`[Sources] TMDB fetch failed for ${mediaType}/${tmdbId}:`, err);
        setError(err instanceof Error ? err.message : "Failed to load media");
      } finally {
        setIsLoadingMedia(false);
      }
    };

    fetchMediaInfo();
  }, [tmdbApiKey, tmdbId, mediaType, resolvedLanguage]);

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
    title: mediaTitle,
    originalTitle: mediaOriginalTitle,
    year,
    isAnime,
    enabled: !!imdbId && !isLoadingMedia,
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

  // Build full title for source list
  const fullTitle =
    seasonNumber !== undefined && episodeNumber !== undefined
      ? `${mediaTitle} - S${seasonNumber}E${episodeNumber}`
      : mediaTitle;

  const isLoading = isLoadingMedia || isLoadingSources;

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-base">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="px-4" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            onPress={() => router.back()}
            className="overflow-hidden rounded-full self-start"
          >
            <BlurView intensity={50} tint="dark" className="p-2.5">
              <ChevronLeft size={24} className="text-text" />
            </BlurView>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red text-center">{error}</Text>
        </View>
      </View>
    );
  }

  // Hero section height (166px as per design system scaled down from Figma)
  const heroHeight = 166;
  // For TV shows with episodes, use the episode still; otherwise use the show/movie backdrop
  const heroImagePath = mediaType === "tv" && episodeStillPath ? episodeStillPath : backdropPath;
  const backdropUrl = getBackdropUrl(heroImagePath, "large");

  // Determine hero text content based on media type
  const heroMutedText =
    mediaType === "tv" ? mediaTitle.toLowerCase() : genres.slice(0, 2).join(" · ");
  const heroTitle =
    mediaType === "tv" && episodeTitle ? episodeTitle : mediaTitle;
  const heroSubtitle =
    mediaType === "tv" && seasonNumber !== undefined && episodeNumber !== undefined
      ? `Season ${seasonNumber} Episode ${episodeNumber}`
      : year?.toString();

  const heroContent = (
    <>
      {/* Backdrop Image */}
      {backdropUrl && (
        <Image
          source={{ uri: backdropUrl }}
          className="absolute inset-0 w-full h-full"
          resizeMode="cover"
        />
      )}

      {/* Gradient Overlay - covers bottom portion for smooth transition */}
      <LinearGradient
        colors={["rgba(36, 39, 58, 0)", "rgba(36, 39, 58, 1)"]}
        locations={[0, 1]}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: (heroHeight + insets.top) * 0.6,
        }}
      />

      {/* Back Button */}
      <View className="absolute px-4" style={{ top: insets.top + 8 }}>
        <Pressable
          onPress={() => router.back()}
          className="overflow-hidden rounded-full"
        >
          <BlurView intensity={50} tint="dark" className="p-2.5">
            <ChevronLeft size={24} className="text-text" />
          </BlurView>
        </Pressable>
      </View>

      {/* Hero Text Content - overlapping below the image */}
      <View className="absolute left-0 right-0 px-4" style={{ bottom: -40 }}>
        {heroMutedText && (
          <Text className="text-[10px] text-text opacity-50 lowercase mb-1">
            {heroMutedText}
          </Text>
        )}
        <Text className="text-2xl font-bold text-text mb-1">
          {heroTitle}
        </Text>
        {heroSubtitle && (
          <Text className="text-xs font-semibold text-text">
            {heroSubtitle}
          </Text>
        )}
      </View>
    </>
  );

  const heroSkeleton = (
    <>
      <View className="absolute inset-0 bg-surface0" />
      <View className="absolute px-4" style={{ top: insets.top + 8 }}>
        <Pressable
          onPress={() => router.back()}
          className="overflow-hidden rounded-full"
        >
          <BlurView intensity={50} tint="dark" className="p-2.5">
            <ChevronLeft size={24} className="text-text" />
          </BlurView>
        </Pressable>
      </View>
      <View className="absolute left-0 right-0 px-4" style={{ bottom: -40 }}>
        <Skeleton className="h-3 w-24 rounded mb-2" />
        <Skeleton className="h-6 w-48 rounded mb-2" />
        <Skeleton className="h-3 w-28 rounded" />
      </View>
    </>
  );

  // Hero section component to pass to SourceList
  const heroSection = (
    <View style={{ height: heroHeight + insets.top, marginBottom: 72, marginHorizontal: -16 }}>
      {isLoadingMedia ? heroSkeleton : heroContent}
    </View>
  );

  return (
    <View className="flex-1 bg-base">
      <Stack.Screen options={{ headerShown: false }} />

      <SourceList
        streams={streams}
        recommendedStreams={recommendedStreams}
        isLoading={isLoading}
        error={sourcesError}
        onSelectStream={handleSelectStream}
        tmdbId={tmdbId}
        mediaType={mediaType}
        seasonNumber={seasonNumber}
        episodeNumber={episodeNumber}
        title={fullTitle}
        posterPath={posterPath}
        mediaTitle={mediaTitle}
        episodeTitle={episodeTitle}
        year={year}
        ListHeaderComponent={heroSection}
      />
    </View>
  );
}

import * as React from "react";
import { View, StatusBar, ActivityIndicator, Platform, Alert } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { VLCVideoPlayer } from "@/components/player";
import type { PlayerError } from "@/components/player/VLCVideoPlayer.types";
import { Text } from "@/components/ui/text";
import { useWatchProgress } from "@/hooks/useWatchProgress";
import { useTranslation } from "react-i18next";
import type { MediaType } from "@/lib/types";

// Conditionally import screen orientation for native only
let ScreenOrientation: typeof import("expo-screen-orientation") | null = null;
if (Platform.OS !== "web") {
  ScreenOrientation = require("expo-screen-orientation");
}

// Save progress every 15 seconds
const PROGRESS_SAVE_INTERVAL = 15;

export default function PlayerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { url, title, tmdbId, mediaType, seasonNumber, episodeNumber } =
    useLocalSearchParams<{
      url: string;
      title?: string;
      tmdbId: string;
      mediaType: MediaType;
      seasonNumber?: string;
      episodeNumber?: string;
    }>();

  const { saveProgress, markAsCompleted, getProgress } = useWatchProgress();

  // Parse numeric params
  const parsedTmdbId = tmdbId ? parseInt(tmdbId, 10) : 0;
  const parsedSeasonNumber = seasonNumber ? parseInt(seasonNumber, 10) : undefined;
  const parsedEpisodeNumber = episodeNumber ? parseInt(episodeNumber, 10) : undefined;

  // Track initial position for resume
  const [initialPosition, setInitialPosition] = React.useState<number | undefined>(undefined);
  const [isLoadingProgress, setIsLoadingProgress] = React.useState(true);

  // Track last saved position to throttle saves
  const lastSaveTimeRef = React.useRef<number>(0);
  const lastPositionRef = React.useRef<number>(0);

  // Load saved progress on mount
  React.useEffect(() => {
    if (!parsedTmdbId || !mediaType) {
      setIsLoadingProgress(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const progress = await getProgress({
          tmdbId: parsedTmdbId,
          mediaType,
          seasonNumber: parsedSeasonNumber,
          episodeNumber: parsedEpisodeNumber,
        });

        if (progress && !progress.completed && progress.position > 10) {
          // Resume from saved position (if not completed and watched more than 10 seconds)
          // Subtract 5 seconds to give context
          setInitialPosition(Math.max(0, progress.position - 5));
          console.log("[PlayerScreen] Resuming from position:", progress.position - 5);
        }
      } catch (err) {
        console.error("[PlayerScreen] Failed to load progress:", err);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [parsedTmdbId, mediaType, parsedSeasonNumber, parsedEpisodeNumber, getProgress]);

  // Log player params on mount
  React.useEffect(() => {
    console.log("[PlayerScreen] Mounted with params:", {
      url: url ? `${url.substring(0, 100)}...` : "undefined",
      urlLength: url?.length,
      title,
      tmdbId: parsedTmdbId,
      mediaType,
      seasonNumber: parsedSeasonNumber,
      episodeNumber: parsedEpisodeNumber,
    });
  }, [url, title, parsedTmdbId, mediaType, parsedSeasonNumber, parsedEpisodeNumber]);

  // Unlock orientation when entering player, lock to portrait when leaving (native only)
  React.useEffect(() => {
    if (Platform.OS === "web" || !ScreenOrientation) return;

    ScreenOrientation.unlockAsync();

    return () => {
      ScreenOrientation?.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // Save progress before leaving (cleanup)
  React.useEffect(() => {
    return () => {
      // Save final position on unmount
      if (parsedTmdbId && mediaType && lastPositionRef.current > 0) {
        // Use the ref values since state might be stale
        saveProgress({
          tmdbId: parsedTmdbId,
          mediaType,
          seasonNumber: parsedSeasonNumber,
          episodeNumber: parsedEpisodeNumber,
          position: lastPositionRef.current,
          duration: 0, // Duration should already be saved
        });
      }
    };
  }, [parsedTmdbId, mediaType, parsedSeasonNumber, parsedEpisodeNumber, saveProgress]);

  const handleBack = () => {
    router.back();
  };

  const handleProgress = React.useCallback(
    (position: number, duration: number) => {
      // Always update the ref for cleanup
      lastPositionRef.current = position;

      // Skip if we don't have media context
      if (!parsedTmdbId || !mediaType) return;

      // Throttle saves to every PROGRESS_SAVE_INTERVAL seconds
      const now = Date.now();
      if (now - lastSaveTimeRef.current < PROGRESS_SAVE_INTERVAL * 1000) {
        return;
      }

      lastSaveTimeRef.current = now;

      // Save progress to database
      saveProgress({
        tmdbId: parsedTmdbId,
        mediaType,
        seasonNumber: parsedSeasonNumber,
        episodeNumber: parsedEpisodeNumber,
        position,
        duration,
      });

      console.log(`[PlayerScreen] Saved progress: ${Math.floor(position)}/${Math.floor(duration)}s`);
    },
    [parsedTmdbId, mediaType, parsedSeasonNumber, parsedEpisodeNumber, saveProgress]
  );

  const handleEnd = React.useCallback(() => {
    if (!parsedTmdbId || !mediaType) return;

    console.log("[PlayerScreen] Video ended, marking as completed");

    markAsCompleted({
      tmdbId: parsedTmdbId,
      mediaType,
      seasonNumber: parsedSeasonNumber,
      episodeNumber: parsedEpisodeNumber,
    });

    // Navigate back after a short delay
    setTimeout(() => {
      router.back();
    }, 500);
  }, [parsedTmdbId, mediaType, parsedSeasonNumber, parsedEpisodeNumber, markAsCompleted, router]);

  const handleError = React.useCallback((error: PlayerError) => {
    console.error("[PlayerScreen] Playback error:", error);
    
    // Show appropriate alert based on error type
    if (error.type === "unplayable_format") {
      const alertTitle = error.isIso 
        ? t("player.isoErrorTitle") 
        : t("player.formatErrorTitle");
      const alertMessage = error.isIso
        ? t("player.isoErrorMessage")
        : t("player.formatErrorMessage");
      
      Alert.alert(alertTitle, alertMessage, [
        {
          text: t("common.confirm"),
          onPress: () => router.back(),
        },
      ]);
    } else {
      // Generic error
      Alert.alert(t("player.errorTitle"), error.message, [
        {
          text: t("common.confirm"),
          onPress: () => router.back(),
        },
      ]);
    }
  }, [t, router]);

  // Show loading while fetching saved progress
  if (isLoadingProgress) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <StatusBar hidden />
        <Stack.Screen
          options={{
            headerShown: false,
            orientation: "all",
          }}
        />
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!url) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <StatusBar hidden />
        <Stack.Screen
          options={{
            headerShown: false,
            orientation: "all",
          }}
        />
        <Text className="text-white text-xl">No video URL provided</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />
      <Stack.Screen
        options={{
          headerShown: false,
          orientation: "all",
          animation: "fade",
        }}
      />
      <VLCVideoPlayer
        url={url}
        title={title}
        initialPosition={initialPosition}
        onProgress={handleProgress}
        onEnd={handleEnd}
        onBack={handleBack}
        onError={handleError}
      />
    </View>
  );
}

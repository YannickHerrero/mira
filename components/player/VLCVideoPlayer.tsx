import * as React from "react";
import { View, StyleSheet, StatusBar, Platform } from "react-native";
import { VLCPlayer, type VideoInfo, type Track } from "react-native-vlc-media-player";
import * as Brightness from "expo-brightness";
import { useKeepAwake } from "expo-keep-awake";
import { PlayerControls } from "./PlayerControls";
import { PlayerGestures } from "./PlayerGestures";
import { SelectedTrackType, type SelectedTrack, type AudioTrack, type TextTrack } from "react-native-video";
import { useStreamingPreferencesStore } from "@/stores/streaming-preferences";
import { findBestAudioTrack, findBestSubtitleTrack } from "@/lib/language-utils";

// Debug logging
const LOG_PREFIX = "[VLCPlayer]";

interface VLCVideoPlayerProps {
  url: string;
  title?: string;
  initialPosition?: number;
  onProgress?: (position: number, duration: number) => void;
  onEnd?: () => void;
  onBack?: () => void;
}

export interface PlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  brightness: number;
  playbackRate: number;
  audioTracks: AudioTrack[];
  textTracks: TextTrack[];
  selectedAudioTrack?: SelectedTrack;
  selectedTextTrack?: SelectedTrack;
  isLocked: boolean;
}

export function VLCVideoPlayer({
  url,
  title,
  initialPosition = 0,
  onProgress,
  onEnd,
  onBack,
}: VLCVideoPlayerProps) {
  // Keep screen awake during video playback
  useKeepAwake();

  const playerRef = React.useRef<VLCPlayer | null>(null);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const hideControlsTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalBrightnessRef = React.useRef<number>(1);

  // Seeking state - track when we're actively seeking to prevent progress updates from resetting position
  const isSeekingRef = React.useRef(false);
  const seekTargetPositionRef = React.useRef<number>(0);

  const [playerState, setPlayerState] = React.useState<PlayerState>({
    isPlaying: true,
    isBuffering: true,
    position: initialPosition,
    duration: 0,
    volume: 255, // VLC uses 0-255 for volume
    brightness: 1,
    playbackRate: 1,
    audioTracks: [],
    textTracks: [],
    isLocked: false,
  });

  // Seek position (VLC uses 0-1 range)
  const [seekValue, setSeekValue] = React.useState<number | undefined>(undefined);

  // Load initial brightness and store original value
  React.useEffect(() => {
    const loadBrightness = async () => {
      if (Platform.OS !== "web") {
        try {
          const currentBrightness = await Brightness.getBrightnessAsync();
          originalBrightnessRef.current = currentBrightness;
          setPlayerState((prev) => ({ ...prev, brightness: currentBrightness }));
        } catch (err) {
          console.warn(LOG_PREFIX, "Failed to get brightness:", err);
        }
      }
    };
    loadBrightness();

    // Restore original brightness on unmount
    return () => {
      if (Platform.OS !== "web") {
        Brightness.setBrightnessAsync(originalBrightnessRef.current).catch(() => {});
      }
    };
  }, []);

  // Log URL on mount
  React.useEffect(() => {
    console.log(LOG_PREFIX, "Mounting with URL:", url);
    console.log(LOG_PREFIX, "URL length:", url.length);
  }, [url]);

  // Auto-hide controls after 3 seconds
  const resetHideControlsTimer = React.useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    if (playerState.isPlaying && !playerState.isLocked) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [playerState.isPlaying, playerState.isLocked]);

  // Show controls and reset timer
  const showControls = React.useCallback(() => {
    setControlsVisible(true);
    resetHideControlsTimer();
  }, [resetHideControlsTimer]);

  // Toggle controls visibility
  const toggleControls = React.useCallback(() => {
    setControlsVisible((prev) => !prev);
    if (!controlsVisible) {
      resetHideControlsTimer();
    }
  }, [controlsVisible, resetHideControlsTimer]);

  // VLC event handlers
  const handlePlaying = (event: { duration: number; target: number; seekable: boolean }) => {
    console.log(LOG_PREFIX, "onPlaying - Video started playing", {
      duration: event.duration,
      seekable: event.seekable,
    });
    setPlayerState((prev) => ({
      ...prev,
      isPlaying: true,
      isBuffering: false,
      duration: event.duration / 1000, // Convert ms to seconds
    }));
  };

  const handlePaused = () => {
    console.log(LOG_PREFIX, "onPaused - Video paused");
    setPlayerState((prev) => ({
      ...prev,
      isPlaying: false,
    }));
  };

  const handleStopped = () => {
    console.log(LOG_PREFIX, "onStopped - Video stopped");
    setPlayerState((prev) => ({
      ...prev,
      isPlaying: false,
    }));
  };

  const handleBuffering = () => {
    console.log(LOG_PREFIX, "onBuffering");
    setPlayerState((prev) => ({
      ...prev,
      isBuffering: true,
    }));
  };

  const handleLoad = (event: VideoInfo) => {
    console.log(LOG_PREFIX, "onLoad - Video loaded", {
      duration: event.duration,
      audioTracks: event.audioTracks?.length ?? 0,
      textTracks: event.textTracks?.length ?? 0,
      videoSize: event.videoSize,
    });

    // Convert VLC tracks to our AudioTrack/TextTrack format
    const audioTracks: AudioTrack[] = (event.audioTracks || []).map((t: Track) => ({
      index: t.id,
      title: t.name,
      language: t.name,
      type: "audio" as const,
      selected: false,
    }));

    const textTracks: TextTrack[] = (event.textTracks || []).map((t: Track) => ({
      index: t.id,
      title: t.name,
      language: t.name,
      type: "text" as const,
      selected: false,
    }));

    // Get user's streaming preferences
    const { preferredAudioLanguages, preferredSubtitleLanguages } =
      useStreamingPreferencesStore.getState();

    // Auto-select best audio track based on preferences
    let selectedAudioTrack: SelectedTrack | undefined;
    if (preferredAudioLanguages.length > 0 && audioTracks.length > 0) {
      const bestAudio = findBestAudioTrack(audioTracks, preferredAudioLanguages);
      if (bestAudio) {
        console.log(LOG_PREFIX, "Auto-selecting audio track:", bestAudio.title);
        selectedAudioTrack = { type: SelectedTrackType.INDEX, value: bestAudio.index };
      }
    }

    // Auto-select best subtitle track based on preferences
    let selectedTextTrack: SelectedTrack | undefined;
    if (preferredSubtitleLanguages.length > 0 && textTracks.length > 0) {
      const { track: bestSubtitle, shouldDisable } = findBestSubtitleTrack(
        textTracks,
        preferredSubtitleLanguages
      );
      if (shouldDisable) {
        console.log(LOG_PREFIX, "Auto-disabling subtitles (preference)");
        selectedTextTrack = { type: SelectedTrackType.DISABLED, value: undefined };
      } else if (bestSubtitle) {
        console.log(LOG_PREFIX, "Auto-selecting subtitle track:", bestSubtitle.title);
        selectedTextTrack = { type: SelectedTrackType.INDEX, value: bestSubtitle.index };
      }
    }

    setIsLoaded(true);
    setPlayerState((prev) => ({
      ...prev,
      duration: event.duration / 1000, // Convert ms to seconds
      audioTracks,
      textTracks,
      isBuffering: false,
      // Apply auto-selected tracks
      ...(selectedAudioTrack && { selectedAudioTrack }),
      ...(selectedTextTrack && { selectedTextTrack }),
    }));

    // Seek to initial position if provided
    if (initialPosition > 0 && event.duration > 0) {
      const seekPos = initialPosition / (event.duration / 1000);
      setSeekValue(Math.min(1, Math.max(0, seekPos)));
    }
  };

  const handleProgress = (event: {
    currentTime: number;
    duration: number;
    position: number;
    remainingTime: number;
    target: number;
  }) => {
    const currentTime = event.currentTime / 1000; // Convert ms to seconds
    const duration = event.duration / 1000;

    // If we're seeking, check if we've reached near the target position
    if (isSeekingRef.current) {
      const targetPos = seekTargetPositionRef.current;
      const tolerance = 2; // 2 seconds tolerance
      if (Math.abs(currentTime - targetPos) < tolerance) {
        // We've reached the target, stop seeking
        isSeekingRef.current = false;
        setSeekValue(undefined);
      } else {
        // Still seeking, don't update position from progress events
        // Only update duration if needed
        setPlayerState((prev) => ({
          ...prev,
          duration: duration > 0 ? duration : prev.duration,
          isBuffering: false,
        }));
        return;
      }
    }

    setPlayerState((prev) => ({
      ...prev,
      position: currentTime,
      duration: duration > 0 ? duration : prev.duration,
      isBuffering: false,
    }));

    onProgress?.(currentTime, duration);
  };

  const handleEnded = () => {
    console.log(LOG_PREFIX, "onEnded - Video playback ended");
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    onEnd?.();
  };

  const handleError = (error: any) => {
    // Check if this is a codec warning (non-fatal) vs actual error
    const message = error?.message || "";
    const isCodecWarning =
      message.includes("could not decode") ||
      message.includes("Codec not supported") ||
      message.includes("trhd") ||
      message.includes("TrueHD");

    if (isCodecWarning) {
      // Log codec issues as warnings - video usually still plays with fallback audio
      console.warn(LOG_PREFIX, "Codec warning (non-fatal):", message);
    } else {
      console.error(LOG_PREFIX, "onError - Video playback error:", error);
    }
  };

  // Control handlers
  const handlePlayPause = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    showControls();
  };

  const handleSeek = (time: number) => {
    const duration = playerState.duration;
    if (duration <= 0) return;

    const clampedTime = Math.max(0, Math.min(time, duration));
    const seekPos = clampedTime / duration;

    // Mark as seeking and store target position
    isSeekingRef.current = true;
    seekTargetPositionRef.current = clampedTime;

    // Use the ref method for seeking (more reliable than the prop)
    if (playerRef.current?.seek) {
      playerRef.current.seek(seekPos);
    } else {
      setSeekValue(seekPos);
    }

    setPlayerState((prev) => ({ ...prev, position: clampedTime }));
    showControls();

    // Safety timeout: if seek doesn't complete within 5 seconds, reset seeking state
    setTimeout(() => {
      if (isSeekingRef.current) {
        isSeekingRef.current = false;
        setSeekValue(undefined);
      }
    }, 5000);
  };

  const handleSeekRelative = (delta: number) => {
    handleSeek(playerState.position + delta);
  };

  const handleVolumeChange = (volume: number) => {
    // Convert 0-1 range to 0-255 for VLC
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const vlcVolume = Math.round(clampedVolume * 255);
    setPlayerState((prev) => ({ ...prev, volume: vlcVolume }));
    showControls();
  };

  const handleBrightnessChange = async (brightness: number) => {
    const clampedBrightness = Math.max(0, Math.min(1, brightness));
    setPlayerState((prev) => ({ ...prev, brightness: clampedBrightness }));

    if (Platform.OS !== "web") {
      try {
        await Brightness.setBrightnessAsync(clampedBrightness);
      } catch (err) {
        console.warn(LOG_PREFIX, "Failed to set brightness:", err);
      }
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlayerState((prev) => ({ ...prev, playbackRate: rate }));
    showControls();
  };

  const handleToggleLock = () => {
    setPlayerState((prev) => {
      const newIsLocked = !prev.isLocked;
      // Show controls when unlocking
      if (!newIsLocked) {
        setControlsVisible(true);
      }
      return { ...prev, isLocked: newIsLocked };
    });
  };

  const handleSelectAudioTrack = (track: SelectedTrack) => {
    console.log(LOG_PREFIX, "Selecting audio track:", track);
    setPlayerState((prev) => ({ ...prev, selectedAudioTrack: track }));
  };

  const handleSelectTextTrack = (track: SelectedTrack | undefined) => {
    console.log(LOG_PREFIX, "Selecting text track:", track);
    setPlayerState((prev) => ({ ...prev, selectedTextTrack: track }));
  };

  // Get numeric track value for VLC
  const getAudioTrackValue = (): number | undefined => {
    const track = playerState.selectedAudioTrack;
    if (!track) return undefined;
    if (track.type === "index" && typeof track.value === "number") {
      return track.value;
    }
    return undefined;
  };

  const getTextTrackValue = (): number | undefined => {
    const track = playerState.selectedTextTrack;
    if (!track) return undefined;
    if (track.type === SelectedTrackType.INDEX && typeof track.value === "number") {
      return track.value;
    }
    // Return -1 to disable subtitles
    if (track.type === SelectedTrackType.DISABLED) {
      return -1;
    }
    return undefined;
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // Reset timer when playing state changes
  React.useEffect(() => {
    if (playerState.isPlaying && !playerState.isLocked) {
      resetHideControlsTimer();
    } else {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      if (!playerState.isLocked) {
        setControlsVisible(true);
      }
    }
  }, [playerState.isPlaying, playerState.isLocked, resetHideControlsTimer]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <VLCPlayer
        ref={playerRef as any}
        source={{ uri: url }}
        style={styles.video}
        paused={!playerState.isPlaying}
        volume={playerState.volume}
        rate={playerState.playbackRate}
        seek={seekValue}
        audioTrack={getAudioTrackValue()}
        textTrack={getTextTrackValue()}
        onPlaying={handlePlaying}
        onPaused={handlePaused}
        onStopped={handleStopped}
        onBuffering={handleBuffering}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onEnd={handleEnded}
        onError={handleError}
        playInBackground
        autoplay
      />

      {/* Gesture layer */}
      <PlayerGestures
        onTap={toggleControls}
        onDoubleTapLeft={() => handleSeekRelative(-10)}
        onDoubleTapRight={() => handleSeekRelative(10)}
        onHorizontalSwipe={handleSeekRelative}
        onVolumeChange={handleVolumeChange}
        onBrightnessChange={handleBrightnessChange}
        currentVolume={playerState.volume / 255}
        currentBrightness={playerState.brightness}
        showControls={showControls}
        isLocked={playerState.isLocked}
      />

      {/* Controls overlay */}
      <PlayerControls
        visible={controlsVisible}
        playerState={{
          ...playerState,
          volume: playerState.volume / 255, // Convert to 0-1 for display
        }}
        title={title}
        isLoaded={isLoaded}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onBack={onBack}
        onPlaybackRateChange={handlePlaybackRateChange}
        onSelectAudioTrack={handleSelectAudioTrack}
        onSelectTextTrack={handleSelectTextTrack}
        onToggleLock={handleToggleLock}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});

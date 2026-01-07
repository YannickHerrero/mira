import * as React from "react";
import { View, StyleSheet, StatusBar, Platform } from "react-native";
import Video, {
  type VideoRef,
  type OnLoadData,
  type OnProgressData,
  type OnPlaybackStateChangedData,
  type OnVideoErrorData,
  type OnBufferData,
  type SelectedTrack,
  type TextTrack,
  type AudioTrack,
} from "react-native-video";
import { PlayerControls } from "./PlayerControls";
import { PlayerGestures } from "./PlayerGestures";

// Debug logging for video player
const LOG_PREFIX = "[VideoPlayer]";

interface VideoPlayerProps {
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
  playbackRate: number;
  audioTracks: AudioTrack[];
  textTracks: TextTrack[];
  selectedAudioTrack?: SelectedTrack;
  selectedTextTrack?: SelectedTrack;
}

export function VideoPlayer({
  url,
  title,
  initialPosition = 0,
  onProgress,
  onEnd,
  onBack,
}: VideoPlayerProps) {
  const videoRef = React.useRef<VideoRef | null>(null);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const hideControlsTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playerState, setPlayerState] = React.useState<PlayerState>({
    isPlaying: true,
    isBuffering: true,
    position: initialPosition,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    audioTracks: [],
    textTracks: [],
  });

  // Auto-hide controls after 3 seconds
  const resetHideControlsTimer = React.useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    if (playerState.isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [playerState.isPlaying]);

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

  // Log URL on mount
  React.useEffect(() => {
    console.log(LOG_PREFIX, "Mounting with URL:", url);
    console.log(LOG_PREFIX, "URL length:", url.length);
    console.log(LOG_PREFIX, "URL protocol:", url.split(":")[0]);
  }, [url]);

  // Video event handlers
  const handleLoad = (data: OnLoadData) => {
    console.log(LOG_PREFIX, "onLoad - Video loaded successfully", {
      duration: data.duration,
      naturalSize: data.naturalSize,
      audioTracks: data.audioTracks?.length ?? 0,
      textTracks: data.textTracks?.length ?? 0,
    });

    setIsLoaded(true);
    setPlayerState((prev) => ({
      ...prev,
      duration: data.duration,
      audioTracks: data.audioTracks || [],
      textTracks: data.textTracks || [],
      isBuffering: false,
    }));

    // Seek to initial position if provided
    if (initialPosition > 0 && videoRef.current) {
      videoRef.current.seek(initialPosition);
    }
  };

  const handleLoadStart = () => {
    console.log(LOG_PREFIX, "onLoadStart - Starting to load video...");
  };

  const handleReadyForDisplay = () => {
    console.log(LOG_PREFIX, "onReadyForDisplay - Video is ready to display");
  };

  const handleProgress = (data: OnProgressData) => {
    // Only log occasionally to avoid spam
    if (Math.floor(data.currentTime) % 10 === 0 && data.currentTime > 0) {
      console.log(LOG_PREFIX, "onProgress", {
        currentTime: data.currentTime.toFixed(1),
        playableDuration: data.playableDuration?.toFixed(1),
        seekableDuration: data.seekableDuration?.toFixed(1),
      });
    }

    setPlayerState((prev) => ({
      ...prev,
      position: data.currentTime,
      isBuffering: false,
    }));

    onProgress?.(data.currentTime, playerState.duration);
  };

  const handlePlaybackStateChanged = (data: OnPlaybackStateChangedData) => {
    console.log(LOG_PREFIX, "onPlaybackStateChanged", {
      isPlaying: data.isPlaying,
      isSeeking: data.isSeeking,
    });

    setPlayerState((prev) => ({
      ...prev,
      isPlaying: data.isPlaying,
      isBuffering: data.isSeeking || false,
    }));
  };

  const handleBuffer = (data: OnBufferData) => {
    console.log(LOG_PREFIX, "onBuffer", { isBuffering: data.isBuffering });

    setPlayerState((prev) => ({
      ...prev,
      isBuffering: data.isBuffering,
    }));
  };

  const handleError = (error: OnVideoErrorData) => {
    console.error(LOG_PREFIX, "onError - Video playback error:", {
      error: error.error,
    });
  };

  const handleEnd = () => {
    console.log(LOG_PREFIX, "onEnd - Video playback ended");
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    onEnd?.();
  };

  const handleVideoPlaybackRateChange = (data: { playbackRate: number }) => {
    console.log(LOG_PREFIX, "onPlaybackRateChange", { rate: data.playbackRate });
  };

  const handleVideoSeek = (data: { currentTime: number; seekTime: number }) => {
    console.log(LOG_PREFIX, "onSeek", {
      from: data.currentTime.toFixed(1),
      to: data.seekTime.toFixed(1),
    });
  };

  // Control handlers
  const handlePlayPause = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    showControls();
  };

  const handleSeek = (time: number) => {
    const clampedTime = Math.max(0, Math.min(time, playerState.duration));
    videoRef.current?.seek(clampedTime);
    setPlayerState((prev) => ({ ...prev, position: clampedTime }));
    showControls();
  };

  const handleSeekRelative = (delta: number) => {
    handleSeek(playerState.position + delta);
  };

  const handleVolumeChange = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setPlayerState((prev) => ({ ...prev, volume: clampedVolume }));
    showControls();
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlayerState((prev) => ({ ...prev, playbackRate: rate }));
    showControls();
  };

  const handleSelectAudioTrack = (track: SelectedTrack) => {
    setPlayerState((prev) => ({ ...prev, selectedAudioTrack: track }));
  };

  const handleSelectTextTrack = (track: SelectedTrack | undefined) => {
    setPlayerState((prev) => ({ ...prev, selectedTextTrack: track }));
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
    if (playerState.isPlaying) {
      resetHideControlsTimer();
    } else {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      setControlsVisible(true);
    }
  }, [playerState.isPlaying, resetHideControlsTimer]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <Video
        ref={videoRef}
        source={{ uri: url }}
        style={styles.video}
        resizeMode="contain"
        paused={!playerState.isPlaying}
        volume={playerState.volume}
        rate={playerState.playbackRate}
        selectedAudioTrack={playerState.selectedAudioTrack}
        selectedTextTrack={playerState.selectedTextTrack}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onReadyForDisplay={handleReadyForDisplay}
        onProgress={handleProgress}
        onPlaybackStateChanged={handlePlaybackStateChanged}
        onPlaybackRateChange={handleVideoPlaybackRateChange}
        onBuffer={handleBuffer}
        onSeek={handleVideoSeek}
        onError={handleError}
        onEnd={handleEnd}
        playInBackground
        playWhenInactive
        // Buffer settings for streaming
        bufferConfig={{
          minBufferMs: 15000,
          maxBufferMs: 50000,
          bufferForPlaybackMs: 2500,
          bufferForPlaybackAfterRebufferMs: 5000,
        }}
      />

      {/* Gesture layer */}
      <PlayerGestures
        onTap={toggleControls}
        onDoubleTapLeft={() => handleSeekRelative(-10)}
        onDoubleTapRight={() => handleSeekRelative(10)}
        onHorizontalSwipe={handleSeekRelative}
        onVerticalSwipe={handleVolumeChange}
        currentVolume={playerState.volume}
        showControls={showControls}
      />

      {/* Controls overlay */}
      <PlayerControls
        visible={controlsVisible}
        playerState={playerState}
        title={title}
        isLoaded={isLoaded}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onBack={onBack}
        onPlaybackRateChange={handlePlaybackRateChange}
        onSelectAudioTrack={handleSelectAudioTrack}
        onSelectTextTrack={handleSelectTextTrack}
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

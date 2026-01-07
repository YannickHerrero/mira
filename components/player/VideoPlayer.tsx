import * as React from "react";
import { View, StyleSheet, StatusBar, Platform } from "react-native";
import Video, {
  type VideoRef,
  type OnLoadData,
  type OnProgressData,
  type OnPlaybackStateChangedData,
  type SelectedTrack,
  type TextTrack,
  type AudioTrack,
} from "react-native-video";
import { PlayerControls } from "./PlayerControls";
import { PlayerGestures } from "./PlayerGestures";

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

  // Video event handlers
  const handleLoad = (data: OnLoadData) => {
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

  const handleProgress = (data: OnProgressData) => {
    setPlayerState((prev) => ({
      ...prev,
      position: data.currentTime,
      isBuffering: false,
    }));

    onProgress?.(data.currentTime, playerState.duration);
  };

  const handlePlaybackStateChanged = (data: OnPlaybackStateChangedData) => {
    setPlayerState((prev) => ({
      ...prev,
      isPlaying: data.isPlaying,
      isBuffering: data.isSeeking || false,
    }));
  };

  const handleBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
    setPlayerState((prev) => ({
      ...prev,
      isBuffering,
    }));
  };

  const handleEnd = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    onEnd?.();
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
        onLoad={handleLoad}
        onProgress={handleProgress}
        onPlaybackStateChanged={handlePlaybackStateChanged}
        onBuffer={handleBuffer}
        onEnd={handleEnd}
        playInBackground
        playWhenInactive
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

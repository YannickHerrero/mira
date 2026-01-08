import * as React from "react";
import { View, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";
import { Play, ChevronLeft } from "@/lib/icons";
import type { VLCVideoPlayerProps, PlayerState } from "./VLCVideoPlayer.types";

// Re-export types
export type { PlayerState, VLCVideoPlayerProps } from "./VLCVideoPlayer.types";

const LOG_PREFIX = "[WebPlayer]";

export function VLCVideoPlayer({
  url,
  title,
  initialPosition = 0,
  onProgress,
  onEnd,
  onBack,
}: VLCVideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const hideControlsTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playerState, setPlayerState] = React.useState<PlayerState>({
    isPlaying: false,
    isBuffering: true,
    position: initialPosition,
    duration: 0,
    volume: 1,
    brightness: 1,
    playbackRate: 1,
    audioTracks: [],
    textTracks: [],
    isLocked: false,
  });

  // Log URL on mount
  React.useEffect(() => {
    console.log(LOG_PREFIX, "Mounting with URL:", url);
  }, [url]);

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

  const showControls = React.useCallback(() => {
    setControlsVisible(true);
    resetHideControlsTimer();
  }, [resetHideControlsTimer]);

  const toggleControls = React.useCallback(() => {
    setControlsVisible((prev) => !prev);
    if (!controlsVisible) {
      resetHideControlsTimer();
    }
  }, [controlsVisible, resetHideControlsTimer]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    console.log(LOG_PREFIX, "Video loaded", { duration: video.duration });
    setIsLoaded(true);
    setPlayerState((prev) => ({
      ...prev,
      duration: video.duration,
      isBuffering: false,
    }));

    // Seek to initial position
    if (initialPosition > 0) {
      video.currentTime = initialPosition;
    }

    // Auto-play
    video.play().catch((err) => {
      console.warn(LOG_PREFIX, "Auto-play prevented:", err);
    });
  };

  const handlePlay = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: true, isBuffering: false }));
    resetHideControlsTimer();
  };

  const handlePause = () => {
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    setControlsVisible(true);
  };

  const handleWaiting = () => {
    setPlayerState((prev) => ({ ...prev, isBuffering: true }));
  };

  const handleCanPlay = () => {
    setPlayerState((prev) => ({ ...prev, isBuffering: false }));
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setPlayerState((prev) => ({
      ...prev,
      position: video.currentTime,
      duration: video.duration || prev.duration,
    }));

    onProgress?.(video.currentTime, video.duration);
  };

  const handleEnded = () => {
    console.log(LOG_PREFIX, "Video ended");
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    onEnd?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    console.error(LOG_PREFIX, "Video error:", video.error);
    setPlayerState((prev) => ({ ...prev, isBuffering: false }));
  };

  // Control handlers
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playerState.isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTime = Math.max(0, Math.min(time, playerState.duration));
    video.currentTime = clampedTime;
    setPlayerState((prev) => ({ ...prev, position: clampedTime }));
    showControls();
  };

  const handleSeekRelative = (delta: number) => {
    handleSeek(playerState.position + delta);
  };

  const handleVolumeChange = (volume: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    video.volume = clampedVolume;
    setPlayerState((prev) => ({ ...prev, volume: clampedVolume }));
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlayerState((prev) => ({ ...prev, playbackRate: rate }));
  };

  const handleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
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

  // Keyboard controls
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          handlePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSeekRelative(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSeekRelative(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(playerState.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(playerState.volume - 0.1);
          break;
        case "f":
          e.preventDefault();
          handleFullscreen();
          break;
        case "m":
          e.preventDefault();
          handleVolumeChange(playerState.volume > 0 ? 0 : 1);
          break;
      }
      showControls();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerState.volume, playerState.position]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = playerState.duration > 0 ? (playerState.position / playerState.duration) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* @ts-ignore - Using native HTML element */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={toggleControls}
        onMouseMove={showControls}
      >
        {/* @ts-ignore - Using native HTML video element */}
        <video
          ref={videoRef}
          src={url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handlePlay}
          onPause={handlePause}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          playsInline
        />

        {/* Controls overlay */}
        {/* @ts-ignore */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: controlsVisible ? 1 : 0,
            transition: "opacity 0.2s",
            pointerEvents: controlsVisible ? "auto" : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top gradient */}
          {/* @ts-ignore */}
          <div
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {onBack && (
              <Pressable onPress={onBack} style={styles.backButton}>
                <ChevronLeft size={28} color="#fff" />
              </Pressable>
            )}
            {title && (
              <Text className="text-white text-lg font-medium flex-1" numberOfLines={1}>
                {title}
              </Text>
            )}
          </div>

          {/* Center play/pause button */}
          {/* @ts-ignore */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {playerState.isBuffering ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Pressable
                onPress={handlePlayPause}
                style={styles.playButton}
              >
                {playerState.isPlaying ? (
                  <View style={styles.pauseIcon}>
                    <View style={styles.pauseBar} />
                    <View style={styles.pauseBar} />
                  </View>
                ) : (
                  <Play size={40} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                )}
              </Pressable>
            )}
          </div>

          {/* Bottom controls */}
          {/* @ts-ignore */}
          <div
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
              padding: "16px",
            }}
          >
            {/* Progress bar */}
            {/* @ts-ignore */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <Text className="text-white text-xs" style={{ minWidth: 45 }}>
                {formatTime(playerState.position)}
              </Text>

              {/* @ts-ignore */}
              <div
                style={{
                  flex: 1,
                  height: "4px",
                  backgroundColor: "rgba(255,255,255,0.3)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  position: "relative",
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  handleSeek(percentage * playerState.duration);
                }}
              >
                {/* @ts-ignore */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    height: "100%",
                    width: `${progress}%`,
                    backgroundColor: "#fff",
                    borderRadius: "2px",
                  }}
                />
              </div>

              <Text className="text-white text-xs" style={{ minWidth: 45, textAlign: "right" }}>
                {formatTime(playerState.duration)}
              </Text>
            </div>

            {/* Additional controls */}
            {/* @ts-ignore */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              {/* Volume control */}
              {/* @ts-ignore */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {/* @ts-ignore */}
                <button
                  onClick={() => handleVolumeChange(playerState.volume > 0 ? 0 : 1)}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  {playerState.volume === 0 ? "Muted" : `${Math.round(playerState.volume * 100)}%`}
                </button>
              </div>

              {/* Playback speed */}
              {/* @ts-ignore */}
              <select
                value={playerState.playbackRate}
                onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>

              {/* Fullscreen button */}
              {/* @ts-ignore */}
              <button
                onClick={handleFullscreen}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backButton: {
    padding: 8,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseIcon: {
    flexDirection: "row",
    gap: 8,
  },
  pauseBar: {
    width: 6,
    height: 30,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
});

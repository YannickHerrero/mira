import * as React from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Slider from "@react-native-community/slider";
import { Text } from "@/components/ui/text";
import { Play, ChevronLeft } from "@/lib/icons";
import { lightImpact, selectionChanged } from "@/lib/haptics";
import type { PlayerState } from "./VideoPlayer";
import type { SelectedTrack } from "react-native-video";

interface PlayerControlsProps {
  visible: boolean;
  playerState: PlayerState;
  title?: string;
  isLoaded: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onBack?: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onSelectAudioTrack: (track: SelectedTrack) => void;
  onSelectTextTrack: (track: SelectedTrack | undefined) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlayerControls({
  visible,
  playerState,
  title,
  isLoaded,
  onPlayPause,
  onSeek,
  onBack,
  onPlaybackRateChange,
}: PlayerControlsProps) {
  const [showSpeedSelector, setShowSpeedSelector] = React.useState(false);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
    pointerEvents: visible ? "auto" : "none",
  }));

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Background gradient overlay */}
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      {/* Top bar */}
      <View style={styles.topBar}>
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
      </View>

      {/* Center controls */}
      <View style={styles.centerControls}>
        {playerState.isBuffering ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <Pressable
            onPress={() => {
              lightImpact();
              onPlayPause();
            }}
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
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <Text className="text-white text-xs w-12">
            {formatTime(playerState.position)}
          </Text>

          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={playerState.duration || 1}
              value={playerState.position}
              onSlidingComplete={onSeek}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="rgba(255,255,255,0.3)"
              thumbTintColor="#fff"
            />
          </View>

          <Text className="text-white text-xs w-12 text-right">
            {formatTime(playerState.duration)}
          </Text>
        </View>

        {/* Additional controls */}
        <View style={styles.additionalControls}>
          {/* Playback speed */}
          <Pressable
            onPress={() => setShowSpeedSelector(!showSpeedSelector)}
            style={styles.speedButton}
          >
            <Text className="text-white text-sm font-medium">
              {playerState.playbackRate}x
            </Text>
          </Pressable>
        </View>

        {/* Speed selector popup */}
        {showSpeedSelector && (
          <View style={styles.speedSelector}>
            {PLAYBACK_RATES.map((rate) => (
              <Pressable
                key={rate}
                onPress={() => {
                  selectionChanged();
                  onPlaybackRateChange(rate);
                  setShowSpeedSelector(false);
                }}
                style={[
                  styles.speedOption,
                  playerState.playbackRate === rate && styles.speedOptionActive,
                ]}
              >
                <Text
                  className={`text-sm ${playerState.playbackRate === rate ? "text-primary font-bold" : "text-white"}`}
                >
                  {rate}x
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    justifyContent: "space-between",
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  centerControls: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sliderContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  additionalControls: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
  },
  speedSelector: {
    position: "absolute",
    bottom: 80,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 8,
    padding: 8,
  },
  speedOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  speedOptionActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
  },
});

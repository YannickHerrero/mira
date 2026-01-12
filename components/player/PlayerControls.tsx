import * as React from "react";
import { View, Pressable, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import Slider from "@react-native-community/slider";
import { Text } from "@/components/ui/text";
import { Play, ChevronLeft, Lock, Unlock } from "@/lib/icons";
import { lightImpact, selectionChanged } from "@/lib/haptics";
import type { PlayerState } from "./VLCVideoPlayer.types";
import { SelectedTrackType, type SelectedTrack } from "react-native-video";

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
  onToggleLock: () => void;
  onUserInteraction?: () => void;
  onMenuStateChange?: (isOpen: boolean) => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

type MenuType = "speed" | "audio" | "subtitles" | null;

export function PlayerControls({
  visible,
  playerState,
  title,
  isLoaded,
  onPlayPause,
  onSeek,
  onBack,
  onPlaybackRateChange,
  onSelectAudioTrack,
  onSelectTextTrack,
  onToggleLock,
  onUserInteraction,
  onMenuStateChange,
}: PlayerControlsProps) {
  const [activeMenu, setActiveMenu] = React.useState<MenuType>(null);

  // Close menu when controls hide
  React.useEffect(() => {
    if (!visible) {
      setActiveMenu(null);
    }
  }, [visible]);

  React.useEffect(() => {
    onMenuStateChange?.(activeMenu !== null);
  }, [activeMenu, onMenuStateChange]);

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

  const toggleMenu = (menu: MenuType) => {
    onUserInteraction?.();
    selectionChanged();
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleSelectAudioTrack = (index: number) => {
    selectionChanged();
    onSelectAudioTrack({ type: SelectedTrackType.INDEX, value: index });
    setActiveMenu(null);
  };

  const handleSelectTextTrack = (index: number | "off") => {
    selectionChanged();
    if (index === "off") {
      onSelectTextTrack({ type: SelectedTrackType.DISABLED, value: undefined });
    } else {
      onSelectTextTrack({ type: SelectedTrackType.INDEX, value: index });
    }
    setActiveMenu(null);
  };

  const handleSelectSpeed = (rate: number) => {
    selectionChanged();
    onPlaybackRateChange(rate);
    setActiveMenu(null);
  };

  // Get current selected track index
  const getSelectedAudioIndex = (): number | undefined => {
    if (playerState.selectedAudioTrack?.type === SelectedTrackType.INDEX) {
      return playerState.selectedAudioTrack.value as number;
    }
    return undefined;
  };

  const getSelectedTextIndex = (): number | "off" | undefined => {
    if (playerState.selectedTextTrack?.type === SelectedTrackType.DISABLED) {
      return "off";
    }
    if (playerState.selectedTextTrack?.type === SelectedTrackType.INDEX) {
      return playerState.selectedTextTrack.value as number;
    }
    return undefined;
  };

  // If locked, only show unlock button
  if (playerState.isLocked) {
    return (
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={styles.lockContainer}>
          <Pressable
            onPress={() => {
              lightImpact();
              onToggleLock();
            }}
            style={styles.lockButton}
          >
            <Lock size={24} color="#fff" />
            <Text className="text-white text-sm ml-2">Tap to unlock</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

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
        {/* Lock button */}
        <Pressable
          onPress={() => {
            lightImpact();
            onToggleLock();
          }}
          style={styles.topBarButton}
        >
          <Unlock size={22} color="#fff" />
        </Pressable>
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
          {/* Audio tracks button */}
          {playerState.audioTracks.length > 1 && (
            <Pressable
              onPress={() => toggleMenu("audio")}
              style={[styles.controlButton, activeMenu === "audio" && styles.controlButtonActive]}
            >
              <Text className="text-white text-sm">Audio</Text>
            </Pressable>
          )}

          {/* Subtitles button */}
          {playerState.textTracks.length > 0 && (
            <Pressable
              onPress={() => toggleMenu("subtitles")}
              style={[styles.controlButton, activeMenu === "subtitles" && styles.controlButtonActive]}
            >
              <Text className="text-white text-sm">CC</Text>
            </Pressable>
          )}

          {/* Playback speed */}
          <Pressable
            onPress={() => toggleMenu("speed")}
            style={[styles.controlButton, activeMenu === "speed" && styles.controlButtonActive]}
          >
            <Text className="text-white text-sm font-medium">
              {playerState.playbackRate}x
            </Text>
          </Pressable>
        </View>

        {/* Popup menus */}
        {activeMenu === "speed" && (
          <View style={styles.popup}>
            <Text className="text-white text-sm font-semibold mb-2">Playback Speed</Text>
            {PLAYBACK_RATES.map((rate) => (
              <Pressable
                key={rate}
                onPress={() => handleSelectSpeed(rate)}
                style={[
                  styles.popupOption,
                  playerState.playbackRate === rate && styles.popupOptionActive,
                ]}
              >
                <Text
                  className={`text-sm ${playerState.playbackRate === rate ? "text-lavender font-bold" : "text-white"}`}
                >
                  {rate}x
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {activeMenu === "audio" && (
          <View style={styles.popup}>
            <Text className="text-white text-sm font-semibold mb-2">Audio Track</Text>
            <ScrollView style={styles.popupScroll}>
              {playerState.audioTracks.map((track) => (
                <Pressable
                  key={track.index}
                  onPress={() => handleSelectAudioTrack(track.index)}
                  style={[
                    styles.popupOption,
                    getSelectedAudioIndex() === track.index && styles.popupOptionActive,
                  ]}
                >
                  <Text
                    className={`text-sm ${getSelectedAudioIndex() === track.index ? "text-lavender font-bold" : "text-white"}`}
                    numberOfLines={1}
                  >
                    {track.title || track.language || `Track ${track.index}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {activeMenu === "subtitles" && (
          <View style={styles.popup}>
            <Text className="text-white text-sm font-semibold mb-2">Subtitles</Text>
            <ScrollView style={styles.popupScroll}>
              <Pressable
                onPress={() => handleSelectTextTrack("off")}
                style={[
                  styles.popupOption,
                  getSelectedTextIndex() === "off" && styles.popupOptionActive,
                ]}
              >
                <Text
                  className={`text-sm ${getSelectedTextIndex() === "off" ? "text-lavender font-bold" : "text-white"}`}
                >
                  Off
                </Text>
              </Pressable>
              {playerState.textTracks.map((track) => (
                <Pressable
                  key={track.index}
                  onPress={() => handleSelectTextTrack(track.index)}
                  style={[
                    styles.popupOption,
                    getSelectedTextIndex() === track.index && styles.popupOptionActive,
                  ]}
                >
                  <Text
                    className={`text-sm ${getSelectedTextIndex() === track.index ? "text-lavender font-bold" : "text-white"}`}
                    numberOfLines={1}
                  >
                    {track.title || track.language || `Subtitle ${track.index}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
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
    height: 180,
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
  topBarButton: {
    padding: 8,
    marginLeft: 8,
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
    gap: 8,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
  },
  controlButtonActive: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  popup: {
    position: "absolute",
    bottom: 80,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.95)",
    borderRadius: 8,
    padding: 12,
    minWidth: 150,
    maxWidth: 250,
  },
  popupScroll: {
    maxHeight: 200,
  },
  popupOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  popupOptionActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
  },
  lockContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lockButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
});

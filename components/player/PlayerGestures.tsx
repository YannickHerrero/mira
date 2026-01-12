import * as React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { lightImpact } from "@/lib/haptics";
import { Volume2, Sun } from "@/lib/icons";

interface PlayerGesturesProps {
  onTap: () => void;
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onHorizontalSwipe: (delta: number) => void;
  onVolumeChange: (newVolume: number) => void;
  onBrightnessChange: (newBrightness: number) => void;
  currentVolume: number;
  currentBrightness: number;
  isLocked: boolean;
}

export function PlayerGestures({
  onTap,
  onDoubleTapLeft,
  onDoubleTapRight,
  onHorizontalSwipe,
  onVolumeChange,
  onBrightnessChange,
  currentVolume,
  currentBrightness,
  isLocked,
}: PlayerGesturesProps) {
  const { width } = useWindowDimensions();

  // Seek indicator state
  const seekIndicatorOpacity = useSharedValue(0);
  const seekIndicatorValue = useSharedValue(0);
  
  // Volume indicator state (right side)
  const volumeIndicatorOpacity = useSharedValue(0);
  const volumeIndicatorValue = useSharedValue(currentVolume);
  
  // Brightness indicator state (left side)
  const brightnessIndicatorOpacity = useSharedValue(0);
  const brightnessIndicatorValue = useSharedValue(currentBrightness);

  // Track gesture state
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const accumulatedSeek = useSharedValue(0);
  const initialVolume = useSharedValue(currentVolume);
  const initialBrightness = useSharedValue(currentBrightness);

  // Update shared values when props change
  React.useEffect(() => {
    volumeIndicatorValue.value = currentVolume;
  }, [currentVolume]);

  React.useEffect(() => {
    brightnessIndicatorValue.value = currentBrightness;
  }, [currentBrightness]);

  // Single tap - toggle controls (works even when locked)
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  // Double tap - seek -/+10s based on tap location (disabled when locked)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((event) => {
      if (isLocked) return;
      
      const isLeftSide = event.x < width / 2;
      runOnJS(lightImpact)();
      if (isLeftSide) {
        runOnJS(onDoubleTapLeft)();
      } else {
        runOnJS(onDoubleTapRight)();
      }
    });

  // Pan gesture - horizontal for seek, vertical for volume (right) / brightness (left)
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      startX.value = event.x;
      startY.value = event.y;
      accumulatedSeek.value = 0;
      initialVolume.value = currentVolume;
      initialBrightness.value = currentBrightness;
    })
    .onUpdate((event) => {
      if (isLocked) return;

      const deltaX = event.translationX;
      const deltaY = event.translationY;

      // Determine if this is a horizontal or vertical swipe
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      const isLeftSide = startX.value < width / 2;
      const isRightSide = startX.value > width / 2;

      if (isHorizontal && Math.abs(deltaX) > 20) {
        // Horizontal swipe - seek (100px = 10 seconds)
        const seekDelta = (deltaX / 100) * 10;
        accumulatedSeek.value = seekDelta;
        seekIndicatorValue.value = Math.round(seekDelta);
        seekIndicatorOpacity.value = withTiming(1, { duration: 100 });
      } else if (!isHorizontal && Math.abs(deltaY) > 10) {
        // Vertical swipe
        if (isRightSide) {
          // Right side - volume (200px = full volume range)
          const volumeDelta = -deltaY / 200;
          const newVolume = Math.max(0, Math.min(1, initialVolume.value + volumeDelta));
          volumeIndicatorValue.value = newVolume;
          volumeIndicatorOpacity.value = withTiming(1, { duration: 100 });
          runOnJS(onVolumeChange)(newVolume);
        } else if (isLeftSide) {
          // Left side - brightness (200px = full brightness range)
          const brightnessDelta = -deltaY / 200;
          const newBrightness = Math.max(0, Math.min(1, initialBrightness.value + brightnessDelta));
          brightnessIndicatorValue.value = newBrightness;
          brightnessIndicatorOpacity.value = withTiming(1, { duration: 100 });
          runOnJS(onBrightnessChange)(newBrightness);
        }
      }
    })
    .onEnd(() => {
      if (accumulatedSeek.value !== 0) {
        runOnJS(onHorizontalSwipe)(accumulatedSeek.value);
      }
      seekIndicatorOpacity.value = withTiming(0, { duration: 300 });
      volumeIndicatorOpacity.value = withTiming(0, { duration: 300 });
      brightnessIndicatorOpacity.value = withTiming(0, { duration: 300 });
    });

  // Combine gestures
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Exclusive(panGesture, tapGesture)
  );

  // Animated styles
  const seekIndicatorStyle = useAnimatedStyle(() => ({
    opacity: seekIndicatorOpacity.value,
  }));

  const volumeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: volumeIndicatorOpacity.value,
  }));

  const volumeBarStyle = useAnimatedStyle(() => ({
    height: `${volumeIndicatorValue.value * 100}%`,
  }));

  const brightnessIndicatorStyle = useAnimatedStyle(() => ({
    opacity: brightnessIndicatorOpacity.value,
  }));

  const brightnessBarStyle = useAnimatedStyle(() => ({
    height: `${brightnessIndicatorValue.value * 100}%`,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.container}>
        {/* Seek indicator */}
        <Animated.View style={[styles.seekIndicator, seekIndicatorStyle]}>
          <Text className="text-white text-lg font-bold">
            {seekIndicatorValue.value > 0 ? "+" : ""}
            {Math.round(seekIndicatorValue.value)}s
          </Text>
        </Animated.View>

        {/* Volume indicator (right side) */}
        <Animated.View style={[styles.volumeIndicator, volumeIndicatorStyle]}>
          <Volume2 size={20} color="#fff" />
          <View style={styles.indicatorBarContainer}>
            <Animated.View style={[styles.indicatorBar, volumeBarStyle]} />
          </View>
          <Text className="text-white text-xs mt-1">
            {Math.round(volumeIndicatorValue.value * 100)}%
          </Text>
        </Animated.View>

        {/* Brightness indicator (left side) */}
        <Animated.View style={[styles.brightnessIndicator, brightnessIndicatorStyle]}>
          <Sun size={20} color="#fff" />
          <View style={styles.indicatorBarContainer}>
            <Animated.View style={[styles.indicatorBar, brightnessBarStyle]} />
          </View>
          <Text className="text-white text-xs mt-1">
            {Math.round(brightnessIndicatorValue.value * 100)}%
          </Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  seekIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -40 }, { translateY: -20 }],
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  volumeIndicator: {
    position: "absolute",
    right: 40,
    top: "30%",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 8,
  },
  brightnessIndicator: {
    position: "absolute",
    left: 40,
    top: "30%",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 8,
  },
  indicatorBarContainer: {
    width: 4,
    height: 100,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  indicatorBar: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
});

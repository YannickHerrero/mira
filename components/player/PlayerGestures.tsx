import * as React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { lightImpact } from "@/lib/haptics";

interface PlayerGesturesProps {
  onTap: () => void;
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onHorizontalSwipe: (delta: number) => void;
  onVerticalSwipe: (newVolume: number) => void;
  currentVolume: number;
  showControls: () => void;
}

export function PlayerGestures({
  onTap,
  onDoubleTapLeft,
  onDoubleTapRight,
  onHorizontalSwipe,
  onVerticalSwipe,
  currentVolume,
  showControls,
}: PlayerGesturesProps) {
  const { width, height } = useWindowDimensions();

  // Seek indicator state
  const seekIndicatorOpacity = useSharedValue(0);
  const seekIndicatorValue = useSharedValue(0);
  const volumeIndicatorOpacity = useSharedValue(0);
  const volumeIndicatorValue = useSharedValue(currentVolume);

  // Track gesture state
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const accumulatedSeek = useSharedValue(0);

  // Single tap - toggle controls
  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  // Double tap - seek -/+10s based on tap location
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((event) => {
      const isLeftSide = event.x < width / 2;
      runOnJS(lightImpact)();
      if (isLeftSide) {
        runOnJS(onDoubleTapLeft)();
      } else {
        runOnJS(onDoubleTapRight)();
      }
    });

  // Pan gesture - horizontal for seek, vertical (right side) for volume
  const panGesture = Gesture.Pan()
    .onStart((event) => {
      startX.value = event.x;
      startY.value = event.y;
      accumulatedSeek.value = 0;
    })
    .onUpdate((event) => {
      const deltaX = event.translationX;
      const deltaY = event.translationY;

      // Determine if this is a horizontal or vertical swipe
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal) {
        // Horizontal swipe - seek
        // 100px = 10 seconds
        const seekDelta = (deltaX / 100) * 10;
        accumulatedSeek.value = seekDelta;
        seekIndicatorValue.value = Math.round(seekDelta);
        seekIndicatorOpacity.value = withTiming(1, { duration: 100 });
        runOnJS(showControls)();
      } else {
        // Vertical swipe on right side - volume
        const isRightSide = startX.value > width / 2;
        if (isRightSide) {
          // 200px = full volume range
          const volumeDelta = -deltaY / 200;
          const newVolume = Math.max(0, Math.min(1, currentVolume + volumeDelta));
          volumeIndicatorValue.value = newVolume;
          volumeIndicatorOpacity.value = withTiming(1, { duration: 100 });
          runOnJS(onVerticalSwipe)(newVolume);
        }
      }
    })
    .onEnd(() => {
      if (accumulatedSeek.value !== 0) {
        runOnJS(onHorizontalSwipe)(accumulatedSeek.value);
      }
      seekIndicatorOpacity.value = withTiming(0, { duration: 300 });
      volumeIndicatorOpacity.value = withTiming(0, { duration: 300 });
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

        {/* Volume indicator */}
        <Animated.View style={[styles.volumeIndicator, volumeIndicatorStyle]}>
          <View style={styles.volumeBarContainer}>
            <Animated.View style={[styles.volumeBar, volumeBarStyle]} />
          </View>
          <Text className="text-white text-xs mt-1">
            {Math.round(volumeIndicatorValue.value * 100)}%
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
  },
  volumeBarContainer: {
    width: 4,
    height: 100,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  volumeBar: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
});

import * as React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";

interface LoadingOverlayProps {
  /** Main title text */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Whether the overlay is visible */
  visible: boolean;
  /** Duration of the fake progress in milliseconds (default: 15000) */
  duration?: number;
}

/**
 * A loading overlay with a fake progress bar.
 * Progress animates quickly at first, then slows down as it approaches 100%.
 * This makes the wait feel shorter by showing immediate feedback.
 */
export function LoadingOverlay({ 
  title, 
  subtitle, 
  visible,
  duration = 15000,
}: LoadingOverlayProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      // Reset and start fake progress animation
      progress.value = 0;
      
      // Animate in stages: fast at first, then slower
      // 0% -> 60% in 20% of time (quick initial feedback)
      // 60% -> 85% in 40% of time (steady progress)
      // 85% -> 95% in 40% of time (slow down near end)
      progress.value = withSequence(
        withTiming(60, {
          duration: duration * 0.2,
          easing: Easing.out(Easing.ease),
        }),
        withTiming(85, {
          duration: duration * 0.4,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(95, {
          duration: duration * 0.4,
          easing: Easing.out(Easing.quad),
        })
      );
    } else {
      // Quick fill to 100% when done, then reset
      progress.value = withTiming(100, { duration: 150 });
    }
  }, [visible, progress, duration]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/60 items-center justify-center z-50">
      <View className="bg-surface0 rounded-2xl p-6 mx-8 min-w-[280px] max-w-[320px]">
        {/* Text content */}
        <View className="items-center mb-5">
          <Text className="text-text text-lg font-semibold text-center">
            {title}
          </Text>
          {subtitle && (
            <Text className="text-subtext0 text-sm text-center mt-1.5">
              {subtitle}
            </Text>
          )}
        </View>

        {/* Progress bar container */}
        <View className="h-1.5 bg-surface1 rounded-full overflow-hidden">
          {/* Animated progress bar */}
          <Animated.View
            style={progressStyle}
            className="h-full bg-lavender rounded-full"
          />
        </View>
      </View>
    </View>
  );
}

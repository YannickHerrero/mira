import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { TextInput, Platform } from "react-native";
import { cn } from "@/lib/utils";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedNumber({
  value,
  duration = 1500,
  className,
  suffix = "",
  decimals = 0,
}: AnimatedNumberProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  const animatedProps = useAnimatedProps(() => {
    const num =
      decimals > 0
        ? animatedValue.value.toFixed(decimals)
        : Math.round(animatedValue.value).toString();
    return {
      text: `${num}${suffix}`,
      defaultValue: `${num}${suffix}`,
    };
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      className={cn(
        "text-[28px] font-bold text-text p-0",
        Platform.OS === "web" && "select-text",
        className
      )}
    />
  );
}

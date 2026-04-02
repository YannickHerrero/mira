import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { useTranslation } from "react-i18next";

interface TopGenresChartProps {
  data: { genre: string; count: number }[];
}

function GenreBar({
  genre,
  count,
  maxCount,
  index,
}: {
  genre: string;
  count: number;
  maxCount: number;
  index: number;
}) {
  const { t } = useTranslation();
  const width = useSharedValue(0);
  const targetPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

  useEffect(() => {
    width.value = withDelay(
      index * 100,
      withTiming(targetPercent, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [targetPercent, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  const translatedGenre = t(`genres.${genre}`, genre);

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text variant="body" className="text-text">
          {translatedGenre}
        </Text>
        <Text variant="caption" className="text-subtext0">
          {count}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-surface1/30 overflow-hidden">
        <Animated.View
          style={animatedStyle}
          className="h-full rounded-full bg-lavender"
        />
      </View>
    </View>
  );
}

export function TopGenresChart({ data }: TopGenresChartProps) {
  const maxCount = data.length > 0 ? data[0].count : 1;

  return (
    <View>
      {data.map((item, index) => (
        <GenreBar
          key={item.genre}
          genre={item.genre}
          count={item.count}
          maxCount={maxCount}
          index={index}
        />
      ))}
    </View>
  );
}

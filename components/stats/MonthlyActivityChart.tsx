import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";

interface MonthlyActivityChartProps {
  data: { month: string; count: number }[];
}

function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString("default", { month: "short" });
}

function Bar({
  count,
  maxCount,
  index,
}: {
  count: number;
  maxCount: number;
  index: number;
}) {
  const height = useSharedValue(0);
  const targetHeight = maxCount > 0 ? (count / maxCount) * 120 : 0;

  useEffect(() => {
    height.value = withDelay(
      index * 50,
      withSpring(targetHeight, {
        damping: 15,
        stiffness: 100,
      })
    );
  }, [targetHeight, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <View className="flex-1 items-center justify-end" style={{ height: 140 }}>
      {count > 0 && (
        <Text variant="caption" className="text-subtext0 mb-1">
          {count}
        </Text>
      )}
      <Animated.View
        style={animatedStyle}
        className="w-full rounded-t-sm bg-lavender min-h-[2px]"
      />
    </View>
  );
}

export function MonthlyActivityChart({ data }: MonthlyActivityChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View>
      <View className="flex-row gap-1">
        {data.map((item, index) => (
          <Bar
            key={item.month}
            count={item.count}
            maxCount={maxCount}
            index={index}
          />
        ))}
      </View>
      <View className="flex-row gap-1 mt-2">
        {data.map((item) => (
          <View key={item.month} className="flex-1 items-center">
            <Text variant="tag" className="text-subtext0">
              {getMonthLabel(item.month)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

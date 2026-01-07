import * as React from "react";
import { View, Pressable, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { Download, X } from "@/lib/icons";
import { useDownloadsStore, formatBytes } from "@/stores/downloads";

export function DownloadProgressIndicator() {
  const insets = useSafeAreaInsets();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const expandProgress = useSharedValue(0);

  const activeDownload = useDownloadsStore((s) => s.getActiveDownload());
  const pendingCount = useDownloadsStore(
    (s) => s.downloads.filter((d) => d.status === "pending").length
  );
  const cancelDownload = useDownloadsStore((s) => s.cancelDownload);

  // All hooks must be called before any early returns
  const animatedContainerStyle = useAnimatedStyle(() => {
    const width = interpolate(expandProgress.value, [0, 1], [56, 280]);
    const height = interpolate(expandProgress.value, [0, 1], [56, 100]);

    return {
      width,
      height,
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(expandProgress.value, { duration: 150 }),
    };
  });

  const toggleExpanded = React.useCallback(() => {
    setIsExpanded((prev) => {
      expandProgress.value = withSpring(prev ? 0 : 1, {
        damping: 15,
        stiffness: 150,
      });
      return !prev;
    });
  }, [expandProgress]);

  const handleCancel = React.useCallback(() => {
    if (activeDownload) {
      cancelDownload(activeDownload.id);
    }
  }, [activeDownload, cancelDownload]);

  // Don't render on web or if no active downloads
  if (Platform.OS === "web" || !activeDownload) {
    return null;
  }

  const progress = activeDownload.progress ?? 0;
  const queueCount = pendingCount;

  return (
    <View
      className="absolute z-50"
      style={{
        bottom: insets.bottom + 80, // Above tab bar
        right: 16,
      }}
      pointerEvents="box-none"
    >
      <Pressable onPress={toggleExpanded}>
        <Animated.View
          style={animatedContainerStyle}
          className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Collapsed state - just icon with progress ring */}
          {!isExpanded && (
            <View className="flex-1 items-center justify-center">
              <View className="relative w-10 h-10 items-center justify-center">
                {/* Progress ring background */}
                <View className="absolute inset-0 rounded-full border-2 border-muted" />
                {/* Progress ring */}
                <View
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  style={{
                    borderTopColor: "transparent",
                    borderRightColor: progress > 25 ? undefined : "transparent",
                    borderBottomColor: progress > 50 ? undefined : "transparent",
                    borderLeftColor: progress > 75 ? undefined : "transparent",
                    transform: [{ rotate: `${(progress / 100) * 360}deg` }],
                  }}
                />
                <Download size={18} className="text-foreground" />
              </View>
              {queueCount > 0 && (
                <View className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full items-center justify-center">
                  <Text className="text-xs text-primary-foreground font-bold">
                    {queueCount + 1}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Expanded state - full info */}
          {isExpanded && (
            <Animated.View style={animatedContentStyle} className="flex-1 p-3">
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 mr-2">
                  <Text
                    className="text-sm font-medium text-foreground"
                    numberOfLines={1}
                  >
                    {activeDownload.title}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {Math.round(progress)}% complete
                    {queueCount > 0 && ` • ${queueCount} in queue`}
                  </Text>
                </View>
                <Pressable
                  onPress={handleCancel}
                  className="p-1 -mr-1 active:opacity-70"
                  hitSlop={8}
                >
                  <X size={16} className="text-muted-foreground" />
                </Pressable>
              </View>

              {/* Progress bar */}
              <View className="h-2 bg-muted rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </View>

              {activeDownload.fileSize && (
                <Text className="text-xs text-muted-foreground mt-1">
                  {formatBytes((activeDownload.fileSize * progress) / 100)} /{" "}
                  {formatBytes(activeDownload.fileSize)}
                </Text>
              )}
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

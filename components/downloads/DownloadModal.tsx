import * as React from "react";
import { View, Modal, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { Download, X, AlertCircle } from "@/lib/icons";
import { useDownloadsStore, formatBytes } from "@/stores/downloads";

export function DownloadModal() {
  const activeDownload = useDownloadsStore((s) => s.getActiveDownload());
  const cancelDownload = useDownloadsStore((s) => s.cancelDownload);
  const progressValue = useSharedValue(0);

  const isVisible = activeDownload != null;
  const isCaching = activeDownload?.status === "caching";
  const isFailed = activeDownload?.status === "failed" || activeDownload?.status === "unplayable";
  const progress = activeDownload?.progress ?? 0;

  React.useEffect(() => {
    progressValue.value = withTiming(progress, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, progressValue]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const handleCancel = React.useCallback(() => {
    if (activeDownload) {
      cancelDownload(activeDownload.id);
    }
  }, [activeDownload, cancelDownload]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View className="flex-1 bg-black/80 items-center justify-center px-8">
        <View className="bg-surface0 rounded-2xl p-6 w-full max-w-[340px]">
          {/* Icon */}
          <View className="items-center mb-4">
            {isFailed ? (
              <AlertCircle size={32} className="text-red" />
            ) : (
              <Download size={32} className="text-lavender" />
            )}
          </View>

          {/* Title */}
          <Text
            className="text-text text-lg font-semibold text-center mb-1"
            numberOfLines={2}
          >
            {activeDownload?.title}
          </Text>

          {/* Status */}
          <Text className="text-subtext0 text-sm text-center mb-5">
            {isFailed
              ? "Download failed"
              : isCaching
                ? "Preparing stream on Real-Debrid..."
                : `Downloading... ${Math.round(progress)}%`}
          </Text>

          {/* Progress bar */}
          {!isFailed && (
            <View className="mb-3">
              <View className="h-2 bg-surface1 rounded-full overflow-hidden">
                {isCaching ? (
                  <View className="h-full bg-lavender/40 rounded-full w-full" />
                ) : (
                  <Animated.View
                    style={progressBarStyle}
                    className="h-full bg-lavender rounded-full"
                  />
                )}
              </View>

              {/* File size info */}
              {activeDownload?.fileSize && activeDownload.fileSize > 0 && !isCaching && (
                <Text className="text-xs text-subtext0 text-center mt-2">
                  {formatBytes((activeDownload.fileSize * progress) / 100)} / {formatBytes(activeDownload.fileSize)}
                </Text>
              )}
            </View>
          )}

          {/* Cancel / Dismiss button */}
          <Pressable
            onPress={handleCancel}
            className="mt-3 py-3 rounded-xl items-center active:opacity-70 bg-surface1/50"
          >
            <View className="flex-row items-center gap-2">
              <X size={16} className="text-red" />
              <Text className="text-red font-medium">
                {isFailed ? "Dismiss" : "Cancel Download"}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

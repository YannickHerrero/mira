import * as React from "react";
import { View, StatusBar } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { VideoPlayer } from "@/components/player";
import { Text } from "@/components/ui/text";

export default function PlayerScreen() {
  const router = useRouter();
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();

  // Log player params on mount
  React.useEffect(() => {
    console.log("[PlayerScreen] Mounted with params:", {
      url: url ? `${url.substring(0, 100)}...` : "undefined",
      urlLength: url?.length,
      title,
    });
  }, [url, title]);

  // Unlock orientation when entering player, lock to portrait when leaving
  React.useEffect(() => {
    // Allow all orientations in player
    ScreenOrientation.unlockAsync();

    return () => {
      // Lock back to portrait when leaving
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleProgress = (position: number, duration: number) => {
    // TODO: Save progress to database
    console.log(`Progress: ${position}/${duration}`);
  };

  const handleEnd = () => {
    // TODO: Mark as watched, maybe navigate back
    console.log("Video ended");
  };

  if (!url) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <StatusBar hidden />
        <Stack.Screen
          options={{
            headerShown: false,
            orientation: "all",
          }}
        />
        <Text className="text-white text-xl">No video URL provided</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />
      <Stack.Screen
        options={{
          headerShown: false,
          orientation: "all",
          animation: "fade",
        }}
      />
      <VideoPlayer
        url={url}
        title={title}
        onProgress={handleProgress}
        onEnd={handleEnd}
        onBack={handleBack}
      />
    </View>
  );
}

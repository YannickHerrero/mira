import { useEffect } from "react";
import { Linking, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSettingsStore } from "@/stores/settings";

export function useSettings() {
  const store = useSettingsStore();

  useEffect(() => {
    store.loadSettings();
  }, []);

  return store;
}

/**
 * Hook to handle media playback - either in-app or via VLC
 */
export function useMediaPlayer() {
  const router = useRouter();
  const { useVlcPlayer } = useSettingsStore();

  const playMedia = async (url: string, title?: string) => {
    if (useVlcPlayer) {
      await openInVlc(url, title);
    } else {
      router.push({
        pathname: "/player",
        params: { url, title },
      } as any);
    }
  };

  return { playMedia, useVlcPlayer };
}

/**
 * Open a video URL in VLC
 */
async function openInVlc(url: string, title?: string) {
  // VLC URL schemes:
  // iOS: vlc-x-callback://x-callback-url/stream?url=VIDEO_URL
  // Android: vlc://VIDEO_URL
  
  const encodedUrl = encodeURIComponent(url);
  
  let vlcUrl: string;
  if (Platform.OS === "ios") {
    // iOS uses x-callback-url scheme
    vlcUrl = `vlc-x-callback://x-callback-url/stream?url=${encodedUrl}`;
  } else {
    // Android uses simple vlc:// scheme
    vlcUrl = `vlc://${url}`;
  }

  try {
    const canOpen = await Linking.canOpenURL(vlcUrl);
    
    if (canOpen) {
      await Linking.openURL(vlcUrl);
    } else {
      // VLC is not installed
      Alert.alert(
        "VLC Not Installed",
        "VLC Media Player is not installed on your device. Would you like to install it?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Install VLC",
            onPress: () => {
              const storeUrl =
                Platform.OS === "ios"
                  ? "https://apps.apple.com/app/vlc-media-player/id650377962"
                  : "https://play.google.com/store/apps/details?id=org.videolan.vlc";
              Linking.openURL(storeUrl);
            },
          },
        ]
      );
    }
  } catch (error) {
    console.error("Error opening VLC:", error);
    Alert.alert("Error", "Failed to open VLC. Please try again.");
  }
}

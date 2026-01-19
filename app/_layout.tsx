import "./global.css";
import "@/lib/i18n"; // Initialize i18n before app renders
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ThemeProvider } from "@react-navigation/native";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { configureReanimatedLogger, ReanimatedLogLevel } from "react-native-reanimated";
import { PortalHost } from "@/components/primitives/portal";
import { DownloadProgressIndicator } from "@/components/downloads";
import { DatabaseProvider } from "@/db/provider";
import { setAndroidNavigationBar } from "@/lib/android-navigation-bar";
import { DARK_THEME } from "@/lib/constants";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Raleway_400Regular,
  Raleway_600SemiBold,
  Raleway_700Bold,
  Raleway_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/raleway';
import { useEffect } from "react";

// Disable Reanimated strict mode warnings
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});


export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before getting the color scheme.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Initialize language on app start
  useLanguage();

  const [loaded, error] = useFonts({
    Raleway_400Regular,
    Raleway_600SemiBold,
    Raleway_700Bold,
    Raleway_800ExtraBold,
  });

  useFrameworkReady();

  useEffect(() => {
    setAndroidNavigationBar();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);


  return (
    <DatabaseProvider>
      <ThemeProvider value={DARK_THEME}>
        <StatusBar style="light" />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: "#24273A",
                },
                headerTintColor: "#CAD3F5",
                headerShadowVisible: false,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="media/[id]"
                options={{
                  title: "",
                  headerTransparent: true,
                }}
              />
              <Stack.Screen
                name="media/[id]/sources"
                options={{
                  title: "Select Source",
                }}
              />
              <Stack.Screen
                name="player"
                options={{
                  headerShown: false,
                  orientation: "landscape",
                  animation: "fade",
                }}
              />
            </Stack>
            {/* Download progress indicator - only on native */}
            {Platform.OS !== "web" && <DownloadProgressIndicator />}
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
      <PortalHost />
    </DatabaseProvider>
  );
}

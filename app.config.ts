import type { ConfigContext, ExpoConfig } from "@expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Mira",
  slug: "mira",
  newArchEnabled: true,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "mira",
  userInterfaceStyle: "dark",
  runtimeVersion: {
    policy: "appVersion",
  },
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    newArchEnabled: true,
    supportsTablet: true,
    bundleIdentifier: "com.yherrero.mira",
    infoPlist: {
      UIBackgroundModes: ["audio"],
      LSApplicationQueriesSchemes: ["vlc-x-callback"],
    },
  },
  android: {
    newArchEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.yherrero.mira",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-sqlite",
    "expo-font",
    "expo-web-browser",
    "expo-secure-store",
    "expo-screen-orientation",
    [
      "react-native-video",
      {
        enableNotificationControls: true,
        enableBackgroundAudio: true,
        enableADSExtension: false,
        enableCacheExtension: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    baseUrl: "/mira",
  },
  extra: {
    eas: {
      projectId: "73c87940-8013-4e8b-b8c0-fbf35a56e3da",
    },
  },
  owner: "yherrero",
});

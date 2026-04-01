import type { ConfigContext, ExpoConfig } from "@expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDev = process.env.APP_VARIANT === "development";

  return {
    ...config,
    name: isDev ? "Mira (Dev)" : "Mira",
    slug: "mira",
    newArchEnabled: true,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: isDev ? "mira-dev" : "mira",
  userInterfaceStyle: "dark",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/73c87940-8013-4e8b-b8c0-fbf35a56e3da",
  },

  assetBundlePatterns: ["**/*"],
  ios: {
    newArchEnabled: true,
    supportsTablet: true,
    bundleIdentifier: isDev ? "com.yherrero.mira.dev" : "com.yherrero.mira",
    // TODO: Replace with your Apple Developer Team ID (found in Apple Developer Portal)
    appleTeamId: "YOUR_TEAM_ID",
    entitlements: {
      "com.apple.security.application-groups": [
        isDev ? "group.com.yherrero.mira.dev" : "group.com.yherrero.mira",
      ],
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["audio"],
      LSApplicationQueriesSchemes: ["vlc-x-callback"],
      NSLocalNetworkUsageDescription:
        "Mira uses the local network to stream media from local sources.",
      UIFileSharingEnabled: true,
      LSSupportsOpeningDocumentsInPlace: true,
    },
  },
  android: {
    newArchEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#08080a",
    },
    package: isDev ? "com.yherrero.mira.dev" : "com.yherrero.mira",
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
    "expo-updates",
    "react-native-vlc-media-player",
    "@bacons/apple-targets",
    "./plugins/android-widget",
    "./plugins/android-downloads",
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 26,
          // Add Jetpack Glance dependencies for Android widgets
          extraMavenRepos: [
            "https://androidx.dev/storage/compose-compiler/repository/"
          ],
        },
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#08080a",
        image: "./assets/images/icon.png",
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "73c87940-8013-4e8b-b8c0-fbf35a56e3da",
    },
  },
  owner: "yherrero",
  };
};

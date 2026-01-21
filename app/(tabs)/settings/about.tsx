import { useState } from "react";
import { View, Linking, Platform, Alert, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import ListItem from "@/components/ui/list-item";
import { Text } from "@/components/ui/text";
import { Muted } from "@/components/ui/typography";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { Send, Star, Download, Trash, Info } from "@/lib/icons";
import { useDatabase } from "@/db/provider";
import { listsTable, listItemsTable, mediaTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  isPosterCacheAvailable,
  cacheMultiplePosters,
  getCacheStats,
  clearAllCachedPosters,
  listCachedPosters,
} from "@/lib/widget/poster-cache";
import { reloadWidget } from "@/lib/widget";
import { getAndroidWidgetDebugInfo } from "@/lib/widget/android-storage";

export default function AboutSettings() {
  const { t } = useTranslation();
  const { db } = useDatabase();
  const [isCaching, setIsCaching] = useState(false);
  const [cachingProgress, setCachingProgress] = useState<string | null>(null);

  const openExternalURL = (url: string) => {
    if (Platform.OS === "web") {
      Linking.openURL(url);
    } else {
      WebBrowser.openBrowserAsync(url);
    }
  };

  const handleCachePosters = async () => {
    if (!db || isCaching) return;

    setIsCaching(true);
    setCachingProgress("Loading watchlist...");

    try {
      // Get the default watchlist
      const defaultList = await db
        .select()
        .from(listsTable)
        .where(eq(listsTable.isDefault, true))
        .limit(1);

      if (defaultList.length === 0) {
        Alert.alert("No Watchlist", "No default watchlist found.");
        return;
      }

      // Get all items in the watchlist
      const listItems = await db
        .select()
        .from(listItemsTable)
        .where(eq(listItemsTable.listId, defaultList[0].id));

      if (listItems.length === 0) {
        Alert.alert("Empty Watchlist", "No items in your watchlist to cache.");
        return;
      }

      // Get media info for each item
      const itemsWithMedia = await Promise.all(
        listItems.map(async (item) => {
          const media = await db
            .select()
            .from(mediaTable)
            .where(
              and(
                eq(mediaTable.tmdbId, item.tmdbId),
                eq(mediaTable.mediaType, item.mediaType)
              )
            )
            .limit(1);
          return {
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            posterPath: media[0]?.posterPath ?? null,
          };
        })
      );

      setCachingProgress(`Caching 0/${itemsWithMedia.length} posters...`);

      const result = await cacheMultiplePosters(
        itemsWithMedia,
        (current, total) => {
          setCachingProgress(`Caching ${current}/${total} posters...`);
        }
      );

      // Reload widget to pick up new images
      reloadWidget();

      const stats = getCacheStats();
      const sizeMB = (stats.sizeBytes / 1024 / 1024).toFixed(2);

      Alert.alert(
        "Cache Complete",
        `Cached: ${result.success}\nSkipped: ${result.skipped}\nFailed: ${result.failed}\n\nTotal cache: ${stats.count} images (${sizeMB} MB)`
      );
    } catch (error) {
      console.error("Failed to cache posters:", error);
      Alert.alert("Error", "Failed to cache poster images.");
    } finally {
      setIsCaching(false);
      setCachingProgress(null);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Widget Cache",
      "This will delete all cached poster images for the widget. The widget will show placeholders until posters are re-cached.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearAllCachedPosters();
            reloadWidget();
            Alert.alert("Cache Cleared", "Widget poster cache has been cleared.");
          },
        },
      ]
    );
  };

  const handleShowDebugInfo = async () => {
    try {
      const cacheStats = getCacheStats();
      const cachedPosters = listCachedPosters();
      const sizeMB = (cacheStats.sizeBytes / 1024 / 1024).toFixed(2);

      let message = `Poster Cache:\n- Images: ${cacheStats.count}\n- Size: ${sizeMB} MB`;

      if (Platform.OS === "android") {
        const debugInfo = await getAndroidWidgetDebugInfo();
        if (debugInfo) {
          const formatDate = (iso: string | null) => {
            if (!iso) return "Never";
            try {
              return new Date(iso).toLocaleString();
            } catch {
              return iso;
            }
          };

          message += `\n\nWidget Data (SharedPreferences):`;
          message += `\n- Recent releases: ${debugInfo.recentReleasesCount}`;
          message += `\n- Recent updated: ${formatDate(debugInfo.recentLastUpdated)}`;
          message += `\n- Upcoming releases: ${debugInfo.upcomingReleasesCount}`;
          message += `\n- Upcoming updated: ${formatDate(debugInfo.upcomingLastUpdated)}`;
          message += `\n\nActive Widgets:`;
          message += `\n- Mira Widget: ${debugInfo.miraWidgetCount}`;
          message += `\n- Library Widget: ${debugInfo.libraryWidgetCount}`;
          message += `\n\nData synced: ${debugInfo.hasData ? "Yes" : "No"}`;
        } else {
          message += `\n\nAndroid widget module not available.`;
        }
      } else if (Platform.OS === "ios") {
        message += `\n\niOS uses App Group storage.`;
        message += `\nData is synced when viewing the calendar.`;
      }

      Alert.alert("Widget Debug Info", message);
    } catch (error) {
      console.error("Failed to get debug info:", error);
      Alert.alert("Error", "Failed to get widget debug info.");
    }
  };

  const showWidgetSection = isPosterCacheAvailable();

  return (
    <View className="flex-1 bg-base">
      <SettingsPageHeader title={t("settings.aboutMira")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View className="mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">{t("settings.about")}</Muted>
        </View>
        <View className="bg-surface0/20 rounded-2xl overflow-hidden">
          <ListItem
            itemLeft={(props) => <Star {...props} />}
            label={t("settings.rateMira")}
            onPress={() => openExternalURL("https://github.com/YannickHerrero/mira")}
            className="border-0 border-b border-surface1/30"
          />
          <ListItem
            itemLeft={(props) => <Send {...props} />}
            label={t("settings.sendFeedback")}
            onPress={() => openExternalURL("https://github.com/YannickHerrero/mira/issues")}
            className="border-0 border-b border-surface1/30"
          />
        </View>

        {/* Widget Section */}
        {showWidgetSection && (
          <>
            <View className="mt-8 mb-3">
              <Muted className="uppercase text-xs font-bold opacity-50 px-1">Widget</Muted>
            </View>
            <View className="bg-surface0/20 rounded-2xl overflow-hidden">
              <ListItem
                itemLeft={(props) =>
                  isCaching ? (
                    <ActivityIndicator size="small" className={props.className} />
                  ) : (
                    <Download {...props} />
                  )
                }
                label={isCaching ? (cachingProgress ?? "Caching...") : "Cache Watchlist Posters"}
                description="Download poster images for the widget"
                onPress={handleCachePosters}
                disabled={isCaching}
                className="border-0 border-b border-surface1/30"
              />
              <ListItem
                itemLeft={(props) => <Trash {...props} />}
                label="Clear Widget Cache"
                description="Remove all cached poster images"
                onPress={handleClearCache}
                disabled={isCaching}
                className="border-0 border-b border-surface1/30"
              />
              <ListItem
                itemLeft={(props) => <Info {...props} />}
                label="Widget Debug Info"
                description="View sync status and cache info"
                onPress={handleShowDebugInfo}
                disabled={isCaching}
                className="border-0"
              />
            </View>
          </>
        )}

        {/* Version */}
        <View className="py-8 items-center">
          <Text className="text-subtext0 text-sm">
            {t("settings.version", { version: "1.0.0" })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

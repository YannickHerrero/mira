/**
 * Widget Data Export Module
 *
 * Exports release data to App Group shared storage for iOS widget access.
 * On non-iOS platforms, this module is a no-op.
 */

import { Platform, NativeModules } from "react-native";
import type { UpcomingRelease } from "@/lib/api/tmdb";
import { getPosterUrl } from "@/lib/types";
import type { WidgetRelease } from "./types";

// App Group identifier - must match the one in the config plugin
const APP_GROUP_IDENTIFIER = "group.com.yherrero.mira";

// Key used to store releases in UserDefaults
const RELEASES_KEY = "widget_releases";

/**
 * Convert an UpcomingRelease to the simplified WidgetRelease format
 */
function toWidgetRelease(release: UpcomingRelease): WidgetRelease {
  return {
    id: release.media.id,
    mediaType: release.media.mediaType,
    title: release.media.title,
    posterUrl: getPosterUrl(release.media.posterPath, "small") ?? null,
    releaseDate: release.releaseDate.split("T")[0], // Ensure YYYY-MM-DD format
    episodeInfo: release.episodeInfo
      ? {
          season: release.episodeInfo.seasonNumber,
          episode: release.episodeInfo.episodeNumber,
          name: release.episodeInfo.episodeName,
        }
      : null,
  };
}

/**
 * Export releases to the widget's shared storage
 *
 * This writes the release data to App Group UserDefaults,
 * which can be read by the iOS widget extension.
 *
 * @param releases - Array of recent releases to export
 * @param maxItems - Maximum number of items to export (default: 5)
 */
export async function exportReleasesToWidget(
  releases: UpcomingRelease[],
  maxItems = 5
): Promise<void> {
  // Only run on iOS
  if (Platform.OS !== "ios") {
    return;
  }

  try {
    // Convert and limit releases
    const widgetReleases = releases
      .slice(0, maxItems)
      .map(toWidgetRelease);

    // Write to App Group UserDefaults using native module
    await writeToAppGroup(widgetReleases);

    console.log(`[Widget] Exported ${widgetReleases.length} releases to widget`);
  } catch (error) {
    // Log but don't throw - widget export is non-critical
    console.warn("[Widget] Failed to export releases:", error);
  }
}

/**
 * Write data to App Group UserDefaults
 *
 * This uses the SharedGroupPreferences native module if available,
 * otherwise falls back to a no-op with a warning.
 */
async function writeToAppGroup(releases: WidgetRelease[]): Promise<void> {
  // Try to use expo-shared-preferences or similar if available
  // For now, we'll implement this via a config plugin that injects the capability

  // Check if the native module is available
  const SharedPreferences = NativeModules.MiraWidgetBridge;

  if (SharedPreferences?.setWidgetData) {
    const jsonData = JSON.stringify(releases);
    await SharedPreferences.setWidgetData(jsonData);
    return;
  }

  // Fallback: Try to use react-native-shared-group-preferences if installed
  try {
    // Dynamic import to avoid crash if not installed
    const SharedGroupPreferences = require("react-native-shared-group-preferences");
    await SharedGroupPreferences.default.setItem(
      RELEASES_KEY,
      JSON.stringify(releases),
      { appGroup: APP_GROUP_IDENTIFIER }
    );
  } catch {
    // If no native bridge is available, we need to set one up
    // This will work after we add the native module via config plugin
    console.log("[Widget] Native bridge not available - will work after prebuild");
  }
}

/**
 * Request the widget to refresh its timeline
 *
 * This tells iOS to update the widget with new data.
 * Only works on iOS 14+.
 */
export async function reloadWidgetTimeline(): Promise<void> {
  if (Platform.OS !== "ios") {
    return;
  }

  try {
    const SharedPreferences = NativeModules.MiraWidgetBridge;
    if (SharedPreferences?.reloadTimeline) {
      await SharedPreferences.reloadTimeline();
    }
  } catch (error) {
    console.warn("[Widget] Failed to reload timeline:", error);
  }
}

export type { WidgetRelease, WidgetEpisodeInfo } from "./types";

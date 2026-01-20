/**
 * Widget Data Export Module
 *
 * Exports release data to platform-specific storage for widget access.
 * - iOS: Uses App Group shared storage via @bacons/apple-targets
 * - Android: Uses SharedPreferences via native module
 *
 * Supports both recent and upcoming releases modes.
 */

import { Platform } from "react-native";
import type { UpcomingRelease } from "@/lib/api/tmdb";
import type { WidgetData, WidgetReleaseItem } from "./types";
import { getPosterFilename } from "./poster-cache";
import {
  isAndroidWidgetStorageAvailable,
  setAndroidRecentReleases,
  setAndroidUpcomingReleases,
  updateAndroidWidgets,
} from "./android-storage";

export * from "./types";
export * from "./poster-cache";
export * from "./android-storage";

// App Group identifier - must match the one in expo-target.config.js
const APP_GROUP_ID = "group.com.yherrero.mira";

// Storage keys - must match Swift TimelineProvider
const RECENT_RELEASES_KEY = "widget_releases_recent";
const UPCOMING_RELEASES_KEY = "widget_releases_upcoming";

// Lazy-loaded ExtensionStorage instance
let storage: InstanceType<typeof import("@bacons/apple-targets").ExtensionStorage> | null = null;

function getStorage() {
  if (Platform.OS !== "ios") {
    return null;
  }

  if (!storage) {
    try {
      const { ExtensionStorage } = require("@bacons/apple-targets");
      storage = new ExtensionStorage(APP_GROUP_ID);
    } catch (error) {
      console.warn("[Widget] Failed to initialize ExtensionStorage:", error);
      return null;
    }
  }

  return storage;
}

/**
 * Check if widget storage is available (iOS or Android)
 */
export function isWidgetStorageAvailable(): boolean {
  if (Platform.OS === "ios") {
    return getStorage() !== null;
  }
  if (Platform.OS === "android") {
    return isAndroidWidgetStorageAvailable();
  }
  return false;
}

/**
 * Convert an UpcomingRelease to the simplified WidgetReleaseItem format
 */
function toWidgetRelease(release: UpcomingRelease): WidgetReleaseItem {
  // Use the local poster filename (cached in App Group by useLists hook)
  const posterFilename = release.media.posterPath
    ? getPosterFilename(release.media.id, release.media.mediaType)
    : null;

  return {
    id: release.media.id,
    mediaType: release.media.mediaType,
    title: release.media.title,
    posterFilename,
    releaseDate: release.releaseDate.split("T")[0], // Ensure YYYY-MM-DD format
    releaseType: release.releaseType,
    episodeInfo: release.episodeInfo
      ? {
          seasonNumber: release.episodeInfo.seasonNumber,
          episodeNumber: release.episodeInfo.episodeNumber,
          episodeName: release.episodeInfo.episodeName,
        }
      : null,
    score: release.media.score ?? null,
  };
}

/**
 * Export recent releases to the widget's shared storage
 *
 * This writes past release data (already aired) to platform-specific storage,
 * which can be read by the widget extension when configured for "Recent Releases".
 *
 * @param releases - Array of recent releases to export (should be past releases)
 * @param maxItems - Maximum number of items to export (default: 10)
 */
export async function exportRecentReleasesToWidget(
  releases: UpcomingRelease[],
  maxItems = 10
): Promise<void> {
  const widgetReleases = releases.slice(0, maxItems).map(toWidgetRelease);

  const widgetData: WidgetData = {
    releases: widgetReleases,
    mode: "recent",
    lastUpdated: new Date().toISOString(),
  };

  const jsonData = JSON.stringify(widgetData);

  // iOS: Use App Group storage
  if (Platform.OS === "ios") {
    const s = getStorage();
    if (!s) return;

    try {
      s.set(RECENT_RELEASES_KEY, jsonData);
      reloadWidget();
      console.log(`[Widget] Exported ${widgetReleases.length} recent releases (iOS)`);
    } catch (error) {
      console.warn("[Widget] Failed to export recent releases (iOS):", error);
    }
    return;
  }

  // Android: Use SharedPreferences via native module
  if (Platform.OS === "android") {
    try {
      await setAndroidRecentReleases(jsonData);
      console.log(`[Widget] Exported ${widgetReleases.length} recent releases (Android)`);
    } catch (error) {
      console.warn("[Widget] Failed to export recent releases (Android):", error);
    }
    return;
  }
}

/**
 * Export upcoming releases to the widget's shared storage
 *
 * This writes future release data to platform-specific storage,
 * which can be read by the widget extension when configured for "Upcoming Releases".
 *
 * @param releasesByDate - Map of releases grouped by date
 * @param maxItems - Maximum number of items to export (default: 10)
 */
export async function exportUpcomingReleasesToWidget(
  releasesByDate: Map<string, UpcomingRelease[]>,
  maxItems = 10
): Promise<void> {
  // Flatten the map and filter to only future releases
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const allReleases: UpcomingRelease[] = [];
  const sortedDates = Array.from(releasesByDate.keys()).sort();

  for (const date of sortedDates) {
    const releases = releasesByDate.get(date) || [];
    allReleases.push(...releases);
  }

  // Filter to only upcoming releases (today and future)
  const upcomingReleases = allReleases.filter((release) => {
    const releaseDate = new Date(release.releaseDate);
    releaseDate.setHours(0, 0, 0, 0);
    return releaseDate >= now;
  });

  // Sort by release date ascending (soonest first)
  upcomingReleases.sort(
    (a, b) =>
      new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  );

  const widgetReleases = upcomingReleases
    .slice(0, maxItems)
    .map(toWidgetRelease);

  const widgetData: WidgetData = {
    releases: widgetReleases,
    mode: "upcoming",
    lastUpdated: new Date().toISOString(),
  };

  const jsonData = JSON.stringify(widgetData);

  // iOS: Use App Group storage
  if (Platform.OS === "ios") {
    const s = getStorage();
    if (!s) return;

    try {
      s.set(UPCOMING_RELEASES_KEY, jsonData);
      reloadWidget();
      console.log(`[Widget] Exported ${widgetReleases.length} upcoming releases (iOS)`);
    } catch (error) {
      console.warn("[Widget] Failed to export upcoming releases (iOS):", error);
    }
    return;
  }

  // Android: Use SharedPreferences via native module
  if (Platform.OS === "android") {
    try {
      await setAndroidUpcomingReleases(jsonData);
      console.log(`[Widget] Exported ${widgetReleases.length} upcoming releases (Android)`);
    } catch (error) {
      console.warn("[Widget] Failed to export upcoming releases (Android):", error);
    }
    return;
  }
}

/**
 * Request the widget to refresh its timeline
 */
export async function reloadWidget(): Promise<void> {
  // iOS: Use ExtensionStorage to reload widget
  if (Platform.OS === "ios") {
    try {
      const { ExtensionStorage } = require("@bacons/apple-targets");
      ExtensionStorage.reloadWidget("MiraWidget");
    } catch (error) {
      console.warn("[Widget] Failed to reload widget (iOS):", error);
    }
    return;
  }

  // Android: Use native module to update widgets
  if (Platform.OS === "android") {
    try {
      await updateAndroidWidgets();
    } catch (error) {
      console.warn("[Widget] Failed to reload widget (Android):", error);
    }
    return;
  }
}

/**
 * Widget Data Export Module
 *
 * Exports release data to App Group shared storage for iOS widget access.
 * Supports both recent and upcoming releases modes.
 * On non-iOS platforms, this module is a no-op.
 */

import { Platform } from "react-native";
import type { UpcomingRelease } from "@/lib/api/tmdb";
import type { WidgetData, WidgetReleaseItem } from "./types";
import { getPosterUrl } from "@/lib/types";

export * from "./types";

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
 * Check if widget storage is available (iOS only)
 */
export function isWidgetStorageAvailable(): boolean {
  return getStorage() !== null;
}

/**
 * Convert an UpcomingRelease to the simplified WidgetReleaseItem format
 */
function toWidgetRelease(release: UpcomingRelease): WidgetReleaseItem {
  // Convert posterPath to full URL for widget to load directly
  const posterUrl = getPosterUrl(release.media.posterPath, "small") ?? null;
  
  return {
    id: release.media.id,
    mediaType: release.media.mediaType,
    title: release.media.title,
    posterUrl,
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
 * This writes past release data (already aired) to App Group storage,
 * which can be read by the iOS widget extension when configured for "Recent Releases".
 *
 * @param releases - Array of recent releases to export (should be past releases)
 * @param maxItems - Maximum number of items to export (default: 10)
 */
export function exportRecentReleasesToWidget(
  releases: UpcomingRelease[],
  maxItems = 10
): void {
  const s = getStorage();
  if (!s) return;

  try {
    const widgetReleases = releases.slice(0, maxItems).map(toWidgetRelease);

    const widgetData: WidgetData = {
      releases: widgetReleases,
      mode: "recent",
      lastUpdated: new Date().toISOString(),
    };

    s.set(RECENT_RELEASES_KEY, JSON.stringify(widgetData));

    // Trigger widget refresh
    reloadWidget();

    console.log(`[Widget] Exported ${widgetReleases.length} recent releases`);
  } catch (error) {
    console.warn("[Widget] Failed to export recent releases:", error);
  }
}

/**
 * Export upcoming releases to the widget's shared storage
 *
 * This writes future release data to App Group storage,
 * which can be read by the iOS widget extension when configured for "Upcoming Releases".
 *
 * @param releasesByDate - Map of releases grouped by date
 * @param maxItems - Maximum number of items to export (default: 10)
 */
export function exportUpcomingReleasesToWidget(
  releasesByDate: Map<string, UpcomingRelease[]>,
  maxItems = 10
): void {
  const s = getStorage();
  if (!s) return;

  try {
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

    s.set(UPCOMING_RELEASES_KEY, JSON.stringify(widgetData));

    // Trigger widget refresh
    reloadWidget();

    console.log(`[Widget] Exported ${widgetReleases.length} upcoming releases`);
  } catch (error) {
    console.warn("[Widget] Failed to export upcoming releases:", error);
  }
}

/**
 * Request the widget to refresh its timeline
 */
export function reloadWidget(): void {
  if (Platform.OS !== "ios") return;

  try {
    const { ExtensionStorage } = require("@bacons/apple-targets");
    ExtensionStorage.reloadWidget("MiraWidget");
  } catch (error) {
    console.warn("[Widget] Failed to reload widget:", error);
  }
}

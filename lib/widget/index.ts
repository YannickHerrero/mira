/**
 * Widget Data Export Module
 *
 * Exports release data to App Group shared storage for iOS widget access.
 * Supports both recent and upcoming releases modes.
 * On non-iOS platforms, this module is a no-op.
 */

import { Platform, NativeModules } from "react-native";
import type { UpcomingRelease } from "@/lib/api/tmdb";
import { getPosterUrl } from "@/lib/types";
import type { WidgetRelease } from "./types";

// App Group identifier - must match the one in the config plugin
const APP_GROUP_IDENTIFIER = "group.com.yherrero.mira";

// Storage keys for recent and upcoming releases (must match Swift TimelineProvider)
const RECENT_RELEASES_KEY = "widget_releases_recent";
const UPCOMING_RELEASES_KEY = "widget_releases_upcoming";

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
 * Export recent releases to the widget's shared storage
 *
 * This writes past release data (already aired) to App Group UserDefaults,
 * which can be read by the iOS widget extension when configured for "Recent Releases".
 *
 * @param releases - Array of recent releases to export (should be past releases)
 * @param maxItems - Maximum number of items to export (default: 5)
 */
export async function exportRecentReleasesToWidget(
  releases: UpcomingRelease[],
  maxItems = 5
): Promise<void> {
  // Only run on iOS
  if (Platform.OS !== "ios") {
    return;
  }

  try {
    // Convert and limit releases
    const widgetReleases = releases.slice(0, maxItems).map(toWidgetRelease);

    // Write to App Group UserDefaults using native module
    await writeToAppGroup(RECENT_RELEASES_KEY, widgetReleases);

    console.log(
      `[Widget] Exported ${widgetReleases.length} recent releases to widget`
    );
  } catch (error) {
    // Log but don't throw - widget export is non-critical
    console.warn("[Widget] Failed to export recent releases:", error);
  }
}

/**
 * Export upcoming releases to the widget's shared storage
 *
 * This writes future release data (today + not yet aired) to App Group UserDefaults,
 * which can be read by the iOS widget extension when configured for "Upcoming Releases".
 *
 * @param releases - Array of releases (will be filtered to today + future only)
 * @param maxItems - Maximum number of items to export (default: 5)
 */
export async function exportUpcomingReleasesToWidget(
  releases: UpcomingRelease[],
  maxItems = 5
): Promise<void> {
  // Only run on iOS
  if (Platform.OS !== "ios") {
    return;
  }

  try {
    // Filter to only include today and future releases
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingReleases = releases.filter((release) => {
      const releaseDate = new Date(release.releaseDate);
      releaseDate.setHours(0, 0, 0, 0);
      return releaseDate >= today;
    });

    // Sort by release date ascending (soonest first)
    upcomingReleases.sort(
      (a, b) =>
        new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
    );

    // Convert and limit releases
    const widgetReleases = upcomingReleases
      .slice(0, maxItems)
      .map(toWidgetRelease);

    // Write to App Group UserDefaults using native module
    await writeToAppGroup(UPCOMING_RELEASES_KEY, widgetReleases);

    console.log(
      `[Widget] Exported ${widgetReleases.length} upcoming releases to widget`
    );
  } catch (error) {
    // Log but don't throw - widget export is non-critical
    console.warn("[Widget] Failed to export upcoming releases:", error);
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use exportRecentReleasesToWidget instead
 */
export async function exportReleasesToWidget(
  releases: UpcomingRelease[],
  maxItems = 5
): Promise<void> {
  return exportRecentReleasesToWidget(releases, maxItems);
}

/**
 * Write data to App Group UserDefaults
 *
 * This uses the MiraWidgetBridge native module to write data
 * that can be read by the iOS widget extension.
 */
async function writeToAppGroup(
  key: string,
  releases: WidgetRelease[]
): Promise<void> {
  // Check if the native module is available
  const WidgetBridge = NativeModules.MiraWidgetBridge;

  if (WidgetBridge?.setWidgetData) {
    const jsonData = JSON.stringify(releases);
    await WidgetBridge.setWidgetData(key, jsonData);
    return;
  }

  // Fallback: Try to use react-native-shared-group-preferences if installed
  try {
    // Dynamic import to avoid crash if not installed
    const SharedGroupPreferences = require("react-native-shared-group-preferences");
    await SharedGroupPreferences.default.setItem(
      key,
      JSON.stringify(releases),
      { appGroup: APP_GROUP_IDENTIFIER }
    );
  } catch {
    // If no native bridge is available, we need to set one up
    // This will work after we add the native module via config plugin
    console.log(
      "[Widget] Native bridge not available - will work after prebuild"
    );
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
    const WidgetBridge = NativeModules.MiraWidgetBridge;
    if (WidgetBridge?.reloadTimeline) {
      await WidgetBridge.reloadTimeline();
    }
  } catch (error) {
    console.warn("[Widget] Failed to reload timeline:", error);
  }
}

export type { WidgetRelease, WidgetEpisodeInfo } from "./types";

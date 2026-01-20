/**
 * Android Widget Storage Module
 *
 * Provides an interface to the native Android WidgetDataModule.
 * This module stores widget data in SharedPreferences and triggers widget updates.
 *
 * On non-Android platforms, all operations are no-ops.
 */

import { Platform, NativeModules } from "react-native";

interface WidgetDataModuleInterface {
  setRecentReleases(jsonData: string): Promise<boolean>;
  setUpcomingReleases(jsonData: string): Promise<boolean>;
  setWidgetConfig(widgetId: number, configJson: string): Promise<boolean>;
  getWidgetConfig(widgetId: number): Promise<string | null>;
  updateAllWidgets(): Promise<boolean>;
  hasActiveWidgets(): Promise<boolean>;
}

/**
 * Get the native module instance (Android only)
 */
function getNativeModule(): WidgetDataModuleInterface | null {
  if (Platform.OS !== "android") {
    return null;
  }

  const module = NativeModules.MiraWidgetData;
  if (!module) {
    console.warn("[AndroidWidget] Native module not available");
    return null;
  }

  return module as WidgetDataModuleInterface;
}

/**
 * Check if Android widget storage is available
 */
export function isAndroidWidgetStorageAvailable(): boolean {
  return getNativeModule() !== null;
}

/**
 * Store recent releases data for Android widgets
 *
 * @param jsonData - JSON stringified WidgetData object
 * @returns true if successful, false otherwise
 */
export async function setAndroidRecentReleases(
  jsonData: string
): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;

  try {
    await module.setRecentReleases(jsonData);
    console.log("[AndroidWidget] Saved recent releases to SharedPreferences");
    return true;
  } catch (error) {
    console.warn("[AndroidWidget] Failed to save recent releases:", error);
    return false;
  }
}

/**
 * Store upcoming releases data for Android widgets
 *
 * @param jsonData - JSON stringified WidgetData object
 * @returns true if successful, false otherwise
 */
export async function setAndroidUpcomingReleases(
  jsonData: string
): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;

  try {
    await module.setUpcomingReleases(jsonData);
    console.log("[AndroidWidget] Saved upcoming releases to SharedPreferences");
    return true;
  } catch (error) {
    console.warn("[AndroidWidget] Failed to save upcoming releases:", error);
    return false;
  }
}

/**
 * Trigger update for all Android Mira widgets
 *
 * @returns true if successful, false otherwise
 */
export async function updateAndroidWidgets(): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;

  try {
    await module.updateAllWidgets();
    console.log("[AndroidWidget] Triggered widget update");
    return true;
  } catch (error) {
    console.warn("[AndroidWidget] Failed to update widgets:", error);
    return false;
  }
}

/**
 * Check if any Android widgets are currently installed
 *
 * @returns true if at least one widget is active
 */
export async function hasAndroidActiveWidgets(): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;

  try {
    return await module.hasActiveWidgets();
  } catch (error) {
    console.warn("[AndroidWidget] Failed to check active widgets:", error);
    return false;
  }
}

/**
 * Store widget configuration
 *
 * @param widgetId - Android widget instance ID
 * @param config - Configuration object to store
 * @returns true if successful, false otherwise
 */
export async function setAndroidWidgetConfig(
  widgetId: number,
  config: { mode: "recent" | "upcoming"; layout?: string }
): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;

  try {
    await module.setWidgetConfig(widgetId, JSON.stringify(config));
    return true;
  } catch (error) {
    console.warn("[AndroidWidget] Failed to save widget config:", error);
    return false;
  }
}

/**
 * Get widget configuration
 *
 * @param widgetId - Android widget instance ID
 * @returns Configuration object or null if not found
 */
export async function getAndroidWidgetConfig(
  widgetId: number
): Promise<{ mode: "recent" | "upcoming"; layout?: string } | null> {
  const module = getNativeModule();
  if (!module) return null;

  try {
    const configJson = await module.getWidgetConfig(widgetId);
    if (configJson) {
      return JSON.parse(configJson);
    }
    return null;
  } catch (error) {
    console.warn("[AndroidWidget] Failed to get widget config:", error);
    return null;
  }
}

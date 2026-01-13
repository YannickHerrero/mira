/**
 * iOS Widget Config Plugin for Mira
 *
 * This plugin adds a WidgetKit extension to the iOS app that displays
 * recent releases from the user's watchlist.
 */

import type { ConfigPlugin } from "@expo/config-plugins";
import { withWidgetExtension } from "./withWidgetExtension";
import { withAppGroups } from "./withAppGroups";
import { withWidgetBridge } from "./withWidgetBridge";

export interface WidgetPluginProps {
  /**
   * The name of the widget as it appears in the widget gallery
   * @default "Mira"
   */
  widgetName?: string;

  /**
   * The App Group identifier for sharing data between app and widget
   * @default "group.{bundleIdentifier}"
   */
  appGroupIdentifier?: string;

  /**
   * The Apple Developer Team ID (required for signing)
   */
  devTeamId?: string;
}

const withMiraWidget: ConfigPlugin<WidgetPluginProps | void> = (
  config,
  props
) => {
  const {
    widgetName = "Mira",
    appGroupIdentifier,
    devTeamId,
  } = props ?? {};

  const bundleIdentifier = config.ios?.bundleIdentifier ?? "com.example.app";
  const finalAppGroupId = appGroupIdentifier ?? `group.${bundleIdentifier}`;

  // Apply App Groups entitlement to main app
  config = withAppGroups(config, { appGroupIdentifier: finalAppGroupId });

  // Add native bridge module for React Native <-> Widget communication
  config = withWidgetBridge(config, { appGroupIdentifier: finalAppGroupId });

  // Add widget extension target
  config = withWidgetExtension(config, {
    widgetName,
    appGroupIdentifier: finalAppGroupId,
    devTeamId,
  });

  return config;
};

export default withMiraWidget;

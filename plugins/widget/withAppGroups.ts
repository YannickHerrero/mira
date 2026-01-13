/**
 * Config plugin to add App Groups entitlement to the main app
 *
 * App Groups allow the main app and widget extension to share data
 * via a shared container (UserDefaults or file system).
 */

import {
  type ConfigPlugin,
  withEntitlementsPlist,
  withInfoPlist,
} from "@expo/config-plugins";

export interface WithAppGroupsProps {
  appGroupIdentifier: string;
}

export const withAppGroups: ConfigPlugin<WithAppGroupsProps> = (
  config,
  { appGroupIdentifier }
) => {
  // Add App Groups entitlement to the main app
  config = withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;

    // Add the app group identifier to the entitlements
    entitlements["com.apple.security.application-groups"] = [appGroupIdentifier];

    return config;
  });

  // Also expose the app group identifier via Info.plist for easy access in native code
  config = withInfoPlist(config, (config) => {
    config.modResults.AppGroupIdentifier = appGroupIdentifier;
    return config;
  });

  return config;
};

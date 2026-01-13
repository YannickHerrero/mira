/**
 * iOS Widget Config Plugin for Mira
 *
 * This is a JavaScript wrapper that loads the TypeScript plugin.
 * Expo config plugins run at build time and need to be in JavaScript.
 */

const {
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const WIDGET_TARGET_NAME = "MiraWidgetExtension";
const WIDGET_BUNDLE_ID_SUFFIX = ".widget";

/**
 * Main widget plugin entry point
 */
function withMiraWidget(config, props = {}) {
  const {
    widgetName = "Mira",
    appGroupIdentifier,
    devTeamId,
  } = props;

  const bundleIdentifier = config.ios?.bundleIdentifier ?? "com.example.app";
  const finalAppGroupId = appGroupIdentifier ?? `group.${bundleIdentifier}`;

  // Apply App Groups entitlement to main app
  config = withAppGroups(config, { appGroupIdentifier: finalAppGroupId });

  // Add native bridge module
  config = withWidgetBridge(config, { appGroupIdentifier: finalAppGroupId });

  // Add widget extension target
  config = withWidgetExtension(config, {
    widgetName,
    appGroupIdentifier: finalAppGroupId,
    devTeamId,
  });

  return config;
}

/**
 * Add App Groups entitlement
 */
function withAppGroups(config, { appGroupIdentifier }) {
  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.security.application-groups"] = [appGroupIdentifier];
    return config;
  });

  config = withInfoPlist(config, (config) => {
    config.modResults.AppGroupIdentifier = appGroupIdentifier;
    return config;
  });

  return config;
}

/**
 * Add widget bridge native module
 */
function withWidgetBridge(config, { appGroupIdentifier }) {
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName ?? "Mira";
      const appDir = path.join(projectRoot, projectName);

      // Create the bridge Swift file
      const bridgeCode = generateBridgeSwift(appGroupIdentifier);
      const bridgePath = path.join(appDir, "MiraWidgetBridge.swift");
      fs.writeFileSync(bridgePath, bridgeCode, "utf-8");

      // Create the Objective-C bridge header
      const bridgeHeaderCode = generateBridgeHeader();
      const bridgeHeaderPath = path.join(appDir, "MiraWidgetBridge.m");
      fs.writeFileSync(bridgeHeaderPath, bridgeHeaderCode, "utf-8");

      return config;
    },
  ]);

  return config;
}

/**
 * Add widget extension target
 */
function withWidgetExtension(config, { widgetName, appGroupIdentifier, devTeamId }) {
  // Copy widget source files
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const widgetDir = path.join(platformRoot, WIDGET_TARGET_NAME);

      // Create widget directory
      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }

      // Copy widget source files
      const sourceDir = path.join(projectRoot, "widget");
      if (fs.existsSync(sourceDir)) {
        copyDirectorySync(sourceDir, widgetDir);
      }

      // Generate Info.plist for widget
      const infoPlist = generateWidgetInfoPlist(widgetName);
      fs.writeFileSync(path.join(widgetDir, "Info.plist"), infoPlist, "utf-8");

      // Generate entitlements for widget
      const entitlements = generateWidgetEntitlements(appGroupIdentifier);
      fs.writeFileSync(
        path.join(widgetDir, `${WIDGET_TARGET_NAME}.entitlements`),
        entitlements,
        "utf-8"
      );

      return config;
    },
  ]);

  // Add widget target to Xcode project
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const bundleIdentifier = config.ios?.bundleIdentifier ?? "com.example.app";
    const widgetBundleId = `${bundleIdentifier}${WIDGET_BUNDLE_ID_SUFFIX}`;

    // Add widget extension target
    const target = xcodeProject.addTarget(
      WIDGET_TARGET_NAME,
      "app_extension",
      WIDGET_TARGET_NAME,
      widgetBundleId
    );

    const targetKey = target.uuid;

    // Add widget group to project
    const widgetGroupKey = xcodeProject.addPbxGroup(
      [],
      WIDGET_TARGET_NAME,
      WIDGET_TARGET_NAME,
      '"<group>"'
    ).uuid;

    // Add to main group
    const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addToPbxGroup(widgetGroupKey, mainGroupKey);

    // Add Swift source files
    const swiftFiles = [
      "MiraWidget.swift",
      "TimelineProvider.swift",
      "ReleaseEntry.swift",
      "WidgetViews.swift",
    ];

    for (const file of swiftFiles) {
      const filePath = `${WIDGET_TARGET_NAME}/${file}`;
      xcodeProject.addSourceFile(filePath, { target: targetKey }, widgetGroupKey);
    }

    // Add Info.plist and entitlements
    xcodeProject.addFile(`${WIDGET_TARGET_NAME}/Info.plist`, widgetGroupKey);
    xcodeProject.addFile(
      `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`,
      widgetGroupKey
    );

    // Configure build settings for widget target
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      if (
        typeof configurations[key] === "object" &&
        configurations[key].buildSettings
      ) {
        const buildSettings = configurations[key].buildSettings;
        const productName = buildSettings.PRODUCT_NAME;

        if (
          productName === `"${WIDGET_TARGET_NAME}"` ||
          productName === WIDGET_TARGET_NAME
        ) {
          buildSettings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = "AccentColor";
          buildSettings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = "WidgetBackground";
          buildSettings.CODE_SIGN_ENTITLEMENTS = `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`;
          buildSettings.CODE_SIGN_STYLE = "Automatic";
          buildSettings.CURRENT_PROJECT_VERSION = "1";
          buildSettings.GENERATE_INFOPLIST_FILE = "YES";
          buildSettings.INFOPLIST_FILE = `${WIDGET_TARGET_NAME}/Info.plist`;
          buildSettings.INFOPLIST_KEY_CFBundleDisplayName = widgetName;
          buildSettings.INFOPLIST_KEY_NSHumanReadableCopyright = "";
          buildSettings.LD_RUNPATH_SEARCH_PATHS = `"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"`;
          buildSettings.MARKETING_VERSION = "1.0";
          buildSettings.PRODUCT_BUNDLE_IDENTIFIER = widgetBundleId;
          buildSettings.PRODUCT_NAME = `"$(TARGET_NAME)"`;
          buildSettings.SKIP_INSTALL = "YES";
          buildSettings.SWIFT_EMIT_LOC_STRINGS = "YES";
          buildSettings.SWIFT_VERSION = "5.0";
          buildSettings.TARGETED_DEVICE_FAMILY = `"1,2"`;

          if (devTeamId) {
            buildSettings.DEVELOPMENT_TEAM = devTeamId;
          }
        }
      }
    }

    // Add embed app extensions build phase
    const mainAppTarget = xcodeProject.getFirstTarget();
    if (mainAppTarget) {
      xcodeProject.addBuildPhase(
        [],
        "PBXCopyFilesBuildPhase",
        "Embed App Extensions",
        mainAppTarget.uuid,
        "app_extension",
        `"${WIDGET_TARGET_NAME}.appex"`
      );
    }

    return config;
  });

  return config;
}

// Helper functions

function copyDirectorySync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function generateWidgetInfoPlist(widgetName) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>${widgetName}</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;
}

function generateWidgetEntitlements(appGroupIdentifier) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroupIdentifier}</string>
  </array>
</dict>
</plist>
`;
}

function generateBridgeSwift(appGroupIdentifier) {
  return `import Foundation
import WidgetKit

/// Native module that bridges React Native with the iOS widget
@objc(MiraWidgetBridge)
class MiraWidgetBridge: NSObject {
  
  private let appGroupIdentifier = "${appGroupIdentifier}"
  private let releasesKey = "widget_releases"
  
  @objc(setWidgetData:resolver:rejecter:)
  func setWidgetData(
    _ jsonData: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      reject("ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    
    if let data = jsonData.data(using: .utf8) {
      userDefaults.set(data, forKey: releasesKey)
      userDefaults.synchronize()
      
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
      
      resolve(true)
    } else {
      reject("ERROR", "Failed to encode JSON data", nil)
    }
  }
  
  @objc(reloadTimeline:rejecter:)
  func reloadTimeline(
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
      resolve(true)
    } else {
      resolve(false)
    }
  }
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
`;
}

function generateBridgeHeader() {
  return `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MiraWidgetBridge, NSObject)

RCT_EXTERN_METHOD(setWidgetData:(NSString *)jsonData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadTimeline:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
`;
}

module.exports = withMiraWidget;

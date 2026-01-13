/**
 * Config plugin to add WidgetKit extension target to iOS project
 *
 * This plugin:
 * 1. Creates a new widget extension target in the Xcode project
 * 2. Copies Swift source files for the widget
 * 3. Configures build settings and entitlements
 * 4. Sets up the widget in the project structure
 */

import {
  type ConfigPlugin,
  withXcodeProject,
  withDangerousMod,
  IOSConfig,
} from "@expo/config-plugins";
import * as fs from "fs";
import * as path from "path";

export interface WithWidgetExtensionProps {
  widgetName: string;
  appGroupIdentifier: string;
  devTeamId?: string;
}

const WIDGET_TARGET_NAME = "MiraWidgetExtension";
const WIDGET_BUNDLE_ID_SUFFIX = ".widget";

export const withWidgetExtension: ConfigPlugin<WithWidgetExtensionProps> = (
  config,
  { widgetName, appGroupIdentifier, devTeamId }
) => {
  // Copy widget source files to the iOS project
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

      // Copy widget source files from our widget template
      const sourceDir = path.join(projectRoot, "widget");
      if (fs.existsSync(sourceDir)) {
        copyDirectorySync(sourceDir, widgetDir);
      }

      // Generate Info.plist for widget extension
      const infoPlist = generateWidgetInfoPlist(widgetName);
      fs.writeFileSync(
        path.join(widgetDir, "Info.plist"),
        infoPlist,
        "utf-8"
      );

      // Generate entitlements for widget extension
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
    const platformRoot = config.modRequest.platformProjectRoot;

    // Get or create the widget target
    const targetUuid = xcodeProject.generateUuid();
    const widgetDir = WIDGET_TARGET_NAME;

    // Add widget extension target
    const target = xcodeProject.addTarget(
      WIDGET_TARGET_NAME,
      "app_extension",
      WIDGET_TARGET_NAME,
      widgetBundleId
    );

    // Get the target key
    const targetKey = target.uuid;

    // Add source files to widget target
    const widgetGroupKey = xcodeProject.addPbxGroup(
      [],
      WIDGET_TARGET_NAME,
      widgetDir,
      '"<group>"'
    ).uuid;

    // Find main group and add widget group
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
      const filePath = `${widgetDir}/${file}`;
      xcodeProject.addSourceFile(
        filePath,
        { target: targetKey },
        widgetGroupKey
      );
    }

    // Add Info.plist
    xcodeProject.addFile(
      `${widgetDir}/Info.plist`,
      widgetGroupKey
    );

    // Add entitlements
    xcodeProject.addFile(
      `${widgetDir}/${WIDGET_TARGET_NAME}.entitlements`,
      widgetGroupKey
    );

    // Configure build settings for the widget target
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      if (
        typeof configurations[key] === "object" &&
        configurations[key].buildSettings
      ) {
        const buildSettings = configurations[key].buildSettings;
        const productName = buildSettings.PRODUCT_NAME;

        // Check if this is a widget target configuration
        if (productName === `"${WIDGET_TARGET_NAME}"` || productName === WIDGET_TARGET_NAME) {
          // Set common build settings
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

    // Add widget to main app's embed frameworks build phase
    // This ensures the widget is included in the app bundle
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
};

/**
 * Recursively copy directory contents
 */
function copyDirectorySync(src: string, dest: string): void {
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

/**
 * Generate Info.plist for widget extension
 */
function generateWidgetInfoPlist(widgetName: string): string {
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

/**
 * Generate entitlements for widget extension
 */
function generateWidgetEntitlements(appGroupIdentifier: string): string {
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

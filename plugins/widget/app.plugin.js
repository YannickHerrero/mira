/**
 * Mira Widget Bridge Config Plugin
 *
 * This plugin handles:
 * 1. Adding App Groups entitlement to the main app
 * 2. Injecting the MiraWidgetBridge native module for React Native <-> Widget communication
 *
 * The widget extension itself is handled by react-native-widget-extension.
 */

const {
  withEntitlementsPlist,
  withInfoPlist,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Main plugin entry point
 */
function withMiraWidgetBridge(config, props = {}) {
  const { appGroupIdentifier } = props;

  const bundleIdentifier = config.ios?.bundleIdentifier ?? "com.example.app";
  const finalAppGroupId = appGroupIdentifier ?? `group.${bundleIdentifier}`;

  // Add App Groups entitlement to main app
  config = withAppGroups(config, { appGroupIdentifier: finalAppGroupId });

  // Add native bridge module for React Native <-> Widget communication
  config = withWidgetBridge(config, { appGroupIdentifier: finalAppGroupId });

  return config;
}

/**
 * Add App Groups entitlement to the main app
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
 * Add native bridge module for data sharing
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

function generateBridgeSwift(appGroupIdentifier) {
  return `import Foundation
import WidgetKit

/// Native module that bridges React Native with the iOS widget
/// Supports storing both recent and upcoming releases with different keys
@objc(MiraWidgetBridge)
class MiraWidgetBridge: NSObject {
  
  private let appGroupIdentifier = "${appGroupIdentifier}"
  
  @objc(setWidgetData:jsonData:resolver:rejecter:)
  func setWidgetData(
    _ key: String,
    jsonData: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let userDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      reject("ERROR", "Failed to access App Group UserDefaults", nil)
      return
    }
    
    if let data = jsonData.data(using: .utf8) {
      userDefaults.set(data, forKey: key)
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

RCT_EXTERN_METHOD(setWidgetData:(NSString *)key
                  jsonData:(NSString *)jsonData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadTimeline:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
`;
}

module.exports = withMiraWidgetBridge;

/**
 * Config plugin to add the MiraWidgetBridge native module
 *
 * This module provides a bridge between React Native and the iOS widget,
 * allowing the app to write data to App Group storage that the widget can read.
 */

import {
  type ConfigPlugin,
  withDangerousMod,
  IOSConfig,
} from "@expo/config-plugins";
import * as fs from "fs";
import * as path from "path";

export interface WithWidgetBridgeProps {
  appGroupIdentifier: string;
}

export const withWidgetBridge: ConfigPlugin<WithWidgetBridgeProps> = (
  config,
  { appGroupIdentifier }
) => {
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

      // Create the Objective-C bridge header for React Native
      const bridgeHeaderCode = generateBridgeHeader();
      const bridgeHeaderPath = path.join(appDir, "MiraWidgetBridge.m");
      fs.writeFileSync(bridgeHeaderPath, bridgeHeaderCode, "utf-8");

      return config;
    },
  ]);

  return config;
};

/**
 * Generate Swift code for the widget bridge native module
 */
function generateBridgeSwift(appGroupIdentifier: string): string {
  return `import Foundation
import WidgetKit

/// Native module that bridges React Native with the iOS widget
/// Provides methods to write data to App Group storage and refresh the widget
@objc(MiraWidgetBridge)
class MiraWidgetBridge: NSObject {
  
  private let appGroupIdentifier = "${appGroupIdentifier}"
  private let releasesKey = "widget_releases"
  
  /// Write widget data to App Group UserDefaults
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
    
    // Store as Data for efficient reading in Swift widget
    if let data = jsonData.data(using: .utf8) {
      userDefaults.set(data, forKey: releasesKey)
      userDefaults.synchronize()
      
      // Also trigger widget refresh
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
      
      resolve(true)
    } else {
      reject("ERROR", "Failed to encode JSON data", nil)
    }
  }
  
  /// Force reload the widget timeline
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
  
  /// Required for React Native module
  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
`;
}

/**
 * Generate Objective-C bridge header for the native module
 */
function generateBridgeHeader(): string {
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

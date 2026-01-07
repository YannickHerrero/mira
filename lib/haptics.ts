import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Trigger a light impact haptic feedback
 * Use for subtle interactions like hovering or soft taps
 */
export function lightImpact() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * Trigger a medium impact haptic feedback
 * Use for standard button presses and selections
 */
export function mediumImpact() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/**
 * Trigger a heavy impact haptic feedback
 * Use for significant actions like completing a task
 */
export function heavyImpact() {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

/**
 * Trigger a selection changed haptic feedback
 * Use when changing selections like tabs, toggles, or pickers
 */
export function selectionChanged() {
  if (Platform.OS !== "web") {
    Haptics.selectionAsync();
  }
}

/**
 * Trigger a success notification haptic feedback
 * Use for successful actions like saving, completing, etc.
 */
export function notifySuccess() {
  if (Platform.OS !== "web") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/**
 * Trigger a warning notification haptic feedback
 * Use for warning states
 */
export function notifyWarning() {
  if (Platform.OS !== "web") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

/**
 * Trigger an error notification haptic feedback
 * Use for error states or destructive actions
 */
export function notifyError() {
  if (Platform.OS !== "web") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

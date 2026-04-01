import { useEffect, useCallback, useState } from "react";
import { Alert, AppState, Platform } from "react-native";
import * as Updates from "expo-updates";

export function useOTAUpdates() {
  const [isChecking, setIsChecking] = useState(false);

  const checkAndApplyUpdate = useCallback(async () => {
    if (__DEV__ || Platform.OS === "web") return;

    try {
      setIsChecking(true);
      const check = await Updates.checkForUpdateAsync();

      if (check.isAvailable) {
        const update = await Updates.fetchUpdateAsync();

        if (update.isNew) {
          Alert.alert(
            "Update Available",
            "A new version has been downloaded. Restart the app to apply it.",
            [
              { text: "Later", style: "cancel" },
              {
                text: "Restart",
                onPress: () => Updates.reloadAsync(),
              },
            ]
          );
          return true;
        }
      }
      return false;
    } catch (error) {
      console.log("OTA update check failed:", error);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check on app foreground
  useEffect(() => {
    if (__DEV__ || Platform.OS === "web") return;

    // Check on mount
    checkAndApplyUpdate();

    // Check when app comes to foreground
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkAndApplyUpdate();
      }
    });

    return () => subscription.remove();
  }, [checkAndApplyUpdate]);

  const manualCheck = useCallback(async () => {
    if (__DEV__ || Platform.OS === "web") {
      Alert.alert("Not Available", "OTA updates are not available in development builds.");
      return;
    }

    const hadUpdate = await checkAndApplyUpdate();
    if (!hadUpdate) {
      Alert.alert("Up to Date", "You're running the latest version.");
    }
  }, [checkAndApplyUpdate]);

  return { checkForUpdate: manualCheck, isChecking };
}

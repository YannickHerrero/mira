import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";
import { NAV_THEME } from "@/lib/constants";

export async function setAndroidNavigationBar() {
  if (Platform.OS !== "android") return;
  await NavigationBar.setButtonStyleAsync("light");
  await NavigationBar.setBackgroundColorAsync(NAV_THEME.background);
}

import { Home } from "@/lib/icons/Home";
import { Search } from "@/lib/icons/Search";
import { CalendarDays } from "@/lib/icons/CalendarDays";
import { Library } from "@/lib/icons/Library";
import { Settings } from "@/lib/icons/Settings";
import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react-native";
import { useDeviceLayout, SIDEBAR_WIDTH } from "@/hooks/useDeviceLayout";

export const unstable_settings = {
  initialRouteName: "index",
};

const TAB_ICONS: Record<string, LucideIcon> = {
  index: Home,
  search: Search,
  calendar: CalendarDays,
  library: Library,
  settings: Settings,
};

const TAB_KEYS: Record<string, string> = {
  index: "tabs.home",
  search: "tabs.search",
  calendar: "tabs.calendar",
  library: "tabs.library",
  settings: "tabs.settings",
};

// Design system colors from global.css (Catppuccin Macchiato)
const COLORS = {
  text: "hsl(227, 68%, 88%)", // #CAD3F5
  yellow: "hsl(40, 70%, 78%)", // #EED49F - active indicator
  background: "rgb(36, 39, 58)", // Base - opaque
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isTabletLandscape } = useDeviceLayout();

  const renderTabItems = () =>
    state.routes.map((route, index) => {
      const { options } = descriptors[route.key];
      const Icon = TAB_ICONS[route.name];
      const titleKey = TAB_KEYS[route.name];
      const isFocused = state.index === index;

      if (!Icon || !titleKey) return null;

      const title = t(titleKey);

      const onPress = () => {
        const event = navigation.emit({
          type: "tabPress",
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      };

      const onLongPress = () => {
        navigation.emit({
          type: "tabLongPress",
          target: route.key,
        });
      };

      return (
        <Pressable
          key={route.key}
          accessibilityRole="button"
          accessibilityState={isFocused ? { selected: true } : {}}
          accessibilityLabel={options.tabBarAccessibilityLabel}
          testID={options.tabBarButtonTestID}
          onPress={onPress}
          onLongPress={onLongPress}
          style={isTabletLandscape ? styles.sidebarItem : styles.tabItem}
        >
          <Icon color={COLORS.text} size={24} />
          <Text style={styles.tabLabel}>{title}</Text>
          <View
            style={[
              styles.indicator,
              { backgroundColor: isFocused ? COLORS.yellow : "transparent" },
            ]}
          />
        </Pressable>
      );
    });

  // Vertical sidebar for iPad landscape
  if (isTabletLandscape) {
    return (
      <BlurView
        intensity={50}
        tint="dark"
        style={[styles.sidebar, { paddingTop: insets.top }]}
      >
        <View style={[styles.sidebarOverlay, { paddingBottom: insets.bottom }]}>
          <View style={styles.sidebarInner}>{renderTabItems()}</View>
        </View>
      </BlurView>
    );
  }

  // Bottom tab bar for all other cases
  return (
    <BlurView
      intensity={50}
      tint="dark"
      style={styles.tabBar}
    >
      <View style={[styles.tabBarOverlay, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.tabBarInner}>{renderTabItems()}</View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  // Bottom tab bar styles
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  tabBarOverlay: {
    backgroundColor: "rgba(36, 39, 58, 0.6)",
    paddingTop: 12,
  },
  tabBarInner: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    gap: 5,
    minWidth: 57,
  },
  // Sidebar styles (iPad landscape)
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    overflow: "hidden",
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: "rgba(36, 39, 58, 0.6)",
    paddingTop: 16,
  },
  sidebarInner: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 8,
    gap: 8,
  },
  sidebarItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    width: "100%",
    paddingVertical: 12,
  },
  // Shared styles
  tabLabel: {
    fontFamily: "Raleway",
    fontWeight: "600",
    fontSize: 8,
    color: COLORS.text,
    textAlign: "center",
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: "hsl(232, 23%, 18%)",
        },
        headerTintColor: "hsl(227, 68%, 88%)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

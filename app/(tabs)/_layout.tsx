import { Home } from "@/lib/icons/Home";
import { Search } from "@/lib/icons/Search";
import { CalendarDays } from "@/lib/icons/CalendarDays";
import { Library } from "@/lib/icons/Library";
import { Settings } from "@/lib/icons/Settings";
import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";

export const unstable_settings = {
  initialRouteName: "index",
};

const TAB_CONFIG: Record<string, { title: string; Icon: LucideIcon }> = {
  index: { title: "Home", Icon: Home },
  search: { title: "Search", Icon: Search },
  calendar: { title: "Calendar", Icon: CalendarDays },
  library: { title: "Library", Icon: Library },
  settings: { title: "Settings", Icon: Settings },
};

// Design system colors from global.css (Catppuccin Macchiato)
const COLORS = {
  text: "hsl(227, 68%, 88%)", // #CAD3F5
  yellow: "hsl(40, 70%, 78%)", // #EED49F - active indicator
  background: "rgb(36, 39, 58)", // Base - opaque
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const config = TAB_CONFIG[route.name];
          const isFocused = state.index === index;

          if (!config) return null;

          const { title, Icon } = config;

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
              style={styles.tabItem}
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
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
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
        }}
      />
    </Tabs>
  );
}

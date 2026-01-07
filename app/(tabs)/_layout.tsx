import { Home } from "@/lib/icons/Home";
import { Search } from "@/lib/icons/Search";
import { Library } from "@/lib/icons/Library";
import { Settings } from "@/lib/icons/Settings";
import { Tabs } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "hsl(240 10% 3.9%)",
          borderTopColor: "hsl(240 3.7% 15.9%)",
        },
        tabBarActiveTintColor: "hsl(0 0% 98%)",
        tabBarInactiveTintColor: "hsl(240 5% 64.9%)",
        headerStyle: {
          backgroundColor: "hsl(240 10% 3.9%)",
        },
        headerTintColor: "hsl(0 0% 98%)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => <Library color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

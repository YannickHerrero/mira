import { Stack } from "expo-router";
import { TabContentWrapper } from "@/components/ui/tab-content-wrapper";

export default function SettingsLayout() {
  return (
    <TabContentWrapper className="bg-mantle">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "hsl(232, 23%, 18%)" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="account" />
        <Stack.Screen name="appearance" />
        <Stack.Screen name="playback" />
        <Stack.Screen name="streaming" />
        <Stack.Screen name="synchronization" />
        <Stack.Screen name="about" />
      </Stack>
    </TabContentWrapper>
  );
}

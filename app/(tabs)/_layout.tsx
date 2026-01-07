import {List} from '@/lib/icons/List';
import {Settings} from '@/lib/icons/Settings';
import {Tabs} from 'expo-router';

export const unstable_settings = {
  initialRouteName: "index",
};

export default function TabLayout() {
  return (
    <Tabs >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Habits',
          tabBarIcon: () => <List className="text-foreground" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: () => <Settings className="text-foreground" />,
        }}
      />
    </Tabs>
  );
}

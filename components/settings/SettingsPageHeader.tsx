import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { ChevronLeft } from "@/lib/icons";

interface SettingsPageHeaderProps {
  title: string;
}

export function SettingsPageHeader({ title }: SettingsPageHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center gap-4 px-4"
      style={{ paddingTop: insets.top + 16 }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        className="active:opacity-70"
      >
        <ChevronLeft size={24} className="text-text" />
      </Pressable>
      <Text className="text-lg font-semibold text-text">
        {title}
      </Text>
    </View>
  );
}

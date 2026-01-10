import { View, Pressable } from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { CircleUser, Pencil } from "@/lib/icons";
import { useApiKeys } from "@/hooks/useApiKeys";
import { BlurView } from "expo-blur";

export function SettingsProfileHeader() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { realDebridUsername, realDebridPremium, realDebridValid } = useApiKeys();

  const displayName = realDebridUsername || t("settings.guest");

  return (
    <View
      className="px-4"
      style={{ paddingTop: insets.top + 16 }}
    >
      {/* Avatar with edit button */}
      <View className="relative w-[100px] h-[100px] mb-4">
        <View className="w-full h-full rounded-full bg-muted items-center justify-center overflow-hidden">
          <CircleUser size={60} className="text-muted-foreground" />
        </View>
        <Link href="/settings/account" asChild>
          <Pressable className="absolute bottom-0 right-0 rounded-full overflow-hidden">
            <BlurView intensity={50} tint="dark" className="p-2">
              <Pencil size={16} className="text-foreground" />
            </BlurView>
          </Pressable>
        </Link>
      </View>

      {/* Username */}
      <Text className="text-[28px] font-bold text-foreground mb-6">
        {displayName}
      </Text>
    </View>
  );
}

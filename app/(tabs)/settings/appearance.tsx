import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import List, { ListHeader } from "@/components/ui/list";
import { Muted } from "@/components/ui/typography";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { ThemeSettingItem } from "@/components/settings/ThemeItem";
import { LanguageSettingItem } from "@/components/settings/LanguageItem";

export default function AppearanceSettings() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-background">
      <SettingsPageHeader title={t("settings.appearance")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <List>
          <ListHeader>
            <Muted className="uppercase text-xs font-bold opacity-50">{t("settings.app")}</Muted>
          </ListHeader>

          <ThemeSettingItem />
          <LanguageSettingItem />
        </List>
      </ScrollView>
    </View>
  );
}

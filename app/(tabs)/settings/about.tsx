import { View, Linking, Platform } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import ListItem from "@/components/ui/list-item";
import { Text } from "@/components/ui/text";
import { Muted } from "@/components/ui/typography";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { BookOpen, Shield, Star, Send } from "@/lib/icons";

export default function AboutSettings() {
  const { t } = useTranslation();

  const openExternalURL = (url: string) => {
    if (Platform.OS === "web") {
      Linking.openURL(url);
    } else {
      WebBrowser.openBrowserAsync(url);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SettingsPageHeader title={t("settings.aboutMira")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View className="mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">{t("settings.about")}</Muted>
        </View>
        <View className="bg-muted/20 rounded-2xl overflow-hidden">
          <ListItem
            itemLeft={(props) => <Star {...props} />}
            label={t("settings.rateMira")}
            onPress={() => openExternalURL("https://github.com/yherrero/mira")}
            className="border-0 border-b border-border/30"
          />
          <ListItem
            itemLeft={(props) => <Send {...props} />}
            label={t("settings.sendFeedback")}
            onPress={() => openExternalURL("https://github.com/yherrero/mira/issues")}
            className="border-0 border-b border-border/30"
          />
          <ListItem
            itemLeft={(props) => <Shield {...props} />}
            label={t("settings.privacyPolicy")}
            onPress={() => openExternalURL("https://github.com/yherrero/mira")}
            className="border-0 border-b border-border/30"
          />
          <ListItem
            itemLeft={(props) => <BookOpen {...props} />}
            label={t("settings.termsOfService")}
            onPress={() => openExternalURL("https://github.com/yherrero/mira")}
            className="border-0"
          />
        </View>

        {/* Version */}
        <View className="py-8 items-center">
          <Text className="text-muted-foreground text-sm">
            {t("settings.version", { version: "1.0.0" })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

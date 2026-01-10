import { View, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { Muted } from "@/components/ui/typography";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { AudioPreferenceItem, SubtitlePreferenceItem } from "@/components/settings/StreamingPreferenceItem";
import { useStreamingPreferences } from "@/hooks/useStreamingPreferences";

export default function StreamingSettings() {
  const { t } = useTranslation();
  const { isLoading } = useStreamingPreferences();

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SettingsPageHeader title={t("settings.streamingSettings")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View className="mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">{t("settings.streamingPreferences")}</Muted>
        </View>
        <View className="bg-muted/20 rounded-2xl overflow-hidden">
          <AudioPreferenceItem className="border-0 border-b border-border/30" />
          <SubtitlePreferenceItem className="border-0" />
        </View>
      </ScrollView>
    </View>
  );
}

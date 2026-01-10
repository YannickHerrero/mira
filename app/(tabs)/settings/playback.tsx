import { View, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import ListItem from "@/components/ui/list-item";
import { Muted } from "@/components/ui/typography";
import { Switch } from "@/components/ui/switch";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { QualityFilterItem, LanguageFilterItem } from "@/components/settings/SourceFilterItem";
import { MonitorPlay } from "@/lib/icons";
import { useSettings } from "@/hooks/useSettings";
import { selectionChanged } from "@/lib/haptics";

export default function PlaybackSettings() {
  const { t } = useTranslation();
  const { useVlcPlayer, setUseVlcPlayer, isLoading } = useSettings();

  const handleVlcToggle = (checked: boolean) => {
    selectionChanged();
    setUseVlcPlayer(checked);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SettingsPageHeader title={t("settings.playbackSettings")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {/* Source Filters */}
        <View className="mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">{t("settings.sourceFilters")}</Muted>
        </View>
        <View className="bg-muted/20 rounded-2xl overflow-hidden">
          <QualityFilterItem className="border-0 border-b border-border/30" />
          <LanguageFilterItem className="border-0" />
        </View>

        {/* Playback Settings */}
        <View className="mb-3 mt-8">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">{t("settings.playback")}</Muted>
        </View>
        <View className="bg-muted/20 rounded-2xl overflow-hidden">
          <ListItem
            itemLeft={(props) => <MonitorPlay {...props} />}
            label={t("settings.playInVlc")}
            description={t("settings.playInVlcDesc")}
            detail={false}
            itemRight={() => (
              <Switch
                checked={useVlcPlayer}
                onCheckedChange={handleVlcToggle}
              />
            )}
            className="border-0"
          />
        </View>
      </ScrollView>
    </View>
  );
}

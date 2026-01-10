import { View, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import List, { ListHeader } from "@/components/ui/list";
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
        <List>
          {/* Source Filters */}
          <ListHeader>
            <Muted className="uppercase text-xs font-bold opacity-50">{t("settings.sourceFilters")}</Muted>
          </ListHeader>
          <QualityFilterItem />
          <LanguageFilterItem />

          {/* Playback Settings */}
          <ListHeader className="pt-8">
            <Muted className="uppercase text-xs font-bold opacity-50">{t("settings.playback")}</Muted>
          </ListHeader>
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
          />
        </List>
      </ScrollView>
    </View>
  );
}

import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import List, { ListHeader } from "@/components/ui/list";
import ListItem from "@/components/ui/list-item";
import { Muted } from "@/components/ui/typography";
import { SettingsProfileHeader } from "@/components/settings/SettingsProfileHeader";
import {
  CircleUser,
  Paintbrush,
  MonitorPlay,
  Volume2,
  Info
} from "@/lib/icons";

export default function SettingsIndex() {
  const { t } = useTranslation();

  return (
    <ScrollView
      className="flex-1 w-full bg-background"
      contentContainerStyle={{ paddingBottom: 96 }}
    >
      {/* Profile Header */}
      <SettingsProfileHeader />

      {/* Navigation Links */}
      <View className="px-4">
        <List>
          {/* My Profile Section */}
          <ListHeader>
            <Muted className="uppercase text-xs font-bold opacity-50">
              {t("settings.myProfile")}
            </Muted>
          </ListHeader>

          <ListItem
            itemLeft={(props) => <CircleUser {...props} />}
            label={t("settings.account")}
            href="/settings/account"
            className="bg-transparent border-0"
          />

          {/* Application Section */}
          <ListHeader className="pt-8">
            <Muted className="uppercase text-xs font-bold opacity-50">
              {t("settings.application")}
            </Muted>
          </ListHeader>

          <ListItem
            itemLeft={(props) => <Paintbrush {...props} />}
            label={t("settings.appearance")}
            href="/settings/appearance"
            className="bg-transparent border-0"
          />

          <ListItem
            itemLeft={(props) => <MonitorPlay {...props} />}
            label={t("settings.playbackSettings")}
            href="/settings/playback"
            className="bg-transparent border-0"
          />

          <ListItem
            itemLeft={(props) => <Volume2 {...props} />}
            label={t("settings.streamingSettings")}
            href="/settings/streaming"
            className="bg-transparent border-0"
          />

          <ListItem
            itemLeft={(props) => <Info {...props} />}
            label={t("settings.aboutMira")}
            href="/settings/about"
            className="bg-transparent border-0"
          />
        </List>
      </View>
    </ScrollView>
  );
}

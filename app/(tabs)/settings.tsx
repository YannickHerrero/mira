import * as React from "react";
import { View, Linking, Platform, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import List, { ListHeader } from "@/components/ui/list";
import ListItem from "@/components/ui/list-item";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { Muted } from "@/components/ui/typography";
import { BookOpen, Shield, Star, Send, MonitorPlay } from "@/lib/icons";
import { ThemeSettingItem } from "@/components/settings/ThemeItem";
import { LanguageSettingItem } from "@/components/settings/LanguageItem";
import { ApiKeyItem } from "@/components/settings/ApiKeyItem";
import { QualityFilterItem, LanguageFilterItem } from "@/components/settings/SourceFilterItem";
import { AudioPreferenceItem, SubtitlePreferenceItem } from "@/components/settings/StreamingPreferenceItem";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useSettings } from "@/hooks/useSettings";
import { useStreamingPreferences } from "@/hooks/useStreamingPreferences";
import { selectionChanged } from "@/lib/haptics";

export default function Settings() {
  const { t } = useTranslation();
  const {
    tmdbApiKey,
    realDebridApiKey,
    tmdbValid,
    realDebridValid,
    realDebridPremium,
    realDebridUsername,
    isLoading,
    isValidating,
    setTmdbKey,
    setRealDebridKey,
  } = useApiKeys();

  const { useVlcPlayer, setUseVlcPlayer, isLoading: isLoadingSettings } = useSettings();
  const { isLoading: isLoadingStreamingPrefs } = useStreamingPreferences();

  const handleVlcToggle = (checked: boolean) => {
    selectionChanged();
    setUseVlcPlayer(checked);
  };

  const openExternalURL = (url: string) => {
    if (Platform.OS === "web") {
      Linking.openURL(url);
    } else {
      WebBrowser.openBrowserAsync(url);
    }
  };

  if (isLoading || isLoadingSettings || isLoadingStreamingPrefs) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 w-full px-6 bg-background pt-4" contentContainerStyle={{ paddingBottom: 96 }}>
      <List>
        {/* API Keys Section */}
        <ListHeader>
          <Muted>{t("settings.apiConfiguration")}</Muted>
        </ListHeader>

        <ApiKeyItem
          label={t("settings.tmdb")}
          description={t("settings.tmdbDesc")}
          value={tmdbApiKey}
          isValid={tmdbValid}
          isValidating={isValidating}
          helpUrl="https://www.themoviedb.org/settings/api"
          helpLabel={t("settings.getTmdbKey")}
          onSave={setTmdbKey}
        />

        <ApiKeyItem
          label={t("settings.realDebrid")}
          description={t("settings.realDebridDesc")}
          value={realDebridApiKey}
          isValid={realDebridValid}
          isValidating={isValidating}
          helpUrl="https://real-debrid.com/apitoken"
          helpLabel={t("settings.getRealDebridKey")}
          extraInfo={
            realDebridUsername
              ? `${t("settings.loggedInAs", { username: realDebridUsername })}${realDebridPremium ? ` ${t("settings.premium")}` : ` ${t("settings.free")}`}`
              : undefined
          }
          onSave={setRealDebridKey}
        />

        {/* Source Filters */}
        <ListHeader className="pt-8">
          <Muted>{t("settings.sourceFilters")}</Muted>
        </ListHeader>
        <QualityFilterItem />
        <LanguageFilterItem />

        {/* Playback Settings */}
        <ListHeader className="pt-8">
          <Muted>{t("settings.playback")}</Muted>
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

        {/* Streaming Preferences */}
        <ListHeader className="pt-8">
          <Muted>{t("settings.streamingPreferences")}</Muted>
        </ListHeader>
        <AudioPreferenceItem />
        <SubtitlePreferenceItem />

        {/* App Settings */}
        <ListHeader className="pt-8">
          <Muted>{t("settings.app")}</Muted>
        </ListHeader>
        <ThemeSettingItem />
        <LanguageSettingItem />

        {/* About */}
        <ListHeader className="pt-8">
          <Muted>{t("settings.about")}</Muted>
        </ListHeader>
        <ListItem
          itemLeft={(props) => <Star {...props} />}
          label={t("settings.rateMira")}
          onPress={() => openExternalURL("https://github.com/yherrero/mira")}
        />
        <ListItem
          itemLeft={(props) => <Send {...props} />}
          label={t("settings.sendFeedback")}
          onPress={() => openExternalURL("https://github.com/yherrero/mira/issues")}
        />
        <ListItem
          itemLeft={(props) => <Shield {...props} />}
          label={t("settings.privacyPolicy")}
          onPress={() => openExternalURL("https://github.com/yherrero/mira")}
        />
        <ListItem
          itemLeft={(props) => <BookOpen {...props} />}
          label={t("settings.termsOfService")}
          onPress={() => openExternalURL("https://github.com/yherrero/mira")}
        />

        {/* Version */}
        <View className="py-8 items-center">
          <Text className="text-muted-foreground text-sm">{t("settings.version", { version: "1.0.0" })}</Text>
        </View>
      </List>
    </ScrollView>
  );
}

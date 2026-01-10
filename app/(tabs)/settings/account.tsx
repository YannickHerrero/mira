import { View, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { Muted } from "@/components/ui/typography";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { ApiKeyItem } from "@/components/settings/ApiKeyItem";
import { useApiKeys } from "@/hooks/useApiKeys";

export default function AccountSettings() {
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SettingsPageHeader title={t("settings.account")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View className="mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">{t("settings.apiConfiguration")}</Muted>
        </View>
        <View className="bg-muted/20 rounded-2xl overflow-hidden">
          <ApiKeyItem
            label={t("settings.tmdb")}
            description={t("settings.tmdbDesc")}
            value={tmdbApiKey}
            isValid={tmdbValid}
            isValidating={isValidating}
            helpUrl="https://www.themoviedb.org/settings/api"
            helpLabel={t("settings.getTmdbKey")}
            onSave={setTmdbKey}
            className="border-0 border-b border-border/30"
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
            className="border-0"
          />
        </View>
      </ScrollView>
    </View>
  );
}

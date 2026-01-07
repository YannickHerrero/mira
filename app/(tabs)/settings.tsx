import * as React from "react";
import { View, Linking, Platform, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import * as WebBrowser from "expo-web-browser";
import List, { ListHeader } from "@/components/ui/list";
import ListItem from "@/components/ui/list-item";
import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";
import { Muted } from "@/components/ui/typography";
import { BookOpen, Shield, Star, Send, MonitorPlay } from "@/lib/icons";
import { ThemeSettingItem } from "@/components/settings/ThemeItem";
import { ApiKeyItem } from "@/components/settings/ApiKeyItem";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useSettings } from "@/hooks/useSettings";
import { selectionChanged } from "@/lib/haptics";

export default function Settings() {
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

  if (isLoading || isLoadingSettings) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 w-full px-6 bg-background pt-4">
      <List>
        {/* API Keys Section */}
        <ListHeader>
          <Muted>API CONFIGURATION</Muted>
        </ListHeader>

        <ApiKeyItem
          label="TMDB"
          description="For movie and TV show metadata"
          value={tmdbApiKey}
          isValid={tmdbValid}
          isValidating={isValidating}
          helpUrl="https://www.themoviedb.org/settings/api"
          helpLabel="Get TMDB key"
          onSave={setTmdbKey}
        />

        <ApiKeyItem
          label="Real-Debrid"
          description="For streaming sources"
          value={realDebridApiKey}
          isValid={realDebridValid}
          isValidating={isValidating}
          helpUrl="https://real-debrid.com/apitoken"
          helpLabel="Get Real-Debrid key"
          extraInfo={
            realDebridUsername
              ? `Logged in as ${realDebridUsername}${realDebridPremium ? " (Premium)" : " (Free)"}`
              : undefined
          }
          onSave={setRealDebridKey}
        />

        {/* Playback Settings */}
        <ListHeader className="pt-8">
          <Muted>PLAYBACK</Muted>
        </ListHeader>
        <ListItem
          itemLeft={(props) => <MonitorPlay {...props} />}
          label="Play in VLC"
          description="Open videos in external VLC app (requires VLC installed)"
          detail={false}
          itemRight={() => (
            <Switch
              checked={useVlcPlayer}
              onCheckedChange={handleVlcToggle}
            />
          )}
        />

        {/* App Settings */}
        <ListHeader className="pt-8">
          <Muted>APP</Muted>
        </ListHeader>
        <ThemeSettingItem />

        {/* About */}
        <ListHeader className="pt-8">
          <Muted>ABOUT</Muted>
        </ListHeader>
        <ListItem
          itemLeft={(props) => <Star {...props} />}
          label="Rate Mira"
          onPress={() => openExternalURL("https://github.com/yherrero/mira")}
        />
        <ListItem
          itemLeft={(props) => <Send {...props} />}
          label="Send Feedback"
          onPress={() => openExternalURL("https://github.com/yherrero/mira/issues")}
        />
        <ListItem
          itemLeft={(props) => <Shield {...props} />}
          label="Privacy Policy"
          onPress={() => openExternalURL("https://github.com/yherrero/mira")}
        />
        <ListItem
          itemLeft={(props) => <BookOpen {...props} />}
          label="Terms of Service"
          onPress={() => openExternalURL("https://github.com/yherrero/mira")}
        />

        {/* Version */}
        <View className="py-8 items-center">
          <Text className="text-muted-foreground text-sm">Mira v1.0.0</Text>
        </View>
      </List>
    </ScrollView>
  );
}

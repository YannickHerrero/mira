import { ActivityIndicator, Alert, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import ListItem from "@/components/ui/list-item";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Muted } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Save } from "@/lib/icons";
import { processAniListSyncQueue } from "@/lib/anilist-sync";
import { useAniListStore } from "@/stores/anilist";
import { useSettingsStore } from "@/stores/settings";

export default function SynchronizationSettings() {
  const { t } = useTranslation();
  const { enableAnilistSync, setAnilistSyncEnabled, loadSettings } = useSettingsStore();
  const {
    accessToken,
    clientId,
    clientSecret,
    isLoading,
    loadState,
    setAccessToken,
    clearAccessToken,
    setClientId,
    setClientSecret,
  } = useAniListStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [clientIdInput, setClientIdInput] = useState(clientId ?? "");
  const [clientSecretInput, setClientSecretInput] = useState(clientSecret ?? "");

  useEffect(() => {
    loadState();
    loadSettings();
  }, [loadState, loadSettings]);

  useEffect(() => {
    setClientIdInput(clientId ?? "");
  }, [clientId]);

  useEffect(() => {
    setClientSecretInput(clientSecret ?? "");
  }, [clientSecret]);

  const storedClientId = clientId ?? "";
  const clientIdTrimmed = clientIdInput.trim();
  const clientIdDirty = clientIdTrimmed !== storedClientId;
  const clientIdSaved = !clientIdDirty && clientIdTrimmed.length > 0;

  const storedClientSecret = clientSecret ?? "";
  const clientSecretTrimmed = clientSecretInput.trim();
  const clientSecretDirty = clientSecretTrimmed !== storedClientSecret;
  const clientSecretSaved = !clientSecretDirty && clientSecretTrimmed.length > 0;

  const handleToggle = (value: boolean) => {
    setAnilistSyncEnabled(value);
  };

  const handleConnect = async () => {
    if (!clientId || !clientSecret) return;

    setAuthError(null);
    setIsConnecting(true);
    try {
      const redirectUri = Linking.createURL("anilist-auth");
      const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== "success" || !result.url) {
        const message = result.type === "cancel" ? t("settings.anilistAuthCancelled") : t("settings.anilistAuthFailed");
        setAuthError(message);
        return;
      }

      const url = new URL(result.url);
      const code = url.searchParams.get("code");

      if (!code) {
        setAuthError(t("settings.anilistAuthMissingCode"));
        return;
      }

      const tokenResponse = await fetch("https://anilist.co/api/v2/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`AniList token error: ${tokenResponse.status} ${errorText}`);
      }

      const tokenPayload = (await tokenResponse.json()) as { access_token?: string };

      if (!tokenPayload.access_token) {
        setAuthError(t("settings.anilistAuthMissingToken"));
        return;
      }

      await setAccessToken(tokenPayload.access_token);
      await processAniListSyncQueue();
      Alert.alert(t("settings.anilistConnected"), t("settings.anilistAuthSuccess"));
    } catch (error) {
      console.warn("[SynchronizationSettings] AniList auth failed", error);
      const message = error instanceof Error ? error.message : t("settings.anilistAuthFailed");
      setAuthError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await clearAccessToken();
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-base items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-base">
      <SettingsPageHeader title={t("settings.synchronization")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <View className="mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">
            {t("settings.synchronization")}
          </Muted>
        </View>
        <View className="bg-surface0/20 rounded-2xl overflow-hidden">
          <ListItem
            label={t("settings.enableAnilistSync")}
            description={t("settings.enableAnilistSyncDesc")}
            detail={false}
            itemRight={() => (
              <Switch
                checked={enableAnilistSync}
                onCheckedChange={handleToggle}
              />
            )}
            onPress={() => handleToggle(!enableAnilistSync)}
            className="border-0"
          />
        </View>

        <View className="mt-6 mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">
            {t("settings.anilist")}
          </Muted>
        </View>
          <View className="bg-surface0/20 rounded-2xl overflow-hidden p-4 gap-3">
            <View className="gap-1">
              <Text className="text-base font-semibold text-text">
                {t("settings.anilist")}
              </Text>
              <Muted>
                {accessToken ? t("settings.anilistConnected") : t("settings.anilistNotConnected")}
              </Muted>
              {!accessToken && authError && <Muted>{authError}</Muted>}
            </View>

            <View className="gap-2">
              <Muted>{t("settings.anilistClientId")}</Muted>
              <View className="flex-row items-center gap-2">
                <Input
                  value={clientIdInput}
                  onChangeText={setClientIdInput}
                  placeholder={t("settings.anilistClientIdPlaceholder")}
                  keyboardType="numeric"
                  editable={!accessToken}
                  className="flex-1"
                />
                {!accessToken && (
                  <Button
                    variant="outline"
                    onPress={() => setClientId(clientIdTrimmed)}
                    disabled={!clientIdDirty || !clientIdTrimmed}
                    className="h-10 w-10 native:h-12 native:w-12"
                  >
                    {clientIdSaved ? (
                      <Check size={18} className="text-text" />
                    ) : (
                      <Save size={18} className="text-text" />
                    )}
                  </Button>
                )}
              </View>
            </View>

            <View className="gap-2">
              <Muted>{t("settings.anilistClientSecret")}</Muted>
              <View className="flex-row items-center gap-2">
                <Input
                  value={clientSecretInput}
                  onChangeText={setClientSecretInput}
                  placeholder={t("settings.anilistClientSecretPlaceholder")}
                  secureTextEntry
                  multiline={false}
                  numberOfLines={1}
                  textAlign="left"
                  textAlignVertical="center"
                  lineBreakModeIOS="clip"
                  lineBreakStrategyIOS="none"
                  textBreakStrategy="simple"
                  scrollEnabled
                  editable={!accessToken}
                  className="flex-1 overflow-hidden"
                />
                {!accessToken && (
                  <Button
                    variant="outline"
                    onPress={() => setClientSecret(clientSecretTrimmed)}
                    disabled={!clientSecretDirty || !clientSecretTrimmed}
                    className="h-10 w-10 native:h-12 native:w-12"
                  >
                    {clientSecretSaved ? (
                      <Check size={18} className="text-text" />
                    ) : (
                      <Save size={18} className="text-text" />
                    )}
                  </Button>
                )}
              </View>
            </View>

            {accessToken ? (
              <Button
                onPress={handleDisconnect}
                disabled={!enableAnilistSync}
              >
                <Text>{t("settings.disconnect")}</Text>
              </Button>
            ) : (
              <Button
                onPress={handleConnect}
                disabled={!enableAnilistSync || !clientId || !clientSecret || isConnecting}
              >
                <Text>
                  {isConnecting ? t("settings.connecting") : t("settings.connectAnilist")}
                </Text>
              </Button>
            )}
          </View>

      </ScrollView>
    </View>
  );
}

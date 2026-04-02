import { ActivityIndicator, Alert, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import ListItem from "@/components/ui/list-item";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Muted } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCloudSyncStore } from "@/stores/cloud-sync";

export default function CloudSyncSettings() {
  const { t } = useTranslation();
  const { signIn, signOut } = useAuthActions();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  const {
    syncEnabled,
    email: storedEmail,
    isSyncing,
    lastSyncAt,
    syncError,
    setSyncEnabled,
    setEmail: setStoredEmail,
  } = useCloudSyncStore();

  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSendCode = async () => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    if (!trimmedEmail) return;

    setAuthError(null);
    setIsSendingCode(true);
    try {
      await signIn("resend-otp", { email: trimmedEmail });
      setStep("code");
      Alert.alert(t("cloudSync.codeSent"), t("cloudSync.codeSentDesc"));
    } catch (error) {
      console.warn("[CloudSync] Failed to send code:", error);
      setAuthError(
        error instanceof Error ? error.message : t("cloudSync.loginFailed")
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmedCode = codeInput.trim();
    if (!trimmedCode) return;

    setAuthError(null);
    setIsVerifying(true);
    try {
      await signIn("resend-otp", {
        email: emailInput.trim().toLowerCase(),
        code: trimmedCode,
      });
      setStoredEmail(emailInput.trim().toLowerCase());
      setStep("email");
      setEmailInput("");
      setCodeInput("");
    } catch (error) {
      console.warn("[CloudSync] Failed to verify code:", error);
      setAuthError(
        error instanceof Error ? error.message : t("cloudSync.invalidCode")
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t("cloudSync.logoutConfirmTitle"),
      t("cloudSync.logoutConfirmDesc"),
      [
        { text: t("settings.cancel"), style: "cancel" },
        {
          text: t("cloudSync.logout"),
          style: "destructive",
          onPress: async () => {
            await signOut();
            setStoredEmail(null);
            setStep("email");
          },
        },
      ]
    );
  };

  const formatLastSynced = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString();
  };

  if (isAuthLoading) {
    return (
      <View className="flex-1 bg-base items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-base">
      <SettingsPageHeader title={t("cloudSync.title")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {/* Sync Toggle */}
        <View className="mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">
            {t("cloudSync.title")}
          </Muted>
        </View>
        <View className="bg-surface0/20 rounded-2xl overflow-hidden">
          <ListItem
            label={t("cloudSync.enable")}
            description={t("cloudSync.enableDesc")}
            detail={false}
            itemRight={() => (
              <Switch
                checked={syncEnabled}
                onCheckedChange={setSyncEnabled}
              />
            )}
            onPress={() => setSyncEnabled(!syncEnabled)}
            className="border-0"
          />
        </View>

        {/* Account Section */}
        <View className="mt-6 mb-3">
          <Muted className="uppercase text-xs font-bold opacity-50 px-1">
            {t("cloudSync.account")}
          </Muted>
        </View>
        <View className="bg-surface0/20 rounded-2xl overflow-hidden p-4 gap-3">
          {isAuthenticated ? (
            <>
              <View className="gap-1">
                <Text className="text-base font-semibold text-text">
                  {t("cloudSync.loggedInAs", { email: storedEmail })}
                </Text>
              </View>
              <Button
                variant="outline"
                onPress={handleLogout}
                className="mt-2"
              >
                <Text className="text-red">{t("cloudSync.logout")}</Text>
              </Button>
            </>
          ) : (
            <>
              {step === "email" ? (
                <>
                  <View className="gap-2">
                    <Muted>{t("cloudSync.email")}</Muted>
                    <Input
                      value={emailInput}
                      onChangeText={setEmailInput}
                      placeholder={t("cloudSync.emailPlaceholder")}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {authError && (
                    <Muted className="text-red">{authError}</Muted>
                  )}
                  <Button
                    onPress={handleSendCode}
                    disabled={!emailInput.trim() || isSendingCode}
                  >
                    <Text className="text-base font-semibold">
                      {isSendingCode
                        ? t("cloudSync.sendingCode")
                        : t("cloudSync.sendCode")}
                    </Text>
                  </Button>
                </>
              ) : (
                <>
                  <View className="gap-1">
                    <Muted>
                      {t("cloudSync.codeSentDesc")}
                    </Muted>
                    <Muted className="font-semibold">{emailInput}</Muted>
                  </View>
                  <View className="gap-2">
                    <Muted>{t("cloudSync.verificationCode")}</Muted>
                    <Input
                      value={codeInput}
                      onChangeText={setCodeInput}
                      placeholder={t("cloudSync.codePlaceholder")}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                  {authError && (
                    <Muted className="text-red">{authError}</Muted>
                  )}
                  <Button
                    onPress={handleVerifyCode}
                    disabled={codeInput.trim().length !== 6 || isVerifying}
                  >
                    <Text className="text-base font-semibold">
                      {isVerifying
                        ? t("cloudSync.verifying")
                        : t("cloudSync.verify")}
                    </Text>
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => {
                      setStep("email");
                      setCodeInput("");
                      setAuthError(null);
                    }}
                  >
                    <Text>{t("settings.cancel")}</Text>
                  </Button>
                </>
              )}
            </>
          )}
        </View>

        {/* Sync Status */}
        {isAuthenticated && (
          <>
            <View className="mt-6 mb-3">
              <Muted className="uppercase text-xs font-bold opacity-50 px-1">
                {t("cloudSync.syncStatus")}
              </Muted>
            </View>
            <View className="bg-surface0/20 rounded-2xl overflow-hidden p-4 gap-2">
              <View className="flex-row items-center gap-2">
                <View
                  className={`w-2 h-2 rounded-full ${
                    isSyncing
                      ? "bg-yellow"
                      : syncError
                        ? "bg-red"
                        : "bg-green"
                  }`}
                />
                <Text className="text-text">
                  {isSyncing
                    ? t("cloudSync.syncing")
                    : syncError
                      ? t("cloudSync.syncError", { error: syncError })
                      : t("cloudSync.idle")}
                </Text>
              </View>
              <Muted>
                {lastSyncAt
                  ? t("cloudSync.lastSynced", {
                      time: formatLastSynced(lastSyncAt),
                    })
                  : t("cloudSync.neverSynced")}
              </Muted>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

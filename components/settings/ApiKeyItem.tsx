import * as React from "react";
import { View, Pressable, Linking, Platform, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, CheckCircle, XCircle, ExternalLink } from "@/lib/icons";
import * as WebBrowser from "expo-web-browser";
import { cn } from "@/lib/utils";

interface ApiKeyItemProps {
  label: string;
  description?: string;
  value: string | null;
  isValid: boolean | null;
  isValidating?: boolean;
  helpUrl?: string;
  helpLabel?: string;
  extraInfo?: string;
  onSave: (key: string) => Promise<boolean | { valid: boolean }>;
  className?: string;
}

export function ApiKeyItem({
  label,
  description,
  value,
  isValid,
  isValidating,
  helpUrl,
  helpLabel,
  extraInfo,
  onSave,
  className,
}: ApiKeyItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const openHelpUrl = () => {
    if (!helpUrl) return;
    if (Platform.OS === "web") {
      Linking.openURL(helpUrl);
    } else {
      WebBrowser.openBrowserAsync(helpUrl);
    }
  };

  const handleSave = async () => {
    if (!inputValue.trim()) {
      setSaveError("Please enter an API key");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await onSave(inputValue.trim());
      const valid = typeof result === "boolean" ? result : result.valid;

      if (valid) {
        setIsEditing(false);
        setInputValue("");
      } else {
        setSaveError("Invalid API key");
      }
    } catch {
      setSaveError("Failed to validate key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue("");
    setSaveError(null);
  };

  return (
    <View className={cn("py-4 border-b border-border", className)}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-8 h-8 rounded-full bg-muted items-center justify-center">
            <Key size={16} className="text-muted-foreground" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground">{label}</Text>
            {description && (
              <Text className="text-sm text-muted-foreground">{description}</Text>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {isValidating ? (
            <ActivityIndicator size="small" />
          ) : isValid === true ? (
            <CheckCircle size={20} className="text-green-500" />
          ) : isValid === false ? (
            <XCircle size={20} className="text-destructive" />
          ) : (
            <View className="w-5 h-5 rounded-full bg-muted" />
          )}
        </View>
      </View>

      {/* Extra info (like username for Real-Debrid) */}
      {extraInfo && isValid && (
        <Text className="text-sm text-muted-foreground mt-1 ml-11">
          {extraInfo}
        </Text>
      )}

      {/* Edit/Add button */}
      {!isEditing && (
        <View className="mt-3 ml-11 flex-row gap-2">
          <Pressable
            onPress={() => setIsEditing(true)}
            className="bg-secondary px-3 py-1.5 rounded-md"
          >
            <Text className="text-sm text-secondary-foreground">
              {value ? "Change" : "Add"} API Key
            </Text>
          </Pressable>

          {helpUrl && (
            <Pressable
              onPress={openHelpUrl}
              className="flex-row items-center gap-1 px-3 py-1.5"
            >
              <Text className="text-sm text-primary">{helpLabel || "Get key"}</Text>
              <ExternalLink size={14} className="text-primary" />
            </Pressable>
          )}
        </View>
      )}

      {/* Edit form */}
      {isEditing && (
        <View className="mt-3 ml-11">
          <Input
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Enter API key"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            className="mb-2"
          />

          {saveError && (
            <Text className="text-sm text-destructive mb-2">{saveError}</Text>
          )}

          <View className="flex-row gap-2">
            <Button
              variant="default"
              size="sm"
              onPress={handleSave}
              disabled={isSaving}
              className="flex-row items-center"
            >
              <Text className="text-primary-foreground text-sm">
                {isSaving ? "Validating..." : "Save"}
              </Text>
            </Button>
            <Button variant="outline" size="sm" onPress={handleCancel}>
              <Text className="text-sm">Cancel</Text>
            </Button>
          </View>

          {helpUrl && (
            <Pressable
              onPress={openHelpUrl}
              className="flex-row items-center gap-1 mt-2"
            >
              <Text className="text-sm text-primary">{helpLabel || "Get API key"}</Text>
              <ExternalLink size={14} className="text-primary" />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

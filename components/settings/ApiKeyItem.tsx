import * as React from "react";
import { View, Pressable, Linking, Platform, ActivityIndicator } from "react-native";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetView,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ListItem from "@/components/ui/list-item";
import { Key, CheckCircle, XCircle, ExternalLink } from "@/lib/icons";
import * as WebBrowser from "expo-web-browser";

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
  const { dismiss } = useBottomSheetModal();
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
        setInputValue("");
        dismiss();
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
    setInputValue("");
    setSaveError(null);
    dismiss();
  };

  // Status icon for the list item
  const StatusIcon = () => {
    if (isValidating) {
      return <ActivityIndicator size="small" />;
    }
    if (isValid === true) {
      return <CheckCircle size={20} className="text-green-500" />;
    }
    if (isValid === false) {
      return <XCircle size={20} className="text-destructive" />;
    }
    return <View className="w-5 h-5 rounded-full bg-muted" />;
  };

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <ListItem
          itemLeft={(props) => <Key {...props} />}
          label={label}
          description={description}
          itemRight={() => <StatusIcon />}
          detail={false}
          className={className}
        />
      </BottomSheetOpenTrigger>
      <BottomSheetContent>
        <BottomSheetHeader>
          <View className="flex-1 gap-1">
            <Text className="text-foreground text-xl font-bold">
              {label}
            </Text>
            {description && (
              <Text className="text-muted-foreground text-sm">
                {description}
              </Text>
            )}
          </View>
        </BottomSheetHeader>
        <BottomSheetView className="gap-4">
          {/* Extra info (like username for Real-Debrid) */}
          {extraInfo && isValid && (
            <View className="mb-4 p-3 bg-muted/30 rounded-lg">
              <Text className="text-muted-foreground text-sm">
                {extraInfo}
              </Text>
            </View>
          )}

          {/* Input field */}
          <Input
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={value ? "Enter new API key" : "Enter API key"}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            className="mb-2"
          />

          {saveError && (
            <Text className="text-sm text-destructive mb-2">{saveError}</Text>
          )}

          {/* Action buttons */}
          <View className="flex-row gap-3">
            <Button
              variant="default"
              onPress={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              <Text className="text-primary-foreground font-medium">
                {isSaving ? "Validating..." : value ? "Update" : "Save"}
              </Text>
            </Button>
            <Button variant="outline" onPress={handleCancel} className="flex-1">
              <Text className="font-medium">Cancel</Text>
            </Button>
          </View>

          {/* Help link */}
          {helpUrl && (
            <Pressable
              onPress={openHelpUrl}
              className="flex-row items-center justify-center gap-1 py-2"
            >
              <Text className="text-sm text-primary">{helpLabel || "Get API key"}</Text>
              <ExternalLink size={14} className="text-primary" />
            </Pressable>
          )}
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
}

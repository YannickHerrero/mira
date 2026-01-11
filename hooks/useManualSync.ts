import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { applyManualSyncPayload, buildManualSyncPayload } from "@/lib/manual-sync";
import { useDatabase } from "@/db/provider";

const DEFAULT_EXPORT_NAME = "mira-sync.json";

export function useManualSync() {
  const { db } = useDatabase();
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportData = useCallback(async () => {
    if (!db || isExporting) return;
    setIsExporting(true);

    try {
      const payload = await buildManualSyncPayload(db);
      const json = JSON.stringify(payload, null, 2);

      if (Platform.OS === "web") {
        const webScope = globalThis as any;
        const blob = new webScope.Blob([json], { type: "application/json" });
        const url = webScope.URL.createObjectURL(blob);
        const link = webScope.document.createElement("a");
        link.href = url;
        link.download = DEFAULT_EXPORT_NAME;
        link.click();
        webScope.URL.revokeObjectURL(url);
        Alert.alert(t("settings.exportComplete"), t("settings.exportCompleteDesc"));
        return;
      }

      if (!FileSystem.documentDirectory) {
        throw new Error("Storage unavailable");
      }

      const fileUri = `${FileSystem.documentDirectory}${DEFAULT_EXPORT_NAME}`;
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t("settings.exportFailed"), t("settings.exportFailedDesc"));
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: t("settings.exportData"),
      });
    } catch (error) {
      console.error("[ManualSync] Export failed:", error);
      Alert.alert(t("settings.exportFailed"), t("settings.exportFailedDesc"));
    } finally {
      setIsExporting(false);
    }
  }, [db, isExporting]);

  const importData = useCallback(async () => {
    if (!db || isImporting) return;
    setIsImporting(true);

    try {
      let content: string | null = null;

      if (Platform.OS === "web") {
        content = await pickWebFile();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          type: "application/json",
        });

        if (result.canceled) {
          return;
        }

        const asset = result.assets?.[0];
        if (!asset?.uri) {
          throw new Error("No file selected");
        }

        content = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      if (!content) {
        return;
      }

      const payload = JSON.parse(content);
      await applyManualSyncPayload(db, payload);
      Alert.alert(t("settings.importComplete"), t("settings.importCompleteDesc"));
    } catch (error) {
      console.error("[ManualSync] Import failed:", error);
      Alert.alert(t("settings.importFailed"), t("settings.importFailedDesc"));
    } finally {
      setIsImporting(false);
    }
  }, [db, isImporting]);

  return {
    exportData,
    importData,
    isExporting,
    isImporting,
  };
}

function pickWebFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const webScope = globalThis as any;
    const input = webScope.document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new webScope.FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };

    input.click();
  });
}

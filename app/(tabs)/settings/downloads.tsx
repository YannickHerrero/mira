import { View, ActivityIndicator, Pressable, Alert, Image } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { P, Muted } from "@/components/ui/typography";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { useDownloads } from "@/hooks/useDownloads";
import { formatBytes, type DownloadItem } from "@/stores/downloads";
import { type DownloadStatus } from "@/lib/download-manager";
import { getPosterUrl } from "@/lib/types";
import { Trash, RefreshCw, Clock, Download, CheckCircle, XCircle, Loader, AlertCircle } from "@/lib/icons";
import { cn } from "@/lib/utils";

function getStatusIcon(status: DownloadStatus) {
  switch (status) {
    case "pending":
      return Clock;
    case "caching":
    case "downloading":
      return Loader;
    case "completed":
      return CheckCircle;
    case "failed":
    case "paused":
      return XCircle;
    case "unplayable":
      return AlertCircle;
    default:
      return Download;
  }
}

function getStatusColor(status: DownloadStatus): string {
  switch (status) {
    case "pending":
      return "text-yellow";
    case "caching":
    case "downloading":
      return "text-blue";
    case "completed":
      return "text-green";
    case "failed":
    case "paused":
      return "text-red";
    case "unplayable":
      return "text-peach";
    default:
      return "text-subtext0";
  }
}

function getStatusText(status: DownloadStatus, t: (key: string, options?: Record<string, unknown>) => string, failureReason?: string): string {
  switch (status) {
    case "pending":
      return t("downloads.statusPending");
    case "caching":
      return t("downloads.statusCaching");
    case "downloading":
      return t("downloads.statusDownloading");
    case "completed":
      return t("downloads.statusCompleted");
    case "failed":
      return t("downloads.statusFailed");
    case "paused":
      return t("downloads.statusPaused");
    case "unplayable":
      return failureReason 
        ? t("downloads.statusUnplayableFormat", { format: failureReason.toUpperCase() })
        : t("downloads.statusUnplayable");
    default:
      return status;
  }
}

export default function DownloadsSettings() {
  const { t } = useTranslation();
  const { downloads, isInitialized, cancelDownload, deleteDownload, retryDownload } = useDownloads();

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      t("downloads.deleteTitle"),
      t("downloads.deleteConfirm", { title }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            const download = downloads.find((d) => d.id === id);
            if (download?.status === "downloading" || download?.status === "pending" || download?.status === "caching") {
              cancelDownload(id);
            } else {
              deleteDownload(id);
            }
          },
        },
      ]
    );
  };

  const handleRetry = (id: string) => {
    retryDownload(id);
  };

  if (!isInitialized) {
    return (
      <View className="flex-1 bg-base items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Sort downloads: active first, then pending, then failed/unplayable, then completed
  const sortedDownloads = [...downloads].sort((a, b) => {
    const statusOrder: Record<DownloadStatus, number> = {
      downloading: 0,
      caching: 1,
      pending: 2,
      failed: 3,
      unplayable: 4,
      paused: 5,
      completed: 6,
    };
    return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
  });

  const activeDownloads = sortedDownloads.filter(
    (d) => d.status === "downloading" || d.status === "caching" || d.status === "pending"
  );
  const failedDownloads = sortedDownloads.filter(
    (d) => d.status === "failed" || d.status === "paused" || d.status === "unplayable"
  );
  const completedDownloads = sortedDownloads.filter((d) => d.status === "completed");

  return (
    <View className="flex-1 bg-base">
      <SettingsPageHeader title={t("downloads.title")} />

      <ScrollView
        className="flex-1 w-full px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {downloads.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Download size={48} className="text-subtext0 opacity-50 mb-4" />
            <P className="text-subtext0 text-center">{t("downloads.empty")}</P>
            <Muted className="text-center mt-2">{t("downloads.emptyDesc")}</Muted>
          </View>
        ) : (
          <>
            {/* Active/Pending Downloads */}
            {activeDownloads.length > 0 && (
              <View className="mb-6">
                <View className="mb-3">
                  <Muted className="uppercase text-xs font-bold opacity-50 px-1">
                    {t("downloads.queue")} ({activeDownloads.length})
                  </Muted>
                </View>
                <View className="bg-surface0/20 rounded-2xl overflow-hidden">
                  {activeDownloads.map((download, index) => (
                    <DownloadItemRow
                      key={download.id}
                      download={download}
                      onDelete={() => handleDelete(download.id, download.title)}
                      onRetry={() => handleRetry(download.id)}
                      isLast={index === activeDownloads.length - 1}
                      t={t}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Failed Downloads */}
            {failedDownloads.length > 0 && (
              <View className="mb-6">
                <View className="mb-3">
                  <Muted className="uppercase text-xs font-bold opacity-50 px-1">
                    {t("downloads.failed")} ({failedDownloads.length})
                  </Muted>
                </View>
                <View className="bg-surface0/20 rounded-2xl overflow-hidden">
                  {failedDownloads.map((download, index) => (
                    <DownloadItemRow
                      key={download.id}
                      download={download}
                      onDelete={() => handleDelete(download.id, download.title)}
                      onRetry={() => handleRetry(download.id)}
                      isLast={index === failedDownloads.length - 1}
                      t={t}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Completed Downloads */}
            {completedDownloads.length > 0 && (
              <View className="mb-6">
                <View className="mb-3">
                  <Muted className="uppercase text-xs font-bold opacity-50 px-1">
                    {t("downloads.completed")} ({completedDownloads.length})
                  </Muted>
                </View>
                <View className="bg-surface0/20 rounded-2xl overflow-hidden">
                  {completedDownloads.map((download, index) => (
                    <DownloadItemRow
                      key={download.id}
                      download={download}
                      onDelete={() => handleDelete(download.id, download.title)}
                      onRetry={() => handleRetry(download.id)}
                      isLast={index === completedDownloads.length - 1}
                      t={t}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface DownloadItemRowProps {
  download: DownloadItem;
  onDelete: () => void;
  onRetry: () => void;
  isLast: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function DownloadItemRow({ download, onDelete, onRetry, isLast, t }: DownloadItemRowProps) {
  const StatusIcon = getStatusIcon(download.status);
  const statusColor = getStatusColor(download.status);
  // Don't allow retry for unplayable files - they'll never work
  const canRetry = download.status === "failed" || download.status === "paused";
  const isActive = download.status === "downloading" || download.status === "caching";

  // Format episode info if available
  const episodeInfo = download.seasonNumber && download.episodeNumber
    ? `S${download.seasonNumber} E${download.episodeNumber}`
    : null;

  return (
    <View
      className={cn(
        "flex-row items-center p-3 gap-3",
        !isLast && "border-b border-surface1/30"
      )}
    >
      {/* Poster */}
      <View className="w-12 h-16 rounded-lg overflow-hidden bg-surface1">
        {download.posterPath ? (
          <Image
            source={{ uri: getPosterUrl(download.posterPath, "small") }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Download size={20} className="text-subtext0" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 min-w-0">
        <P className="font-medium" numberOfLines={1}>
          {download.title}
        </P>
        <View className="flex-row items-center gap-2 mt-1">
          {episodeInfo && (
            <Muted className="text-xs">{episodeInfo}</Muted>
          )}
          {download.quality && (
            <View className="bg-surface1/50 px-1.5 py-0.5 rounded">
              <Muted className="text-xs">{download.quality}</Muted>
            </View>
          )}
          {download.fileSize && download.fileSize > 0 && (
            <Muted className="text-xs">{formatBytes(download.fileSize)}</Muted>
          )}
        </View>
        
        {/* Status */}
        <View className="flex-row items-center gap-1.5 mt-1.5">
          <StatusIcon size={14} className={cn(statusColor, isActive && "animate-spin")} />
          <Muted className={cn("text-xs", statusColor)}>
            {getStatusText(download.status, t, download.failureReason)}
            {isActive && download.progress > 0 && ` (${Math.round(download.progress)}%)`}
          </Muted>
        </View>

        {/* Progress bar for active downloads */}
        {isActive && (
          <View className="h-1 bg-surface1 rounded-full mt-2 overflow-hidden">
            <View
              className="h-full bg-blue rounded-full"
              style={{ width: `${download.progress}%` }}
            />
          </View>
        )}
      </View>

      {/* Actions */}
      <View className="flex-row items-center gap-1">
        {canRetry && (
          <Pressable
            onPress={onRetry}
            className="p-2 rounded-full active:bg-surface1"
          >
            <RefreshCw size={20} className="text-blue" />
          </Pressable>
        )}
        <Pressable
          onPress={onDelete}
          className="p-2 rounded-full active:bg-surface1"
        >
          <Trash size={20} className="text-red" />
        </Pressable>
      </View>
    </View>
  );
}

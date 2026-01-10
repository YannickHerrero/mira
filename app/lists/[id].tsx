import * as React from "react";
import { View, Pressable, Alert } from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { MediaGrid } from "@/components/media";
import {
  BottomSheet,
  BottomSheetActionRow,
  BottomSheetContent,
  BottomSheetView,
  BottomSheetHeader,
  BottomSheetTextInput,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { useLists, useListItems, useListActions } from "@/hooks/useLists";
import { List, Trash, Pencil, MoreVertical } from "@/lib/icons";
import { mediumImpact } from "@/lib/haptics";
import type { Media, MediaType } from "@/lib/types";

// Convert database record to Media type for MediaCard
function dbRecordToMedia(record: any): Media {
  return {
    id: record.tmdbId,
    mediaType: record.mediaType as MediaType,
    title: record.title,
    titleOriginal: record.titleOriginal,
    year: record.year,
    score: record.score,
    posterPath: record.posterPath,
    backdropPath: record.backdropPath,
    description: record.description,
    genres: record.genres ? JSON.parse(record.genres) : [],
    seasonCount: record.seasonCount,
    episodeCount: record.episodeCount,
  };
}

interface ListActionsSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  listName: string;
  isDefault: boolean;
  onRename: () => void;
  onDelete: () => void;
}

function ListActionsSheet({
  sheetRef,
  listName,
  isDefault,
  onRename,
  onDelete,
}: ListActionsSheetProps) {
  const { dismiss } = useBottomSheetModal();
  const { t } = useTranslation();

  return (
    <BottomSheetContent ref={sheetRef}>
      <BottomSheetView className="pb-8 gap-4">
        <Text className="text-lg font-semibold text-foreground">
          {listName}
        </Text>

        <BottomSheetActionRow
          title={t("list.rename")}
          icon={<Pencil size={20} className="text-foreground" />}
          onPress={() => {
            dismiss();
            onRename();
          }}
        />

        {!isDefault && (
          <BottomSheetActionRow
            title={t("list.delete")}
            icon={<Trash size={20} className="text-destructive" />}
            variant="destructive"
            onPress={() => {
              dismiss();
              onDelete();
            }}
          />
        )}
      </BottomSheetView>
    </BottomSheetContent>
  );
}

interface RenameSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  currentName: string;
  onSave: (newName: string) => void;
}

function RenameSheet({ sheetRef, currentName, onSave }: RenameSheetProps) {
  const { dismiss } = useBottomSheetModal();
  const { t } = useTranslation();
  const [name, setName] = React.useState(currentName);

  React.useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      dismiss();
    }
  };

  return (
    <BottomSheetContent ref={sheetRef}>
      <BottomSheetHeader>
        <Text className="text-lg font-semibold text-foreground py-4">
          {t("list.renameList")}
        </Text>
      </BottomSheetHeader>
      <BottomSheetView className="pb-6 gap-4">
        <BottomSheetTextInput
          placeholder={t("list.listName")}
          value={name}
          onChangeText={setName}
          autoFocus
          onSubmitEditing={handleSave}
          returnKeyType="done"
        />
        <View className="flex-row gap-3 mt-4">
          <Button variant="outline" className="flex-1" onPress={() => dismiss()}>
            <Text>{t("common.cancel")}</Text>
          </Button>
          <Button
            className="flex-1"
            onPress={handleSave}
            disabled={!name.trim() || name.trim() === currentName}
          >
            <Text className="text-primary-foreground font-semibold">{t("common.save")}</Text>
          </Button>
        </View>
      </BottomSheetView>
    </BottomSheetContent>
  );
}

export default function ListDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, refetch: refetchLists } = useLists();
  const { items, isLoading, refetch } = useListItems(id ?? null);
  const { renameList, deleteList, removeFromList } = useListActions();

  const [refreshing, setRefreshing] = React.useState(false);
  const actionsSheetRef = React.useRef<BottomSheetModal>(null);
  const renameSheetRef = React.useRef<BottomSheetModal>(null);

  // Find the current list
  const currentList = lists.find((l) => l.id === id);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleOpenActions = () => {
    mediumImpact();
    actionsSheetRef.current?.present();
  };

  const handleRename = () => {
    renameSheetRef.current?.present();
  };

  const handleSaveRename = async (newName: string) => {
    if (!id) return;
    await renameList(id, newName);
    refetchLists();
  };

  const handleDelete = () => {
    if (!currentList || currentList.isDefault) return;

    Alert.alert(
      t("list.deleteTitle"),
      t("list.deleteConfirm", { name: currentList.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteList(id!);
            refetchLists();
            router.back();
          },
        },
      ]
    );
  };

  if (!currentList) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Stack.Screen options={{ title: t("library.lists") }} />
        <Text className="text-muted-foreground">{t("list.notFound")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: currentList.name,
          headerRight: () => (
            <Pressable onPress={handleOpenActions} className="p-2">
              <MoreVertical size={24} className="text-foreground" />
            </Pressable>
          ),
        }}
      />

      <MediaGrid
        data={items.map((item) => dbRecordToMedia(item.media))}
        isLoading={isLoading}
        emptyMessage={t("library.listEmpty")}
        emptyIcon={<List size={48} className="text-muted-foreground" />}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
      />

      {/* Actions Sheet */}
      <BottomSheet>
        <ListActionsSheet
          sheetRef={actionsSheetRef}
          listName={currentList.name}
          isDefault={currentList.isDefault ?? false}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </BottomSheet>

      {/* Rename Sheet */}
      <BottomSheet>
        <RenameSheet
          sheetRef={renameSheetRef}
          currentName={currentList.name}
          onSave={handleSaveRename}
        />
      </BottomSheet>
    </View>
  );
}

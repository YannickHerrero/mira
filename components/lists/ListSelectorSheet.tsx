import * as React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import {
  BottomSheetContent,
  BottomSheetView,
  BottomSheetHeader,
  BottomSheetTextInput,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Text } from "@/components/ui/text";
import { Checkbox } from "@/components/ui/checkbox";
import { TextButton } from "@/components/ui/text-button";
import { Check, Plus } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ListWithCount } from "@/hooks/useLists";
import { useListActions } from "@/hooks/useLists";
import type { Media } from "@/lib/types";
import { selectionChanged, lightImpact } from "@/lib/haptics";

interface ListSelectorSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  media: Media | null;
  lists: ListWithCount[];
  listIds: string[];
  isLoadingLists: boolean;
  isLoadingMediaLists: boolean;
  refetchLists: () => Promise<void>;
  refetchMediaLists: () => Promise<void>;
  imdbId?: string;
  onComplete?: () => void;
}

export function ListSelectorSheet({
  sheetRef,
  media,
  lists,
  listIds,
  isLoadingLists,
  isLoadingMediaLists,
  refetchLists,
  refetchMediaLists,
  imdbId,
  onComplete,
}: ListSelectorSheetProps) {
  const { dismiss } = useBottomSheetModal();
  const { t } = useTranslation();
  const { createList, updateMediaLists, ensureDefaultList } = useListActions();

  const [selectedListIds, setSelectedListIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [isCreatingList, setIsCreatingList] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Calculate snap points based on content:
  // - Base height: ~280px for header + action buttons + create button
  // - Per list item: ~72px
  // - Create form adds ~140px extra
  // Using percentages for better responsiveness across devices
  const snapPoints = React.useMemo(() => {
    const basePercent = 35; // Minimum for header + buttons + create button
    const perListPercent = 8; // Each list item adds roughly this much
    const createFormPercent = 12; // Extra space when create form is visible
    
    const listCount = Math.min(lists.length, 5); // Cap at 5 to avoid too tall sheets
    let percent = basePercent + listCount * perListPercent;
    
    if (isCreatingList) {
      percent += createFormPercent;
    }
    
    // Clamp between 35% and 70%
    percent = Math.min(Math.max(percent, 35), 70);
    
    return [`${percent}%`];
  }, [lists.length, isCreatingList]);

  // Sync selected lists when media lists load
  React.useEffect(() => {
    setSelectedListIds(new Set(listIds));
  }, [listIds]);

  // Ensure default list exists when sheet opens
  React.useEffect(() => {
    if (media) {
      ensureDefaultList().then(() => {
        refetchLists();
      });
    }
  }, [media, ensureDefaultList, refetchLists]);

  const handleToggleList = (listId: string) => {
    selectionChanged();
    setSelectedListIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(listId)) {
        newSet.delete(listId);
      } else {
        newSet.add(listId);
      }
      return newSet;
    });
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    lightImpact();
    const newListId = await createList(newListName.trim());
    if (newListId) {
      // Add the new list to selection
      setSelectedListIds((prev) => new Set([...prev, newListId]));
      setNewListName("");
      setIsCreatingList(false);
      refetchLists();
    }
  };

  const handleSave = async () => {
    if (!media) return;

    setIsSaving(true);
    try {
      await updateMediaLists(media, Array.from(selectedListIds), imdbId);
      refetchMediaLists();
      onComplete?.();
      dismiss();
    } catch (err) {
      console.error("Failed to update lists:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsCreatingList(false);
    setNewListName("");
    dismiss();
  };

  const isLoading = isLoadingLists || isLoadingMediaLists;

  return (
    <BottomSheetContent
      ref={sheetRef}
      enableDynamicSizing={false}
      snapPoints={snapPoints}
    >
      <BottomSheetHeader>
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-text">
            {t("list.addToList")}
          </Text>
          <Text className="text-xs text-subtext0">
            {t("list.addToListDesc")}
          </Text>
        </View>
      </BottomSheetHeader>
      <BottomSheetView className="pb-6 gap-5">
        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <>
            {/* List items */}
            <View className="mb-4 gap-2">
              {lists.length === 0 ? (
                <View className="rounded-2xl border border-dashed border-surface1/60 px-4 py-6">
                  <Text className="text-sm text-subtext0">
                    {t("library.noLists")}
                  </Text>
                  <Text className="text-xs text-subtext0 mt-1">
                    {t("library.noListsDesc")}
                  </Text>
                </View>
              ) : (
                lists.map((list) => {
                  const isSelected = selectedListIds.has(list.id);
                  return (
                    <Pressable
                      key={list.id}
                      onPress={() => handleToggleList(list.id)}
                      className={cn(
                        "flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-80",
                        isSelected
                          ? "border-lavender/40 bg-lavender/10"
                          : "border-surface1/40 bg-surface0/10",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleList(list.id)}
                      />
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-base text-text">
                            {list.name}
                          </Text>
                          {list.isDefault && (
                            <View className="rounded-full bg-surface0/40 px-2 py-0.5">
                              <Text className="text-[10px] uppercase tracking-wide text-subtext0">
                                {t("list.defaultLabel")}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-subtext0 mt-0.5">
                          {t("library.item", { count: list.itemCount })}
                        </Text>
                      </View>
                      {isSelected && (
                        <View className="h-7 w-7 items-center justify-center rounded-full bg-lavender/15">
                          <Check size={16} className="text-lavender" />
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* Create new list section */}
            {isCreatingList ? (
              <View className="mb-4 rounded-2xl border border-surface1/40 bg-surface0/10 p-4">
                <Text className="text-sm font-medium text-text mb-3">
                  {t("list.newList")}
                </Text>
                <BottomSheetTextInput
                  placeholder={t("list.listName")}
                  value={newListName}
                  onChangeText={setNewListName}
                  autoFocus
                  onSubmitEditing={handleCreateList}
                  returnKeyType="done"
                />
                <View className="flex-row gap-2 mt-3">
                  <TextButton
                    variant="secondary"
                    className="flex-1"
                    onPress={() => {
                      setIsCreatingList(false);
                      setNewListName("");
                    }}
                    label={t("common.cancel")}
                  />
                  <TextButton
                    className="flex-1"
                    onPress={handleCreateList}
                    disabled={!newListName.trim()}
                    label={t("list.create")}
                    textVariant="base"
                  />
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  lightImpact();
                  setIsCreatingList(true);
                }}
                className="flex-row items-center rounded-2xl border border-dashed border-surface1/60 px-4 py-3 active:opacity-70"
              >
                <View className="w-5 h-5 mr-3 items-center justify-center">
                  <Plus size={20} className="text-lavender" />
                </View>
                <View>
                  <Text className="text-base text-text font-medium">
                    {t("list.createNew")}
                  </Text>
                  <Text className="text-xs text-subtext0">
                    {t("list.createNewDesc")}
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Action buttons */}
            <View className="flex-row gap-3 pt-2">
              <TextButton
                variant="secondary"
                className="flex-1"
                onPress={handleCancel}
                label={t("common.cancel")}
              />
              <TextButton
                className="flex-1"
                onPress={handleSave}
                disabled={isSaving}
                loading={isSaving}
                loadingColor="white"
                label={t("common.done")}
                textVariant="baseStrong"
              />
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetContent>
  );
}

import * as React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import {
  BottomSheetContent,
  BottomSheetView,
  BottomSheetHeader,
  BottomSheetTextInput,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const { createList, updateMediaLists, ensureDefaultList } = useListActions();

  const [selectedListIds, setSelectedListIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [isCreatingList, setIsCreatingList] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

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
    <BottomSheetContent ref={sheetRef} enableDynamicSizing>
      <BottomSheetHeader>
        <View className="flex-1 gap-1">
          <Text className="text-lg font-semibold text-foreground">
            Add to List
          </Text>
          <Text className="text-xs text-muted-foreground">
            Choose where to save this title
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
                <View className="rounded-2xl border border-dashed border-border/60 px-4 py-6">
                  <Text className="text-sm text-muted-foreground">
                    No lists yet. Create one to get started.
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
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/40 bg-muted/10",
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleList(list.id)}
                      />
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-base text-foreground">
                            {list.name}
                          </Text>
                          {list.isDefault && (
                            <View className="rounded-full bg-muted/40 px-2 py-0.5">
                              <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Default
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-muted-foreground mt-0.5">
                          {list.itemCount}{" "}
                          {list.itemCount === 1 ? "item" : "items"}
                        </Text>
                      </View>
                      {isSelected && (
                        <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                          <Check size={16} className="text-primary" />
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* Create new list section */}
            {isCreatingList ? (
              <View className="mb-4 rounded-2xl border border-border/40 bg-muted/10 p-4">
                <Text className="text-sm font-medium text-foreground mb-3">
                  New list
                </Text>
                <BottomSheetTextInput
                  placeholder="List name"
                  value={newListName}
                  onChangeText={setNewListName}
                  autoFocus
                  onSubmitEditing={handleCreateList}
                  returnKeyType="done"
                />
                <View className="flex-row gap-2 mt-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onPress={() => {
                      setIsCreatingList(false);
                      setNewListName("");
                    }}
                  >
                    <Text>Cancel</Text>
                  </Button>
                  <Button
                    className="flex-1"
                    onPress={handleCreateList}
                    disabled={!newListName.trim()}
                  >
                    <Text className="text-primary-foreground">Create</Text>
                  </Button>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  lightImpact();
                  setIsCreatingList(true);
                }}
                className="flex-row items-center rounded-2xl border border-dashed border-border/60 px-4 py-3 active:opacity-70"
              >
                <View className="w-5 h-5 mr-3 items-center justify-center">
                  <Plus size={20} className="text-primary" />
                </View>
                <View>
                  <Text className="text-base text-foreground font-medium">
                    Create new list
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Keep your library organized
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Action buttons */}
            <View className="flex-row gap-3 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={handleCancel}
              >
                <Text>Cancel</Text>
              </Button>
              <Button
                className="flex-1"
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-primary-foreground font-semibold">
                    Done
                  </Text>
                )}
              </Button>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetContent>
  );
}

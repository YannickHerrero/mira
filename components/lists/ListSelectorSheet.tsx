import * as React from "react";
import { View, Pressable, TextInput, ActivityIndicator } from "react-native";
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
import { useLists, useMediaLists, useListActions } from "@/hooks/useLists";
import type { Media } from "@/lib/types";
import { selectionChanged, lightImpact } from "@/lib/haptics";

interface ListSelectorSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  media: Media | null;
  imdbId?: string;
  onComplete?: () => void;
}

export function ListSelectorSheet({
  sheetRef,
  media,
  imdbId,
  onComplete,
}: ListSelectorSheetProps) {
  const { dismiss } = useBottomSheetModal();
  const { lists, isLoading: isLoadingLists, refetch: refetchLists } = useLists();
  const {
    listIds: currentListIds,
    isLoading: isLoadingMediaLists,
    refetch: refetchMediaLists,
  } = useMediaLists(media?.id ?? 0, media?.mediaType ?? "movie");
  const { createList, updateMediaLists, ensureDefaultList } = useListActions();

  const [selectedListIds, setSelectedListIds] = React.useState<Set<string>>(new Set());
  const [isCreatingList, setIsCreatingList] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync selected lists when media lists load
  React.useEffect(() => {
    setSelectedListIds(new Set(currentListIds));
  }, [currentListIds]);

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
        <Text className="text-lg font-semibold text-foreground py-4">
          Add to List
        </Text>
      </BottomSheetHeader>
      <BottomSheetView className="pb-6 gap-4">
        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <>
            {/* List items */}
            <View className="mb-4">
              {lists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => handleToggleList(list.id)}
                  className="flex-row items-center py-3 border-b border-border active:opacity-70"
                >
                  <Checkbox
                    checked={selectedListIds.has(list.id)}
                    onCheckedChange={() => handleToggleList(list.id)}
                    className="mr-3"
                  />
                  <View className="flex-1">
                    <Text className="text-base text-foreground">
                      {list.name}
                      {list.isDefault && (
                        <Text className="text-muted-foreground"> (Default)</Text>
                      )}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {list.itemCount} {list.itemCount === 1 ? "item" : "items"}
                    </Text>
                  </View>
                  {selectedListIds.has(list.id) && (
                    <Check size={20} className="text-primary" />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Create new list section */}
            {isCreatingList ? (
              <View className="mb-4">
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
                    variant="outline"
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
                className="flex-row items-center py-3 mb-4 active:opacity-70"
              >
                <View className="w-5 h-5 mr-3 items-center justify-center">
                  <Plus size={20} className="text-primary" />
                </View>
                <Text className="text-base text-primary font-medium">
                  Create new list
                </Text>
              </Pressable>
            )}

            {/* Action buttons */}
            <View className="flex-row gap-3">
              <Button variant="outline" className="flex-1" onPress={handleCancel}>
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

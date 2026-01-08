import * as React from "react";
import { Pressable, View, ScrollView } from "react-native";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetView,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Text } from "@/components/ui/text";
import ListItem from "@/components/ui/list-item";
import {
  Volume2,
  Subtitles,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Check,
} from "@/lib/icons";
import { useStreamingPreferences } from "@/hooks/useStreamingPreferences";
import {
  LANGUAGE_OPTIONS,
  SUBTITLE_OFF_OPTION,
  type LanguageOption,
  type SubtitleOption,
} from "@/stores/streaming-preferences";
import { getPreferenceDisplayText } from "@/lib/language-utils";
import { selectionChanged } from "@/lib/haptics";

// ============================================
// Ordered Item Component (with up/down/remove)
// ============================================

interface OrderedItemProps {
  label: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function OrderedItem({
  label,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: OrderedItemProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <View className="flex-row items-center py-2 px-1 bg-muted/30 rounded-lg mb-2">
      {/* Priority number */}
      <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center mr-3">
        <Text className="text-primary font-bold text-sm">{index + 1}</Text>
      </View>

      {/* Language label */}
      <Text className="flex-1 text-foreground text-base">{label}</Text>

      {/* Move up button */}
      <Pressable
        onPress={() => {
          if (!isFirst) {
            selectionChanged();
            onMoveUp();
          }
        }}
        className={`p-2 rounded ${isFirst ? "opacity-30" : ""}`}
        disabled={isFirst}
      >
        <ChevronUp size={20} className="text-muted-foreground" />
      </Pressable>

      {/* Move down button */}
      <Pressable
        onPress={() => {
          if (!isLast) {
            selectionChanged();
            onMoveDown();
          }
        }}
        className={`p-2 rounded ${isLast ? "opacity-30" : ""}`}
        disabled={isLast}
      >
        <ChevronDown size={20} className="text-muted-foreground" />
      </Pressable>

      {/* Remove button */}
      <Pressable
        onPress={() => {
          selectionChanged();
          onRemove();
        }}
        className="p-2 rounded ml-1"
      >
        <X size={20} className="text-destructive" />
      </Pressable>
    </View>
  );
}

// ============================================
// Add Language Item Component
// ============================================

interface AddLanguageItemProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

function AddLanguageItem({ label, isSelected, onPress }: AddLanguageItemProps) {
  return (
    <Pressable
      className="py-3 flex-row items-center justify-between"
      onPress={() => {
        if (!isSelected) {
          selectionChanged();
          onPress();
        }
      }}
      disabled={isSelected}
    >
      <Text
        className={`text-base ${isSelected ? "text-muted-foreground" : "text-foreground"}`}
      >
        {label}
      </Text>
      {isSelected ? (
        <Check size={20} className="text-primary" />
      ) : (
        <Plus size={20} className="text-muted-foreground" />
      )}
    </Pressable>
  );
}

// ============================================
// Audio Preference Item
// ============================================

export function AudioPreferenceItem() {
  const {
    preferredAudioLanguages,
    moveAudioLanguage,
    addAudioLanguage,
    removeAudioLanguage,
  } = useStreamingPreferences();

  const displayText = getPreferenceDisplayText(preferredAudioLanguages);

  // Languages not yet selected
  const availableLanguages = LANGUAGE_OPTIONS.filter(
    (lang) => !preferredAudioLanguages.includes(lang)
  );

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <ListItem
          itemLeft={(props) => <Volume2 {...props} />}
          label="Preferred Audio"
          description={displayText}
        />
      </BottomSheetOpenTrigger>
      <BottomSheetContent snapPoints={["70%"]}>
        <BottomSheetHeader className="bg-background">
          <Text className="text-foreground text-xl font-bold pb-1">
            Audio Language Preferences
          </Text>
          <Text className="text-muted-foreground text-sm">
            Set your preferred audio languages in priority order
          </Text>
        </BottomSheetHeader>
        <BottomSheetView className="pt-4 bg-background flex-1">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Selected languages (ordered) */}
            {preferredAudioLanguages.length > 0 && (
              <View className="mb-4">
                <Text className="text-muted-foreground text-xs uppercase mb-2 px-1">
                  Your Preferences (in order)
                </Text>
                {preferredAudioLanguages.map((lang, index) => (
                  <OrderedItem
                    key={lang}
                    label={lang}
                    index={index}
                    total={preferredAudioLanguages.length}
                    onMoveUp={() => moveAudioLanguage(index, index - 1)}
                    onMoveDown={() => moveAudioLanguage(index, index + 1)}
                    onRemove={() => removeAudioLanguage(lang)}
                  />
                ))}
              </View>
            )}

            {/* Available languages to add */}
            <View>
              <Text className="text-muted-foreground text-xs uppercase mb-2 px-1">
                {preferredAudioLanguages.length > 0
                  ? "Add More Languages"
                  : "Select Languages"}
              </Text>
              <View className="h-px bg-border mb-2" />
              {availableLanguages.map((lang) => (
                <AddLanguageItem
                  key={lang}
                  label={lang}
                  isSelected={false}
                  onPress={() => addAudioLanguage(lang)}
                />
              ))}
            </View>

            {/* Info text */}
            <View className="mt-4 p-3 bg-muted/30 rounded-lg">
              <Text className="text-muted-foreground text-xs">
                The player will try to select audio tracks matching your preferences
                in order. If no match is found, the default track will be used.
              </Text>
            </View>

            {/* Bottom padding for scroll */}
            <View className="h-8" />
          </ScrollView>
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
}

// ============================================
// Subtitle Preference Item
// ============================================

export function SubtitlePreferenceItem() {
  const {
    preferredSubtitleLanguages,
    moveSubtitleLanguage,
    addSubtitleLanguage,
    removeSubtitleLanguage,
  } = useStreamingPreferences();

  const displayText = getPreferenceDisplayText(preferredSubtitleLanguages);

  // Check if "Off" is already selected
  const offSelected = preferredSubtitleLanguages.includes(SUBTITLE_OFF_OPTION);

  // Languages not yet selected (excluding "Off")
  const availableLanguages = LANGUAGE_OPTIONS.filter(
    (lang) => !preferredSubtitleLanguages.includes(lang)
  );

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <ListItem
          itemLeft={(props) => <Subtitles {...props} />}
          label="Preferred Subtitles"
          description={displayText}
        />
      </BottomSheetOpenTrigger>
      <BottomSheetContent snapPoints={["70%"]}>
        <BottomSheetHeader className="bg-background">
          <Text className="text-foreground text-xl font-bold pb-1">
            Subtitle Language Preferences
          </Text>
          <Text className="text-muted-foreground text-sm">
            Set your preferred subtitle languages in priority order
          </Text>
        </BottomSheetHeader>
        <BottomSheetView className="pt-4 bg-background flex-1">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Selected languages (ordered) */}
            {preferredSubtitleLanguages.length > 0 && (
              <View className="mb-4">
                <Text className="text-muted-foreground text-xs uppercase mb-2 px-1">
                  Your Preferences (in order)
                </Text>
                {preferredSubtitleLanguages.map((lang, index) => (
                  <OrderedItem
                    key={lang}
                    label={lang}
                    index={index}
                    total={preferredSubtitleLanguages.length}
                    onMoveUp={() => moveSubtitleLanguage(index, index - 1)}
                    onMoveDown={() => moveSubtitleLanguage(index, index + 1)}
                    onRemove={() => removeSubtitleLanguage(lang)}
                  />
                ))}
              </View>
            )}

            {/* "Off" option - special handling */}
            <View className="mb-4">
              <Text className="text-muted-foreground text-xs uppercase mb-2 px-1">
                Disable Option
              </Text>
              <View className="h-px bg-border mb-2" />
              <AddLanguageItem
                label="Off (disable if no match)"
                isSelected={offSelected}
                onPress={() => addSubtitleLanguage(SUBTITLE_OFF_OPTION)}
              />
            </View>

            {/* Available languages to add */}
            <View>
              <Text className="text-muted-foreground text-xs uppercase mb-2 px-1">
                {preferredSubtitleLanguages.length > 0
                  ? "Add More Languages"
                  : "Select Languages"}
              </Text>
              <View className="h-px bg-border mb-2" />
              {availableLanguages.map((lang) => (
                <AddLanguageItem
                  key={lang}
                  label={lang}
                  isSelected={false}
                  onPress={() => addSubtitleLanguage(lang)}
                />
              ))}
            </View>

            {/* Info text */}
            <View className="mt-4 p-3 bg-muted/30 rounded-lg">
              <Text className="text-muted-foreground text-xs">
                The player will try to enable subtitles matching your preferences
                in order. Add "Off" to your list to disable subtitles if none of
                your preferred languages are available.
              </Text>
            </View>

            {/* Bottom padding for scroll */}
            <View className="h-8" />
          </ScrollView>
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
}

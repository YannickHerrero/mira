import * as React from "react";
import { Pressable, View } from "react-native";
import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFlatList,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetView,
} from "@/components/primitives/bottomSheet/bottom-sheet.native";
import { Text } from "@/components/ui/text";
import ListItem from "@/components/ui/list-item";
import { Check, ListChecks, Languages } from "@/lib/icons";
import { useSourceFilters } from "@/hooks/useSourceFilters";
import {
  QUALITY_OPTIONS,
  LANGUAGE_OPTIONS,
  type QualityOption,
  type LanguageOption,
} from "@/stores/source-filters";
import { selectionChanged } from "@/lib/haptics";

// ============================================
// Multi-Select Item Component
// ============================================

interface MultiSelectItemProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function MultiSelectItem({ label, selected, onPress }: MultiSelectItemProps) {
  return (
    <Pressable
      className="py-3 flex-row items-center justify-between"
      onPress={onPress}
    >
      <Text className="text-foreground text-base">{label}</Text>
      {selected && <Check size={20} className="text-primary" />}
    </Pressable>
  );
}

// ============================================
// Quality Filter Item
// ============================================

export function QualityFilterItem() {
  const { qualities, setQualities } = useSourceFilters();
  const { dismiss } = useBottomSheetModal();

  const isAllSelected = qualities.length === 0;

  const getDisplayText = () => {
    if (isAllSelected) return "All";
    if (qualities.length === 1) return qualities[0];
    return `${qualities.length} selected`;
  };

  const toggleQuality = (quality: QualityOption) => {
    selectionChanged();
    if (qualities.includes(quality)) {
      // Remove quality
      setQualities(qualities.filter((q) => q !== quality));
    } else {
      // Add quality
      setQualities([...qualities, quality]);
    }
  };

  const selectAll = () => {
    selectionChanged();
    setQualities([]);
    dismiss();
  };

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <ListItem
          itemLeft={(props) => <ListChecks {...props} />}
          label="Quality"
          description={getDisplayText()}
        />
      </BottomSheetOpenTrigger>
      <BottomSheetContent>
        <BottomSheetHeader className="bg-background">
          <Text className="text-foreground text-xl font-bold pb-1">
            Select Quality
          </Text>
        </BottomSheetHeader>
        <BottomSheetView className="gap-1 pt-4 bg-background">
          {/* All option */}
          <MultiSelectItem
            label="All"
            selected={isAllSelected}
            onPress={selectAll}
          />

          <View className="h-px bg-border my-2" />

          {/* Individual quality options */}
          {QUALITY_OPTIONS.map((quality) => (
            <MultiSelectItem
              key={quality}
              label={quality === "2160p" ? "4K (2160p)" : quality}
              selected={!isAllSelected && qualities.includes(quality)}
              onPress={() => toggleQuality(quality)}
            />
          ))}
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
}

// ============================================
// Language Filter Item
// ============================================

export function LanguageFilterItem() {
  const { languages, setLanguages } = useSourceFilters();
  const { dismiss } = useBottomSheetModal();

  const isAllSelected = languages.length === 0;

  const getDisplayText = () => {
    if (isAllSelected) return "All";
    if (languages.length === 1) return languages[0];
    if (languages.length <= 2) return languages.join(", ");
    return `${languages.length} selected`;
  };

  const toggleLanguage = (language: LanguageOption) => {
    selectionChanged();
    if (languages.includes(language)) {
      // Remove language
      setLanguages(languages.filter((l) => l !== language));
    } else {
      // Add language
      setLanguages([...languages, language]);
    }
  };

  const selectAll = () => {
    selectionChanged();
    setLanguages([]);
    dismiss();
  };

  const renderLanguageItem = React.useCallback(
    ({ item }: { item: LanguageOption }) => (
      <MultiSelectItem
        label={item}
        selected={!isAllSelected && languages.includes(item)}
        onPress={() => toggleLanguage(item)}
      />
    ),
    [isAllSelected, languages, toggleLanguage]
  );

  return (
    <BottomSheet>
      <BottomSheetOpenTrigger asChild>
        <ListItem
          itemLeft={(props) => <Languages {...props} />}
          label="Languages"
          description={getDisplayText()}
        />
      </BottomSheetOpenTrigger>
      <BottomSheetContent snapPoints={["70%"]} enableDynamicSizing={false}>
        <BottomSheetHeader className="bg-background">
          <Text className="text-foreground text-xl font-bold pb-1">
            Select Languages
          </Text>
        </BottomSheetHeader>
        <BottomSheetFlatList
          data={LANGUAGE_OPTIONS as unknown as LanguageOption[]}
          keyExtractor={(item: LanguageOption) => item}
          renderItem={renderLanguageItem}
          className="px-4"
          ListHeaderComponent={
            <View>
              <MultiSelectItem
                label="All"
                selected={isAllSelected}
                onPress={selectAll}
              />
              <View className="h-px bg-border my-2" />
            </View>
          }
        />
      </BottomSheetContent>
    </BottomSheet>
  );
}

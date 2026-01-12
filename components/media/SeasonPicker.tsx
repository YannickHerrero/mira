import * as React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import type { Season } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SeasonPickerProps {
  seasons: Season[];
  selectedSeason: number;
  onSelectSeason: (seasonNumber: number) => void;
}

export function SeasonPicker({
  seasons,
  selectedSeason,
  onSelectSeason,
}: SeasonPickerProps) {
  if (seasons.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      className="py-3"
    >
      {seasons.map((season) => (
        <Pressable
          key={season.seasonNumber}
          onPress={() => onSelectSeason(season.seasonNumber)}
          className={cn(
            "px-4 py-2 rounded-full",
            selectedSeason === season.seasonNumber
              ? "bg-lavender"
              : "bg-surface0"
          )}
        >
          <Text
            className={cn(
              "text-sm font-medium",
              selectedSeason === season.seasonNumber
                ? "text-crust"
                : "text-subtext0"
            )}
          >
            Season {season.seasonNumber}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

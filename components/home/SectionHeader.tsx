import * as React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { ChevronRight } from "@/lib/icons";

interface SectionHeaderProps {
  title: string;
  onSeeMore?: () => void;
}

export function SectionHeader({ title, onSeeMore }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 mb-4">
      <Text variant="sectionTitle" className="text-foreground/50">
        {title}
      </Text>
      {onSeeMore && (
        <Pressable onPress={onSeeMore} className="flex-row items-center">
          <Text variant="sectionTitle" className="text-lavender">
            See more
          </Text>
          <ChevronRight size={14} color="#b7bdf8" />
        </Pressable>
      )}
    </View>
  );
}

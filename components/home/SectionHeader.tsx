import * as React from "react";
import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { ChevronRight } from "@/lib/icons";

interface SectionHeaderProps {
  title: string;
  onSeeMore?: () => void;
}

export function SectionHeader({ title, onSeeMore }: SectionHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between px-4 mb-4">
      <Text variant="sectionTitle" className="text-text/50">
        {title}
      </Text>
      {onSeeMore && (
        <Pressable onPress={onSeeMore} className="flex-row items-center">
          <Text variant="sectionTitle" className="text-lavender">
            {t("common.seeMore")}
          </Text>
          <ChevronRight size={14} color="#b7bdf8" />
        </Pressable>
      )}
    </View>
  );
}

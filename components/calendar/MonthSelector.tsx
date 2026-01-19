import * as React from "react";
import { View, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { ChevronLeft } from "@/lib/icons/ChevronLeft";
import { ChevronRight } from "@/lib/icons/ChevronRight";

interface MonthSelectorProps {
  month: number;
  year: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onTodayPress: () => void;
  isCurrentMonth: boolean;
}

export function MonthSelector({
  month,
  year,
  onPreviousMonth,
  onNextMonth,
  onTodayPress,
  isCurrentMonth,
}: MonthSelectorProps) {
  const { i18n } = useTranslation();
  const { t } = useTranslation();

  // Format month and year using locale
  const monthYearLabel = new Date(year, month, 1).toLocaleDateString(
    i18n.language,
    {
      month: "long",
      year: "numeric",
    }
  );

  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-base border-b border-surface0">
      <View className="flex-row items-center flex-1">
        <Pressable
          onPress={onPreviousMonth}
          className="p-2 -ml-2 active:opacity-60"
          hitSlop={8}
        >
          <ChevronLeft size={24} className="text-text" />
        </Pressable>

        <Text className="text-base font-semibold text-text flex-1 text-center">
          {monthYearLabel}
        </Text>

        <Pressable
          onPress={onNextMonth}
          className="p-2 active:opacity-60"
          hitSlop={8}
        >
          <ChevronRight size={24} className="text-text" />
        </Pressable>
      </View>

      <Pressable
        onPress={onTodayPress}
        className={`ml-3 px-3 py-1.5 rounded-md ${
          isCurrentMonth ? "bg-surface0" : "bg-lavender"
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            isCurrentMonth ? "text-subtext0" : "text-crust"
          }`}
        >
          {t("calendar.today")}
        </Text>
      </Pressable>
    </View>
  );
}

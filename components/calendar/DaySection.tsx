import * as React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { ReleaseItem } from "./ReleaseItem";
import type { UpcomingRelease } from "@/lib/api/tmdb";

interface DaySectionProps {
  date: string;
  releases: UpcomingRelease[];
}

export function DaySection({ date, releases }: DaySectionProps) {
  const { t, i18n } = useTranslation();
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = dateObj.toDateString() === today.toDateString();
  const isTomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString() === dateObj.toDateString();
  const isYesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString() === dateObj.toDateString();

  // Format date for display using locale
  const dayName = dateObj.toLocaleDateString(i18n.language, { weekday: "long" });
  const monthDay = dateObj.toLocaleDateString(i18n.language, {
    month: "short",
    day: "numeric",
  });

  let dateLabel = t("calendar.dateFormat", { weekday: dayName, date: monthDay });
  if (isToday) {
    dateLabel = t("calendar.todayDate", { date: monthDay });
  } else if (isTomorrow) {
    dateLabel = t("calendar.tomorrowDate", { date: monthDay });
  } else if (isYesterday) {
    dateLabel = t("calendar.yesterdayDate", { date: monthDay });
  }

  return (
    <View className="mb-6">
      {/* Date header */}
      <View className="flex-row items-center mb-3 px-4">
        <Text className="text-sm font-semibold text-foreground">
          {dateLabel}
        </Text>
      </View>

      {/* Releases for this day */}
      <View className="px-4">
        {releases.map((release, index) => (
          <ReleaseItem
            key={`${release.media.id}-${release.media.mediaType}-${index}`}
            release={release}
          />
        ))}
      </View>
    </View>
  );
}

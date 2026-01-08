import * as React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { ReleaseItem } from "./ReleaseItem";
import type { UpcomingRelease } from "@/lib/api/tmdb";

interface DaySectionProps {
  date: string;
  releases: UpcomingRelease[];
}

export function DaySection({ date, releases }: DaySectionProps) {
  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = dateObj.toDateString() === today.toDateString();
  const isTomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString() === dateObj.toDateString();

  // Format date for display
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  let dateLabel = `${dayName}, ${monthDay}`;
  if (isToday) {
    dateLabel = `Today, ${monthDay}`;
  } else if (isTomorrow) {
    dateLabel = `Tomorrow, ${monthDay}`;
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

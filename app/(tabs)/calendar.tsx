import * as React from "react";
import {
  View,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { ReleaseItem } from "@/components/calendar";
import { CalendarDays } from "@/lib/icons/CalendarDays";
import { useUpcomingReleases } from "@/hooks/useUpcomingReleases";
import type { UpcomingRelease } from "@/lib/api/tmdb";

interface Section {
  date: string;
  data: UpcomingRelease[];
}

export default function CalendarScreen() {
  const { releasesByDate, isLoading, error, refetch } = useUpcomingReleases();
  const [refreshing, setRefreshing] = React.useState(false);
  const sectionListRef = React.useRef<SectionList<UpcomingRelease, Section>>(null);

  // Convert Map to sorted array of sections
  const sortedDates = Array.from(releasesByDate.keys()).sort();
  const sections: Section[] = sortedDates.map((date) => ({
    date,
    data: releasesByDate.get(date) || [],
  }));

  // Find today's section index
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySectionIndex = sections.findIndex((section) => section.date >= todayStr);

  // Refetch and scroll to today when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();

      // Scroll to today's section
      if (sections.length > 0 && sectionListRef.current && todaySectionIndex >= 0) {
        // Small delay to ensure the list is rendered
        const timer = setTimeout(() => {
          sectionListRef.current?.scrollToLocation({
            sectionIndex: todaySectionIndex,
            itemIndex: 0,
            viewPosition: 0,
            animated: false,
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [refetch, sections.length, todaySectionIndex])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderSectionHeader = React.useCallback(
    ({ section }: { section: Section }) => {
      const dateObj = new Date(section.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isToday = dateObj.toDateString() === today.toDateString();
      const isTomorrow =
        new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString() ===
        dateObj.toDateString();
      const isYesterday =
        new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString() ===
        dateObj.toDateString();

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
      } else if (isYesterday) {
        dateLabel = `Yesterday, ${monthDay}`;
      }

      return (
        <View className="mb-3 px-4 pt-4 bg-background">
          <Text className="text-sm font-semibold text-foreground">
            {dateLabel}
          </Text>
        </View>
      );
    },
    []
  );

  const renderItem = React.useCallback(
    ({ item, index }: { item: UpcomingRelease; index: number }) => (
      <View className="px-4">
        <ReleaseItem
          key={`${item.media.id}-${item.media.mediaType}-${index}`}
          release={item}
        />
      </View>
    ),
    []
  );

  const keyExtractor = React.useCallback(
    (item: UpcomingRelease, index: number) =>
      `${item.media.id}-${item.media.mediaType}-${index}`,
    []
  );

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-4">
        <Text className="text-center text-muted-foreground">{error}</Text>
      </View>
    );
  }

  if (isLoading && sections.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="hsl(0 0% 98%)" />
        <Text className="text-muted-foreground mt-4">
          Loading releases...
        </Text>
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <SectionList
          sections={[]}
          renderItem={() => null}
          renderSectionHeader={() => null}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<CalendarDays size={48} className="text-muted-foreground" />}
              title="No releases"
              description="Add shows and movies to your watchlist to see their releases here"
            />
          }
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SectionList
        ref={sectionListRef}
        sections={sections}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScrollToIndexFailed={() => {
          // Silently handle scroll failures (can happen if list isn't fully rendered)
        }}
        ListFooterComponent={
          refreshing ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color="hsl(0 0% 98%)" />
            </View>
          ) : null
        }
      />
    </View>
  );
}

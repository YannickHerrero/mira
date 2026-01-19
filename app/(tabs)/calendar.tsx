import * as React from "react";
import {
  View,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui/text";
import { TabContentWrapper } from "@/components/ui/tab-content-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ReleaseItem, MonthSelector } from "@/components/calendar";
import { CalendarDays } from "@/lib/icons/CalendarDays";
import { useUpcomingReleases } from "@/hooks/useUpcomingReleases";
import type { UpcomingRelease } from "@/lib/api/tmdb";

interface Section {
  date: string;
  data: UpcomingRelease[];
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  
  // Month/year state - initialize to current month
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth());
  const [selectedYear, setSelectedYear] = React.useState(now.getFullYear());
  
  const { releasesByDate, isLoading, error, refetch } = useUpcomingReleases({
    month: selectedMonth,
    year: selectedYear,
  });
  const [refreshing, setRefreshing] = React.useState(false);
  const sectionListRef = React.useRef<SectionList<UpcomingRelease, Section>>(null);
  const shouldScrollToTodayRef = React.useRef(false);

  // Check if viewing current month
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  // Convert Map to sorted array of sections
  const sortedDates = Array.from(releasesByDate.keys()).sort();
  const sections: Section[] = sortedDates.map((date) => ({
    date,
    data: releasesByDate.get(date) || [],
  }));

  // Find today's section index (only relevant when viewing current month)
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySectionIndex = sections.findIndex((section) => section.date >= todayStr);

  // Navigation handlers
  const handlePreviousMonth = React.useCallback(() => {
    setSelectedMonth((prevMonth) => {
      if (prevMonth === 0) {
        setSelectedYear((prevYear) => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
  }, []);

  const handleNextMonth = React.useCallback(() => {
    setSelectedMonth((prevMonth) => {
      if (prevMonth === 11) {
        setSelectedYear((prevYear) => prevYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
  }, []);

  const handleTodayPress = React.useCallback(() => {
    const today = new Date();
    const targetMonth = today.getMonth();
    const targetYear = today.getFullYear();
    
    // Mark that we want to scroll to today
    shouldScrollToTodayRef.current = true;
    
    // If already on current month, manually trigger scroll
    if (selectedMonth === targetMonth && selectedYear === targetYear) {
      // Small delay to ensure list is ready
      setTimeout(() => {
        if (sectionListRef.current && todaySectionIndex >= 0) {
          sectionListRef.current.scrollToLocation({
            sectionIndex: todaySectionIndex,
            itemIndex: 0,
            viewPosition: 0,
            animated: true,
          });
        }
        shouldScrollToTodayRef.current = false;
      }, 100);
    } else {
      setSelectedMonth(targetMonth);
      setSelectedYear(targetYear);
    }
  }, [selectedMonth, selectedYear, todaySectionIndex]);

  // Scroll to today when viewing current month, or to top otherwise
  const scrollToAppropriatePosition = React.useCallback((forceScrollToToday = false) => {
    if (!sectionListRef.current || sections.length === 0) return;

    const shouldScrollToToday = forceScrollToToday || shouldScrollToTodayRef.current;
    
    const timer = setTimeout(() => {
      if ((isCurrentMonth || shouldScrollToToday) && todaySectionIndex >= 0) {
        // Scroll to today's section when viewing current month or when Today button was pressed
        sectionListRef.current?.scrollToLocation({
          sectionIndex: todaySectionIndex,
          itemIndex: 0,
          viewPosition: 0,
          animated: shouldScrollToToday,
        });
        shouldScrollToTodayRef.current = false;
      } else if (sections.length > 0) {
        // Scroll to top for other months
        sectionListRef.current?.scrollToLocation({
          sectionIndex: 0,
          itemIndex: 0,
          viewPosition: 0,
          animated: false,
        });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isCurrentMonth, todaySectionIndex, sections.length]);

  // Refetch and scroll when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
      scrollToAppropriatePosition();
    }, [refetch, scrollToAppropriatePosition])
  );

  // Scroll when month changes
  React.useEffect(() => {
    scrollToAppropriatePosition();
  }, [selectedMonth, selectedYear, sections.length]);

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
        dateLabel = `${t("calendar.today")}, ${monthDay}`;
      } else if (isTomorrow) {
        dateLabel = `${t("calendar.tomorrow")}, ${monthDay}`;
      } else if (isYesterday) {
        dateLabel = `${t("calendar.yesterday")}, ${monthDay}`;
      }

      return (
        <View className="mb-3 px-4 pt-4 bg-base">
          <Text className="text-sm font-semibold text-text">
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

  // Month selector component (reused across all states)
  const monthSelectorComponent = (
    <MonthSelector
      month={selectedMonth}
      year={selectedYear}
      onPreviousMonth={handlePreviousMonth}
      onNextMonth={handleNextMonth}
      onTodayPress={handleTodayPress}
      isCurrentMonth={isCurrentMonth}
    />
  );

  if (error) {
    return (
      <TabContentWrapper className="bg-base">
        {monthSelectorComponent}
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-subtext0">{error}</Text>
        </View>
      </TabContentWrapper>
    );
  }

  if (isLoading && sections.length === 0) {
    return (
      <TabContentWrapper className="bg-base">
        {monthSelectorComponent}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="hsl(0 0% 98%)" />
          <Text className="text-subtext0 mt-4">
            {t("calendar.loading")}
          </Text>
        </View>
      </TabContentWrapper>
    );
  }

  if (sections.length === 0) {
    return (
      <TabContentWrapper className="bg-base">
        {monthSelectorComponent}
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
              icon={<CalendarDays size={48} className="text-subtext0" />}
              title={t("calendar.noReleasesMonth")}
              description={t("calendar.noReleasesMonthDesc")}
            />
          }
        />
      </TabContentWrapper>
    );
  }

  return (
    <TabContentWrapper className="bg-base">
      {monthSelectorComponent}
      <SectionList
        ref={sectionListRef}
        sections={sections}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: 96 }}
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
    </TabContentWrapper>
  );
}

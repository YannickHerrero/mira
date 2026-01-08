import * as React from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/ui/empty-state";
import { DaySection } from "@/components/calendar";
import { CalendarDays } from "@/lib/icons/CalendarDays";
import { useUpcomingReleases } from "@/hooks/useUpcomingReleases";

export default function CalendarScreen() {
  const { releasesByDate, isLoading, error, refetch } = useUpcomingReleases();
  const [refreshing, setRefreshing] = React.useState(false);

  // Refetch when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Convert Map to sorted array of dates
  const sortedDates = Array.from(releasesByDate.keys()).sort();

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-4">
        <Text className="text-center text-muted-foreground">{error}</Text>
      </View>
    );
  }

  if (isLoading && sortedDates.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, justifyContent: "center" }}
          scrollEnabled={false}
        >
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="hsl(0 0% 98%)" />
            <Text className="text-muted-foreground mt-4">
              Loading upcoming releases...
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (sortedDates.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <EmptyState
            icon={<CalendarDays size={48} className="text-muted-foreground" />}
            title="No upcoming releases"
            description="Add shows and movies to your watchlist to see their releases here"
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {sortedDates.map((date) => {
          const releases = releasesByDate.get(date) || [];
          return (
            <DaySection
              key={date}
              date={date}
              releases={releases}
            />
          );
        })}

        {/* Loading indicator for additional data being fetched */}
        {refreshing && (
          <View className="items-center py-4">
            <ActivityIndicator size="small" color="hsl(0 0% 98%)" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

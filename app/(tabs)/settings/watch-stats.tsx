import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedNumber } from "@/components/stats/AnimatedNumber";
import { MonthlyActivityChart } from "@/components/stats/MonthlyActivityChart";
import { TopGenresChart } from "@/components/stats/TopGenresChart";
import { TopShowsList } from "@/components/stats/TopShowsList";
import { useWatchStats } from "@/hooks/useWatchStats";
import { Film, Clock, Heart, Star } from "@/lib/icons";

function formatWatchTime(
  totalSeconds: number,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(t("watchStats.days", { count: days }));
  if (hours > 0) parts.push(t("watchStats.hours", { count: hours }));
  parts.push(t("watchStats.minutes", { count: minutes }));

  return parts.join(" ");
}

function StatCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      className="bg-surface0/20 rounded-2xl p-4"
    >
      {children}
    </Animated.View>
  );
}

function LoadingSkeleton() {
  return (
    <View className="gap-4 px-4 pt-6">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </View>
  );
}

export default function WatchStatsScreen() {
  const { t } = useTranslation();
  const { stats, isLoading, isEmpty } = useWatchStats();

  return (
    <View className="flex-1 bg-base">
      <SettingsPageHeader title={t("watchStats.title")} />

      {isLoading ? (
        <LoadingSkeleton />
      ) : isEmpty || !stats ? (
        <EmptyState
          icon={<Film size={48} className="text-subtext0" />}
          title={t("watchStats.empty")}
          description={t("watchStats.emptyDescription")}
        />
      ) : (
        <ScrollView
          className="flex-1 w-full"
          contentContainerStyle={{ paddingBottom: 96 }}
        >
          <View className="gap-4 px-4 pt-6">
            {/* Hero: Watch Time */}
            <StatCard delay={0}>
              <View className="flex-row items-center gap-2 mb-1">
                <Clock size={14} className="text-subtext0" />
                <Text variant="caption" className="text-subtext0">
                  {t("watchStats.totalWatchTime")}
                </Text>
              </View>
              <Text className="text-[24px] font-bold text-text">
                {formatWatchTime(stats.totalWatchTimeSeconds, t)}
              </Text>
            </StatCard>

            {/* Hero Row: Movies + Episodes + Shows */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              className="flex-row gap-3"
            >
              <View className="flex-1 bg-surface0/20 rounded-2xl p-4">
                <Text variant="caption" className="text-subtext0 mb-1">
                  {t("watchStats.moviesCompleted")}
                </Text>
                <AnimatedNumber value={stats.moviesCompleted} />
              </View>
              <View className="flex-1 bg-surface0/20 rounded-2xl p-4">
                <Text variant="caption" className="text-subtext0 mb-1">
                  {t("watchStats.episodesCompleted")}
                </Text>
                <AnimatedNumber value={stats.episodesCompleted} />
              </View>
              <View className="flex-1 bg-surface0/20 rounded-2xl p-4">
                <Text variant="caption" className="text-subtext0 mb-1">
                  {t("watchStats.showsWatched")}
                </Text>
                <AnimatedNumber value={stats.showsWatched} />
              </View>
            </Animated.View>

            {/* Duo: Avg Rating + Favorites */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              className="flex-row gap-3"
            >
              <View className="flex-1 bg-surface0/20 rounded-2xl p-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <Star size={12} className="text-subtext0" />
                  <Text variant="caption" className="text-subtext0">
                    {t("watchStats.averageRating")}
                  </Text>
                </View>
                {stats.averageRating !== null ? (
                  <AnimatedNumber
                    value={stats.averageRating}
                    decimals={1}
                    suffix="/10"
                  />
                ) : (
                  <Text className="text-[28px] font-bold text-subtext0">—</Text>
                )}
              </View>
              <View className="flex-1 bg-surface0/20 rounded-2xl p-4">
                <View className="flex-row items-center gap-2 mb-1">
                  <Heart size={12} className="text-subtext0" />
                  <Text variant="caption" className="text-subtext0">
                    {t("watchStats.favorites")}
                  </Text>
                </View>
                <AnimatedNumber value={stats.favoritesCount} />
              </View>
            </Animated.View>

            {/* Completion Rate */}
            <StatCard delay={300}>
              <Text variant="caption" className="text-subtext0 mb-2">
                {t("watchStats.completionRate")}
              </Text>
              <View className="flex-row items-center gap-3">
                <AnimatedNumber
                  value={stats.completionRate}
                  suffix="%"
                />
                <View className="flex-1 h-3 rounded-full bg-surface1/30 overflow-hidden">
                  <View
                    className="h-full rounded-full bg-green"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </View>
              </View>
              <Text variant="caption" className="text-subtext0 mt-1">
                {t("watchStats.completed", { count: stats.totalCompleted })}
                {" / "}
                {t("watchStats.started", { count: stats.totalStarted })}
              </Text>
            </StatCard>

            {/* Top Genres */}
            {stats.topGenres.length > 0 && (
              <StatCard delay={400}>
                <Text variant="caption" className="text-subtext0 mb-3">
                  {t("watchStats.topGenres")}
                </Text>
                <TopGenresChart data={stats.topGenres} />
              </StatCard>
            )}

            {/* Top Shows */}
            {stats.topShows.length > 0 && (
              <StatCard delay={500}>
                <Text variant="caption" className="text-subtext0 mb-3">
                  {t("watchStats.topShows")}
                </Text>
                <TopShowsList data={stats.topShows} />
              </StatCard>
            )}

            {/* Monthly Activity */}
            <StatCard delay={600}>
              <Text variant="caption" className="text-subtext0 mb-3">
                {t("watchStats.monthlyActivity")}
              </Text>
              <MonthlyActivityChart data={stats.monthlyActivity} />
            </StatCard>

          </View>
        </ScrollView>
      )}
    </View>
  );
}

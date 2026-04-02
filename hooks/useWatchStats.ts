import { useState, useEffect, useCallback } from "react";
import { and, eq } from "drizzle-orm";
import { useDatabase } from "@/db/provider";
import { watchProgressTable, mediaTable, downloadsTable } from "@/db/schema";

interface GenreStat {
  genre: string;
  count: number;
}

interface ShowStat {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  count: number;
}

interface MonthActivity {
  month: string; // "YYYY-MM"
  count: number;
}

export interface WatchStats {
  totalWatchTimeSeconds: number;
  moviesCompleted: number;
  episodesCompleted: number;
  showsWatched: number;
  topGenres: GenreStat[];
  topShows: ShowStat[];
  averageRating: number | null;
  favoritesCount: number;
  monthlyActivity: MonthActivity[];
  completionRate: number;
  totalStarted: number;
  totalCompleted: number;
}

export function useWatchStats() {
  const { db } = useDatabase();
  const [stats, setStats] = useState<WatchStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!db) return;

    setIsLoading(true);

    try {
      // 1. Fetch all watch progress rows and completed downloads
      const allProgress = await db.select().from(watchProgressTable);
      const allDownloads = await db.select().from(downloadsTable);
      const completedDownloads = allDownloads.filter(
        (d) => d.status === "completed"
      );

      if (allProgress.length === 0 && completedDownloads.length === 0) {
        setIsEmpty(true);
        setIsLoading(false);
        return;
      }

      const completedRows = allProgress.filter((r) => r.completed);

      // Build a set of items already counted from watch progress
      const watchedKeys = new Set(
        completedRows.map((r) =>
          r.mediaType === "tv"
            ? `${r.tmdbId}-tv-${r.seasonNumber}-${r.episodeNumber}`
            : `${r.tmdbId}-movie`
        )
      );

      // Find completed downloads not already in watch progress
      const downloadOnlyItems = completedDownloads.filter((d) => {
        const key =
          d.mediaType === "tv"
            ? `${d.tmdbId}-tv-${d.seasonNumber}-${d.episodeNumber}`
            : `${d.tmdbId}-movie`;
        return !watchedKeys.has(key);
      });

      // Merged items for counting
      type CompletedItem = {
        tmdbId: number;
        mediaType: "movie" | "tv";
        seasonNumber: number | null;
        episodeNumber: number | null;
        duration: number;
        timestamp: string | null;
      };

      const allCompleted: CompletedItem[] = [
        ...completedRows.map((r) => ({
          tmdbId: r.tmdbId,
          mediaType: r.mediaType,
          seasonNumber: r.seasonNumber,
          episodeNumber: r.episodeNumber,
          duration: r.duration ?? 0,
          timestamp: r.watchedAt,
        })),
        ...downloadOnlyItems.map((d) => ({
          tmdbId: d.tmdbId,
          mediaType: d.mediaType as "movie" | "tv",
          seasonNumber: d.seasonNumber,
          episodeNumber: d.episodeNumber,
          duration: 0, // no duration info for download-only items
          timestamp: d.completedAt,
        })),
      ];

      const totalStarted = new Set(
        [...allProgress, ...downloadOnlyItems].map((r) =>
          r.mediaType === "movie"
            ? `${r.tmdbId}-movie`
            : `${r.tmdbId}-tv`
        )
      ).size;
      const completedMediaKeys = new Set(
        allCompleted.map((r) =>
          r.mediaType === "movie"
            ? `${r.tmdbId}-movie`
            : `${r.tmdbId}-tv`
        )
      );
      const totalCompleted = completedMediaKeys.size;

      // 2. Basic counts
      const moviesCompleted = allCompleted.filter(
        (r) => r.mediaType === "movie"
      ).length;
      const episodesCompleted = allCompleted.filter(
        (r) => r.mediaType === "tv"
      ).length;

      // Unique TV shows with at least 1 completed episode
      const showsWatched = new Set(
        allCompleted
          .filter((r) => r.mediaType === "tv")
          .map((r) => r.tmdbId)
      ).size;

      // 3. Total watch time (sum duration of completed items)
      const totalWatchTimeSeconds = allCompleted.reduce(
        (sum, r) => sum + r.duration,
        0
      );

      // 4. Collect unique (tmdbId, mediaType) pairs from completed items
      const uniqueMedia = new Map<
        string,
        { tmdbId: number; mediaType: "movie" | "tv" }
      >();
      for (const row of allCompleted) {
        const key = `${row.tmdbId}-${row.mediaType}`;
        if (!uniqueMedia.has(key)) {
          uniqueMedia.set(key, {
            tmdbId: row.tmdbId,
            mediaType: row.mediaType,
          });
        }
      }

      // 5. Fetch media records for completed items
      const mediaRecords = await Promise.all(
        Array.from(uniqueMedia.values()).map(async ({ tmdbId, mediaType }) => {
          const result = await db
            .select()
            .from(mediaTable)
            .where(
              and(
                eq(mediaTable.tmdbId, tmdbId),
                eq(mediaTable.mediaType, mediaType)
              )
            )
            .limit(1);
          return result[0] ?? null;
        })
      );

      const validMedia = mediaRecords.filter(
        (m): m is NonNullable<typeof m> => m !== null
      );

      // 6. Top genres
      const genreCounts = new Map<string, number>();
      for (const media of validMedia) {
        if (!media.genres) continue;
        try {
          const genres: string[] = JSON.parse(media.genres);
          for (const genre of genres) {
            genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
          }
        } catch {
          // skip malformed genres
        }
      }
      const topGenres = Array.from(genreCounts.entries())
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 7. Top shows (by completed episode count)
      const showEpisodeCounts = new Map<
        number,
        { title: string; posterPath: string | null; count: number }
      >();
      for (const row of allCompleted) {
        if (row.mediaType !== "tv") continue;
        const existing = showEpisodeCounts.get(row.tmdbId);
        if (existing) {
          existing.count++;
        } else {
          const media = validMedia.find(
            (m) => m.tmdbId === row.tmdbId && m.mediaType === "tv"
          );
          showEpisodeCounts.set(row.tmdbId, {
            title: media?.title ?? "Unknown",
            posterPath: media?.posterPath ?? null,
            count: 1,
          });
        }
      }
      const topShows = Array.from(showEpisodeCounts.entries())
        .map(([tmdbId, data]) => ({ tmdbId, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 8. Average rating
      const ratedMedia = validMedia.filter(
        (m) => m.score !== null && m.score !== undefined && m.score > 0
      );
      const averageRating =
        ratedMedia.length > 0
          ? ratedMedia.reduce((sum, m) => sum + (m.score ?? 0), 0) /
            ratedMedia.length
          : null;

      // 9. Favorites count
      const favoritesResult = await db
        .select()
        .from(mediaTable)
        .where(eq(mediaTable.isFavorite, true));
      const favoritesCount = favoritesResult.length;

      // 10. Monthly activity (last 12 months)
      const now = new Date();
      const months: MonthActivity[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ month: key, count: 0 });
      }

      for (const row of allCompleted) {
        if (!row.timestamp) continue;
        const rowMonth = row.timestamp.slice(0, 7); // "YYYY-MM"
        const entry = months.find((m) => m.month === rowMonth);
        if (entry) {
          entry.count++;
        }
      }

      // 11. Completion rate
      const completionRate =
        totalStarted > 0
          ? Math.round((totalCompleted / totalStarted) * 100)
          : 0;

      setStats({
        totalWatchTimeSeconds,
        moviesCompleted,
        episodesCompleted,
        showsWatched,
        topGenres,
        topShows,
        averageRating,
        favoritesCount,
        monthlyActivity: months,
        completionRate,
        totalStarted,
        totalCompleted,
      });
      setIsEmpty(false);
    } catch (error) {
      console.error("Failed to compute watch stats:", error);
      setIsEmpty(true);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, isEmpty };
}

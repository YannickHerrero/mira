import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

// ============================================
// Media Library (movies, TV shows, anime)
// ============================================

/**
 * Stores media items (movies/TV shows) that user has interacted with.
 * Acts as a cache for TMDB data + tracks user's relationship with media.
 */
export const mediaTable = sqliteTable(
  "media",
  {
    // TMDB ID is unique per media type
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),

    // Basic info (cached from TMDB)
    title: text("title").notNull(),
    titleOriginal: text("title_original"),
    imdbId: text("imdb_id"),
    year: integer("year"),
    score: real("score"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    description: text("description"),
    genres: text("genres"), // JSON array stored as string
    seasonCount: integer("season_count"),
    episodeCount: integer("episode_count"),

    // User tracking
    isFavorite: integer("is_favorite", { mode: "boolean" }).default(false),
    addedAt: text("added_at").default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    primaryKey({
      columns: [table.tmdbId, table.mediaType],
    }),
  ]
);

export const MediaSchema = createSelectSchema(mediaTable);
export type MediaRecord = z.infer<typeof MediaSchema>;

/**
 * Tracks watch progress for movies and individual TV episodes.
 * For movies: one entry per movie
 * For TV: one entry per episode
 */
export const watchProgressTable = sqliteTable(
  "watch_progress",
  {
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),

    // For TV shows only (null for movies)
    seasonNumber: integer("season_number"),
    episodeNumber: integer("episode_number"),

    // Progress tracking
    position: integer("position").notNull().default(0), // seconds
    duration: integer("duration").notNull().default(0), // seconds
    completed: integer("completed", { mode: "boolean" }).default(false),

    // Timestamps
    watchedAt: text("watched_at").default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    primaryKey({
      columns: [
        table.tmdbId,
        table.mediaType,
        table.seasonNumber,
        table.episodeNumber,
      ],
    }),
  ]
);

export const WatchProgressSchema = createSelectSchema(watchProgressTable);
export type WatchProgress = z.infer<typeof WatchProgressSchema>;

/**
 * User's watchlist - media they want to watch later
 */
export const watchlistTable = sqliteTable(
  "watchlist",
  {
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    addedAt: text("added_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    primaryKey({
      columns: [table.tmdbId, table.mediaType],
    }),
  ]
);

export const WatchlistSchema = createSelectSchema(watchlistTable);
export type WatchlistItem = z.infer<typeof WatchlistSchema>;

/**
 * Downloaded media for offline viewing
 */
export const downloadsTable = sqliteTable("downloads", {
  id: text("id").primaryKey(), // cuid2 unique ID
  tmdbId: integer("tmdb_id").notNull(),
  mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),

  // For TV shows only (null for movies)
  seasonNumber: integer("season_number"),
  episodeNumber: integer("episode_number"),

  // Display info
  title: text("title").notNull(), // e.g., "Movie Name" or "Show - S01E01"
  posterPath: text("poster_path"),

  // File info
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"), // bytes, may be null until complete
  quality: text("quality"),

  // Download state
  status: text("status", {
    enum: ["pending", "caching", "downloading", "completed", "failed", "paused"],
  })
    .notNull()
    .default("pending"),
  progress: real("progress").default(0), // 0-100
  streamUrl: text("stream_url").notNull(), // Original URL for retry
  infoHash: text("info_hash"),

  // Timestamps
  addedAt: text("added_at").default(sql`(CURRENT_TIMESTAMP)`),
  completedAt: text("completed_at"),
});

export const DownloadSchema = createSelectSchema(downloadsTable);
export type DownloadRecord = z.infer<typeof DownloadSchema>;

// ============================================
// Custom Lists
// ============================================

/**
 * User-created lists for organizing media.
 * "Watchlist" is a special default list that cannot be deleted.
 */
export const listsTable = sqliteTable("lists", {
  id: text("id").primaryKey(), // cuid2 unique ID
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false), // true for "Watchlist"
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const ListSchema = createSelectSchema(listsTable);
export type ListRecord = z.infer<typeof ListSchema>;

/**
 * Junction table linking media items to lists.
 * A media item can belong to multiple lists.
 */
export const listItemsTable = sqliteTable(
  "list_items",
  {
    listId: text("list_id")
      .notNull()
      .references(() => listsTable.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type", { enum: ["movie", "tv"] }).notNull(),
    addedAt: text("added_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    primaryKey({
      columns: [table.listId, table.tmdbId, table.mediaType],
    }),
  ]
);

export const ListItemSchema = createSelectSchema(listItemsTable);
export type ListItemRecord = z.infer<typeof ListItemSchema>;

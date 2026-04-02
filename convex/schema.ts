import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // TMDB media cache (referenced by favorites, progress, lists, etc.)
  media: defineTable({
    userId: v.id("users"),
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    title: v.string(),
    titleOriginal: v.optional(v.string()),
    imdbId: v.optional(v.string()),
    year: v.optional(v.float64()),
    score: v.optional(v.float64()),
    posterPath: v.optional(v.string()),
    backdropPath: v.optional(v.string()),
    description: v.optional(v.string()),
    genres: v.optional(v.string()), // JSON array as string
    seasonCount: v.optional(v.float64()),
    episodeCount: v.optional(v.float64()),
    updatedAt: v.string(),
  }).index("by_user_media", ["userId", "tmdbId", "mediaType"]),

  // User favorites
  favorites: defineTable({
    userId: v.id("users"),
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    isFavorite: v.boolean(),
    updatedAt: v.string(),
  }).index("by_user_media", ["userId", "tmdbId", "mediaType"]),

  // Watch progress (playback position tracking)
  // Uses -1 sentinel for null seasonNumber/episodeNumber (Convex indexes don't support null)
  watchProgress: defineTable({
    userId: v.id("users"),
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    seasonNumber: v.float64(), // -1 for movies
    episodeNumber: v.float64(), // -1 for movies
    position: v.float64(),
    duration: v.float64(),
    completed: v.boolean(),
    watchedAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_user_progress", [
    "userId",
    "tmdbId",
    "mediaType",
    "seasonNumber",
    "episodeNumber",
  ]),

  // Watchlist items
  watchlist: defineTable({
    userId: v.id("users"),
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    addedAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_user_media", ["userId", "tmdbId", "mediaType"]),

  // Custom lists
  lists: defineTable({
    userId: v.id("users"),
    localId: v.string(), // cuid2 from client
    name: v.string(),
    isDefault: v.boolean(),
    createdAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_user_local", ["userId", "localId"]),

  // List items (junction: list ↔ media)
  listItems: defineTable({
    userId: v.id("users"),
    listLocalId: v.string(),
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    addedAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_user_list_media", [
    "userId",
    "listLocalId",
    "tmdbId",
    "mediaType",
  ]),

  // Download metadata (excludes filePath — device-specific)
  downloadsMeta: defineTable({
    userId: v.id("users"),
    localId: v.string(), // cuid2 from client
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    seasonNumber: v.optional(v.float64()),
    episodeNumber: v.optional(v.float64()),
    title: v.string(),
    posterPath: v.optional(v.string()),
    fileName: v.string(),
    fileSize: v.optional(v.float64()),
    quality: v.optional(v.string()),
    status: v.string(),
    streamUrl: v.string(),
    infoHash: v.optional(v.string()),
    duration: v.optional(v.float64()),
    addedAt: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    updatedAt: v.string(),
  }).index("by_user_local", ["userId", "localId"]),

  // Deletion tracking for cross-device sync
  deletions: defineTable({
    userId: v.id("users"),
    entityType: v.string(), // "favorite" | "progress" | "watchlist" | "list" | "listItem" | "downloadMeta"
    entityKey: v.string(), // composite key matching manual-sync-keys format
    deletedAt: v.string(),
  })
    .index("by_user_type", ["userId", "entityType"])
    .index("by_user_key", ["userId", "entityType", "entityKey"]),
});

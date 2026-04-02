import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const upsertProgress = mutation({
  args: {
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    seasonNumber: v.float64(), // -1 for movies
    episodeNumber: v.float64(), // -1 for movies
    position: v.float64(),
    duration: v.float64(),
    completed: v.boolean(),
    watchedAt: v.optional(v.string()),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("watchProgress")
      .withIndex("by_user_progress", (q) =>
        q
          .eq("userId", userId)
          .eq("tmdbId", args.tmdbId)
          .eq("mediaType", args.mediaType)
          .eq("seasonNumber", args.seasonNumber)
          .eq("episodeNumber", args.episodeNumber)
      )
      .unique();

    if (existing) {
      if (args.updatedAt > (existing.updatedAt ?? "")) {
        await ctx.db.patch(existing._id, { ...args, userId });
      }
    } else {
      await ctx.db.insert("watchProgress", { ...args, userId });
    }
  },
});

export const deleteProgress = mutation({
  args: {
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    seasonNumber: v.float64(),
    episodeNumber: v.float64(),
    deletedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("watchProgress")
      .withIndex("by_user_progress", (q) =>
        q
          .eq("userId", userId)
          .eq("tmdbId", args.tmdbId)
          .eq("mediaType", args.mediaType)
          .eq("seasonNumber", args.seasonNumber)
          .eq("episodeNumber", args.episodeNumber)
      )
      .unique();

    if (existing && args.deletedAt > (existing.updatedAt ?? "")) {
      await ctx.db.delete(existing._id);
    }

    const entityKey = `${args.tmdbId}:${args.mediaType}:${args.seasonNumber === -1 ? "" : args.seasonNumber}:${args.episodeNumber === -1 ? "" : args.episodeNumber}`;

    const existingDeletion = await ctx.db
      .query("deletions")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("entityType", "progress").eq("entityKey", entityKey)
      )
      .unique();

    if (existingDeletion) {
      await ctx.db.patch(existingDeletion._id, { deletedAt: args.deletedAt });
    } else {
      await ctx.db.insert("deletions", {
        userId,
        entityType: "progress",
        entityKey,
        deletedAt: args.deletedAt,
      });
    }
  },
});

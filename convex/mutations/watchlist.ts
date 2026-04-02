import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const upsertWatchlistItem = mutation({
  args: {
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    addedAt: v.optional(v.string()),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("watchlist")
      .withIndex("by_user_media", (q) =>
        q.eq("userId", userId).eq("tmdbId", args.tmdbId).eq("mediaType", args.mediaType)
      )
      .unique();

    if (existing) {
      if (args.updatedAt > (existing.updatedAt ?? "")) {
        await ctx.db.patch(existing._id, { ...args, userId });
      }
    } else {
      await ctx.db.insert("watchlist", { ...args, userId });
    }
  },
});

export const deleteWatchlistItem = mutation({
  args: {
    tmdbId: v.float64(),
    mediaType: v.union(v.literal("movie"), v.literal("tv")),
    deletedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("watchlist")
      .withIndex("by_user_media", (q) =>
        q.eq("userId", userId).eq("tmdbId", args.tmdbId).eq("mediaType", args.mediaType)
      )
      .unique();

    if (existing && args.deletedAt > (existing.updatedAt ?? "")) {
      await ctx.db.delete(existing._id);
    }

    const entityKey = `${args.tmdbId}:${args.mediaType}`;

    const existingDeletion = await ctx.db
      .query("deletions")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("entityType", "watchlist").eq("entityKey", entityKey)
      )
      .unique();

    if (existingDeletion) {
      await ctx.db.patch(existingDeletion._id, { deletedAt: args.deletedAt });
    } else {
      await ctx.db.insert("deletions", {
        userId,
        entityType: "watchlist",
        entityKey,
        deletedAt: args.deletedAt,
      });
    }
  },
});

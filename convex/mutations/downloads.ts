import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const upsertDownloadMeta = mutation({
  args: {
    localId: v.string(),
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("downloadsMeta")
      .withIndex("by_user_local", (q) =>
        q.eq("userId", userId).eq("localId", args.localId)
      )
      .unique();

    if (existing) {
      if (args.updatedAt > (existing.updatedAt ?? "")) {
        await ctx.db.patch(existing._id, { ...args, userId });
      }
    } else {
      await ctx.db.insert("downloadsMeta", { ...args, userId });
    }
  },
});

export const deleteDownloadMeta = mutation({
  args: {
    localId: v.string(),
    deletedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("downloadsMeta")
      .withIndex("by_user_local", (q) =>
        q.eq("userId", userId).eq("localId", args.localId)
      )
      .unique();

    if (existing && args.deletedAt > (existing.updatedAt ?? "")) {
      await ctx.db.delete(existing._id);
    }

    const existingDeletion = await ctx.db
      .query("deletions")
      .withIndex("by_user_key", (q) =>
        q.eq("userId", userId).eq("entityType", "downloadMeta").eq("entityKey", args.localId)
      )
      .unique();

    if (existingDeletion) {
      await ctx.db.patch(existingDeletion._id, { deletedAt: args.deletedAt });
    } else {
      await ctx.db.insert("deletions", {
        userId,
        entityType: "downloadMeta",
        entityKey: args.localId,
        deletedAt: args.deletedAt,
      });
    }
  },
});

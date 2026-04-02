import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const upsertMedia = mutation({
  args: {
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
    genres: v.optional(v.string()),
    seasonCount: v.optional(v.float64()),
    episodeCount: v.optional(v.float64()),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("media")
      .withIndex("by_user_media", (q) =>
        q.eq("userId", userId).eq("tmdbId", args.tmdbId).eq("mediaType", args.mediaType)
      )
      .unique();

    if (existing) {
      if (args.updatedAt > (existing.updatedAt ?? "")) {
        await ctx.db.patch(existing._id, { ...args, userId });
      }
    } else {
      await ctx.db.insert("media", { ...args, userId });
    }
  },
});

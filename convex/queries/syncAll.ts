import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getAllUserData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const [media, favorites, watchProgress, watchlist, lists, listItems, downloadsMeta, deletions] =
      await Promise.all([
        ctx.db
          .query("media")
          .withIndex("by_user_media", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("favorites")
          .withIndex("by_user_media", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("watchProgress")
          .withIndex("by_user_progress", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("watchlist")
          .withIndex("by_user_media", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("lists")
          .withIndex("by_user_local", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("listItems")
          .withIndex("by_user_list_media", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("downloadsMeta")
          .withIndex("by_user_local", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("deletions")
          .withIndex("by_user_type", (q) => q.eq("userId", userId))
          .collect(),
      ]);

    return {
      media,
      favorites,
      watchProgress,
      watchlist,
      lists,
      listItems,
      downloadsMeta,
      deletions,
    };
  },
});

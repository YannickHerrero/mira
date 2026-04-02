import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const upsertList = mutation({
  args: {
    localId: v.string(),
    name: v.string(),
    isDefault: v.boolean(),
    createdAt: v.optional(v.string()),
    updatedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("lists")
      .withIndex("by_user_local", (q) =>
        q.eq("userId", userId).eq("localId", args.localId)
      )
      .unique();

    if (existing) {
      if (args.updatedAt > (existing.updatedAt ?? "")) {
        await ctx.db.patch(existing._id, { ...args, userId });
      }
    } else {
      await ctx.db.insert("lists", { ...args, userId });
    }
  },
});

export const deleteList = mutation({
  args: {
    localId: v.string(),
    deletedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("lists")
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
        q.eq("userId", userId).eq("entityType", "list").eq("entityKey", args.localId)
      )
      .unique();

    if (existingDeletion) {
      await ctx.db.patch(existingDeletion._id, { deletedAt: args.deletedAt });
    } else {
      await ctx.db.insert("deletions", {
        userId,
        entityType: "list",
        entityKey: args.localId,
        deletedAt: args.deletedAt,
      });
    }
  },
});

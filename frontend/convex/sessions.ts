import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return sessions;
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const session = await ctx.db.get("sessions", args.sessionId);
    if (session?.userId !== userId) return null;

    return session;
  },
});

export const create = mutation({
  args: {
    threadId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      userId,
      threadId: args.threadId,
      title: args.title,
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

export const update = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const session = await ctx.db.get("sessions", args.sessionId);
    if (session?.userId !== userId) throw new Error("Not authorized");

    await ctx.db.patch("sessions", args.sessionId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const session = await ctx.db.get("sessions", args.sessionId);
    if (session?.userId !== userId) throw new Error("Not authorized");

    await ctx.db.delete("sessions", args.sessionId);
  },
});

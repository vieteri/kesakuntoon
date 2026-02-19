import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Return all groups the given user is a member of, with today's leaderboard size.
export const getMyGroups = query({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) return [];

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user_chat", (q: any) => q.eq("userId", user._id))
      .collect();

    const today = new Date().toISOString().split("T")[0];

    return await Promise.all(
      memberships.map(async (m: any) => {
        // Count distinct users who logged workouts in this group today
        const workouts = await ctx.db
          .query("workouts")
          .withIndex("by_chat_date", (q: any) => q.eq("chatId", m.chatId).eq("date", today))
          .collect();
        const activeToday = new Set(workouts.map((w: any) => w.userId.toString())).size;
        return {
          chatId: m.chatId,
          chatTitle: m.chatTitle,
          joinedAt: m.joinedAt,
          activeToday,
        };
      })
    );
  },
});

// Auto-link a user to a group when they send any message in the group.
// Does nothing if the user is not a known app user.
export const autoLinkUser = mutation({
  args: {
    telegramId: v.number(),
    firstName: v.string(),
    username: v.optional(v.string()),
    chatId: v.number(),
    chatTitle: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) return; // Not a known app user — nothing to do

    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_user_chat", (q: any) =>
        q.eq("userId", user._id).eq("chatId", args.chatId)
      )
      .first();

    if (!existingMembership) {
      await ctx.db.insert("groupMembers", {
        chatId: args.chatId,
        chatTitle: args.chatTitle,
        userId: user._id,
        joinedAt: Date.now(),
      });
    } else if (args.chatTitle && existingMembership.chatTitle !== args.chatTitle) {
      // Update title if it changed
      await ctx.db.patch(existingMembership._id, { chatTitle: args.chatTitle });
    }
  },
});

// When the bot is added to a group, scan all known app users against the group
// by calling getChatMember for each, and upsert membership for those found.
export const scanUsersIntoGroup = mutation({
  args: {
    chatId: v.number(),
    chatTitle: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return;

    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      let status: string;
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${args.chatId}&user_id=${user.telegramId}`
        );
        const data: any = await res.json();
        status = data?.result?.status;
      } catch {
        continue;
      }

      if (status === "member" || status === "administrator" || status === "creator") {
        const existingMembership = await ctx.db
          .query("groupMembers")
          .withIndex("by_user_chat", (q: any) =>
            q.eq("userId", user._id).eq("chatId", args.chatId)
          )
          .first();

        if (!existingMembership) {
          await ctx.db.insert("groupMembers", {
            chatId: args.chatId,
            chatTitle: args.chatTitle,
            userId: user._id,
            joinedAt: Date.now(),
          });
        } else if (args.chatTitle && existingMembership.chatTitle !== args.chatTitle) {
          await ctx.db.patch(existingMembership._id, { chatTitle: args.chatTitle });
        }
      }
    }
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateTelegramWebAppData } from "./auth";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const VALID_WORKOUT_TYPES = ["pushup", "squat", "situp"];

// Log a new workout (and create user if not exists)
export const logWorkout = mutation({
  args: {
    initData: v.string(), // We validate this instead of trusting args
    type: v.string(), // "pushup", "squat", "situp"
    count: v.number(),
    // We can trust date or derive it from server time, but let's keep it for now
    // Actually, usually safer to use server time for logging unless offline sync
    date: v.optional(v.string()),
    chatId: v.optional(v.number()), // undefined = solo mode, number = group chat
  },
  handler: async (ctx: any, args: any) => {
    // 0. Auth Validation
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      throw new Error("Server configuration error: BOT_TOKEN missing");
    }

    const userData = await validateTelegramWebAppData(args.initData, botToken);
    if (!userData || !userData.user) {
      throw new Error("Invalid or expired Telegram data");
    }

    const telegramId = userData.user.id;
    const firstName = userData.user.first_name;
    const username = userData.user.username;

    // 0b. Input Validation
    if (!VALID_WORKOUT_TYPES.includes(args.type)) {
      throw new Error(`Invalid workout type. Must be one of: ${VALID_WORKOUT_TYPES.join(", ")}`);
    }

    if (args.count <= 0) {
      throw new Error("Count must be greater than 0");
    }

    // 1. Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", telegramId))
      .first();

    let userId = existingUser?._id;

    // 2. If not, create user
    if (!userId) {
      userId = await ctx.db.insert("users", {
        telegramId,
        firstName,
        username,
        joinedAt: Date.now(),
      });
    } else if (existingUser) {
      // 2b. Check if user details changed and update if necessary
      if (existingUser.firstName !== firstName || existingUser.username !== username) {
        await ctx.db.patch(existingUser._id, {
          firstName,
          username,
        });
      }
    }

    // 3. If chatId provided, auto-join groupMembers (upsert)
    if (args.chatId !== undefined) {
      const existingMembership = await ctx.db
        .query("groupMembers")
        .withIndex("by_user_chat", (q: any) =>
          q.eq("userId", userId).eq("chatId", args.chatId)
        )
        .first();

      if (!existingMembership) {
        await ctx.db.insert("groupMembers", {
          chatId: args.chatId,
          userId,
          joinedAt: Date.now(),
        });
      }
    }

    // 4. Log the workout
    await ctx.db.insert("workouts", {
      userId,
      type: args.type,
      count: args.count,
      date: args.date || new Date().toISOString().split("T")[0],
      timestamp: Date.now(),
      ...(args.chatId !== undefined ? { chatId: args.chatId } : {}),
    });

    // 5. Announce to group if chatId provided
    if (args.chatId !== undefined) {
      const typeEmoji: Record<string, string> = { pushup: "💪", squat: "🦵", situp: "🔥" };
      const typeLabel: Record<string, string> = { pushup: "pushups", squat: "squats", situp: "situps" };
      const emoji = typeEmoji[args.type] ?? "🏋️";
      const label = typeLabel[args.type] ?? args.type;
      const name = username ? `@${username}` : firstName;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: args.chatId,
          text: `${emoji} <b>${escapeHtml(name)}</b> just did <b>${args.count} ${label}</b>!`,
          parse_mode: "HTML",
        }),
      });
    }

    return { success: true, userId };
  },
});

// Get aggregated stats for a user
export const getMyStats = query({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    // 1. Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) {
      return { pushup: 0, squat: 0, situp: 0 };
    }

    // 2. Get all workouts
    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q: any) => q.eq("userId", user._id))
      .collect();

    // 3. Aggregate
    const stats = workouts.reduce(
      (acc: any, w: any) => {
        acc[w.type] = (acc[w.type] || 0) + w.count;
        return acc;
      },
      { pushup: 0, squat: 0, situp: 0 } as Record<string, number>
    );

    return stats;
  },
});

// Get today's stats for a user
export const getMyTodayStats = query({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) {
      return { pushup: 0, squat: 0, situp: 0 };
    }

    const today = new Date().toISOString().split("T")[0];

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q: any) => q.eq("userId", user._id).eq("date", today))
      .collect();

    const stats = workouts.reduce(
      (acc: any, w: any) => {
        acc[w.type] = (acc[w.type] || 0) + w.count;
        return acc;
      },
      { pushup: 0, squat: 0, situp: 0 } as Record<string, number>
    );

    return stats;
  },
});

// Get recent workouts for the user
export const getRecentWorkouts = query({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) {
      return [];
    }

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .take(10);

    return workouts;
  },
});

// Get last 7 days of stats for a user (for charts)
export const getMyWeeklyStats = query({
  args: { telegramId: v.number() },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", args.telegramId))
      .first();
    if (!user) return [];

    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }

    const results = await Promise.all(days.map(async (date) => {
      const workouts = await ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q: any) => q.eq("userId", user._id).eq("date", date))
        .collect();
      const totals = workouts.reduce(
        (acc: any, w: any) => { acc[w.type] = (acc[w.type] || 0) + w.count; return acc; },
        { pushup: 0, squat: 0, situp: 0 }
      );
      return { date, ...totals };
    }));

    return results;
  },
});

// Get leaderboard: per-exercise counts for today, for all members of a group (regardless of chatId on workout)
export const getLeaderboard = query({
  args: { chatId: v.number() },
  handler: async (ctx: any, args: any) => {
    const today = new Date().toISOString().split("T")[0];

    // 1. Get all members of this group
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_chat", (q: any) => q.eq("chatId", args.chatId))
      .collect();

    if (!members.length) return [];

    // 2. For each member, fetch today's workouts (regardless of chatId)
    const results: Record<string, { pushup: number; squat: number; situp: number; name: string; telegramId: number }> = {};

    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      if (!user) continue;

      const workouts = await ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q: any) => q.eq("userId", member.userId).eq("date", today))
        .collect();

      const counts = { pushup: 0, squat: 0, situp: 0 };
      for (const w of workouts) {
        counts[w.type as "pushup" | "squat" | "situp"] += w.count;
      }

      if (counts.pushup + counts.squat + counts.situp > 0) {
        results[member.userId.toString()] = {
          name: user.firstName,
          telegramId: user.telegramId,
          ...counts,
        };
      }
    }

    return Object.values(results).map((r) => ({ ...r, total: r.pushup + r.squat + r.situp }));
  },
});

// Get all group members' today progress vs their personal targets (for /goals bot command)
export const getGoalsProgress = query({
  args: { chatId: v.number() },
  handler: async (ctx: any, args: any) => {
    const today = new Date().toISOString().split("T")[0];

    // 1. Get all members of this group
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_chat", (q: any) => q.eq("chatId", args.chatId))
      .collect();

    if (!members.length) return [];

    // 2. For each member, fetch today's workouts (regardless of chatId)
    const entries = [];
    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      if (!user) continue;

      const workouts = await ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q: any) => q.eq("userId", member.userId).eq("date", today))
        .collect();

      const done = { pushup: 0, squat: 0, situp: 0 };
      for (const w of workouts) {
        done[w.type as "pushup" | "squat" | "situp"] += w.count;
      }

      entries.push({
        name: user.firstName,
        telegramId: user.telegramId,
        pushup: done.pushup,
        squat: done.squat,
        situp: done.situp,
        targetPushup: user.targetPushup ?? 50,
        targetSquat: user.targetSquat ?? 50,
        targetSitup: user.targetSitup ?? 50,
      });
    }

    return entries;
  },
});

// Get targets for a user
export const getMyTargets = query({
  args: {
    telegramId: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) {
      return {};
    }

    return {
      targetPushup: user.targetPushup,
      targetSquat: user.targetSquat,
      targetSitup: user.targetSitup,
    };
  },
});

// Set targets for a user
export const setMyTargets = mutation({
  args: {
    initData: v.string(),
    targetPushup: v.number(),
    targetSquat: v.number(),
    targetSitup: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      throw new Error("Server configuration error: BOT_TOKEN missing");
    }

    const userData = await validateTelegramWebAppData(args.initData, botToken);
    if (!userData || !userData.user) {
      throw new Error("Invalid or expired Telegram data");
    }

    const telegramId = userData.user.id;

    if (args.targetPushup < 1 || args.targetPushup > 9999 ||
      args.targetSquat < 1 || args.targetSquat > 9999 ||
      args.targetSitup < 1 || args.targetSitup > 9999) {
      throw new Error("Targets must be between 1 and 9999");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", telegramId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        targetPushup: args.targetPushup,
        targetSquat: args.targetSquat,
        targetSitup: args.targetSitup,
      });
    } else {
      await ctx.db.insert("users", {
        telegramId,
        firstName: userData.user.first_name,
        username: userData.user.username,
        joinedAt: Date.now(),
        targetPushup: args.targetPushup,
        targetSquat: args.targetSquat,
        targetSitup: args.targetSitup,
      });
    }

    return { success: true };
  },
});

// Delete a workout (must belong to the authenticated user)
export const deleteWorkout = mutation({
  args: {
    initData: v.string(),
    workoutId: v.id("workouts"),
  },
  handler: async (ctx: any, args: any) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error("Server configuration error: BOT_TOKEN missing");

    const userData = await validateTelegramWebAppData(args.initData, botToken);
    if (!userData?.user) throw new Error("Invalid or expired Telegram data");

    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", userData.user.id))
      .first();
    if (!user) throw new Error("User not found");

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId.toString() !== user._id.toString()) throw new Error("Not authorized");

    await ctx.db.delete(args.workoutId);
    return { success: true };
  },
});

// Edit a workout's count (must belong to the authenticated user)
export const editWorkout = mutation({
  args: {
    initData: v.string(),
    workoutId: v.id("workouts"),
    count: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error("Server configuration error: BOT_TOKEN missing");

    const userData = await validateTelegramWebAppData(args.initData, botToken);
    if (!userData?.user) throw new Error("Invalid or expired Telegram data");

    if (!Number.isInteger(args.count) || args.count < 0 || args.count > 9999) {
      throw new Error("Count must be a whole number between 0 and 9999");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", userData.user.id))
      .first();
    if (!user) throw new Error("User not found");

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) throw new Error("Workout not found");
    if (workout.userId.toString() !== user._id.toString()) throw new Error("Not authorized");

    await ctx.db.patch(args.workoutId, { count: args.count });
    return { success: true };
  },
});

// Compute streak: consecutive completed days (all 3 targets hit) ending today
export const getMyStreak = query({
  args: { telegramId: v.number() },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegramId", (q: any) => q.eq("telegramId", args.telegramId))
      .first();

    if (!user) return { streak: 0, completedToday: false };

    const targetPushup = user.targetPushup ?? 50;
    const targetSquat = user.targetSquat ?? 50;
    const targetSitup = user.targetSitup ?? 50;

    let streak = 0;
    let completedToday = false;

    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0];

      const workouts = await ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q: any) => q.eq("userId", user._id).eq("date", date))
        .collect();

      const totals = workouts.reduce(
        (acc: any, w: any) => { acc[w.type] = (acc[w.type] || 0) + w.count; return acc; },
        { pushup: 0, squat: 0, situp: 0 }
      );

      const dayDone =
        totals.pushup >= targetPushup &&
        totals.squat >= targetSquat &&
        totals.situp >= targetSitup;

      if (!dayDone) break;

      streak++;
      if (i === 0) completedToday = true;
    }

    return { streak, completedToday };
  },
});

// Get global community stats
export const getGlobalStats = query({
  args: {},
  handler: async (ctx: any) => {
    // Note: In production with millions of rows, consider using aggregations or periodic jobs.
    // For MVP, collecting all is fine or optimize with pagination.
    const allWorkouts = await ctx.db.query("workouts").collect();

    const total = allWorkouts.reduce((acc: any, w: any) => acc + w.count, 0);

    return { totalCount: total };
  },
});

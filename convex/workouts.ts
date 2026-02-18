import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateTelegramWebAppData } from "./auth";

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

    // 3. Log the workout
    await ctx.db.insert("workouts", {
      userId,
      type: args.type,
      count: args.count,
      date: args.date || new Date().toISOString().split("T")[0],
      timestamp: Date.now(),
    });

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

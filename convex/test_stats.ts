
import { query } from "./_generated/server";

export const testGlobalStats = query({
  args: {},
  handler: async (ctx) => {
    const allWorkouts = await ctx.db.query("workouts").collect();
    console.log("Workouts found:", allWorkouts.length);
    const total = allWorkouts.reduce((acc: any, w: any) => acc + w.count, 0);
    return { totalCount: total };
  },
});

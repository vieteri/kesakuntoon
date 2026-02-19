import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (Telegram ID:n mukaan)
  users: defineTable({
    telegramId: v.number(),
    firstName: v.string(),
    username: v.optional(v.string()),
    joinedAt: v.number(), // Timestamp
    targetPushup: v.optional(v.number()),
    targetSquat: v.optional(v.number()),
    targetSitup: v.optional(v.number()),
  }).index("by_telegramId", ["telegramId"]),

  // Group membership join table — auto-populated on first use from each group
  groupMembers: defineTable({
    chatId:    v.number(),            // Telegram group chat ID
    chatTitle: v.optional(v.string()), // Group name, if known
    userId:    v.id("users"),
    joinedAt:  v.number(),
  })
  .index("by_chat",      ["chatId"])
  .index("by_user_chat", ["userId", "chatId"]),

  // Treenisuoritukset
  workouts: defineTable({
    userId:    v.id("users"),        // Linkki käyttäjään
    chatId:    v.optional(v.number()), // null/undefined = logged in solo mode
    type:      v.string(),           // "pushup", "squat", "situp"
    count:     v.number(),
    date:      v.string(),           // YYYY-MM-DD (Helpottaa ryhmittelyä)
    timestamp: v.number(),           // Tarkka aika
  })
  .index("by_user_date", ["userId", "date"])  // Tehokas haku päivittäisille tilastoille
  .index("by_date",      ["date"])            // Globaalit tilastot
  .index("by_chat_date", ["chatId", "date"]), // Per-group leaderboard
});

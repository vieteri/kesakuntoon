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

  // Treenisuoritukset
  workouts: defineTable({
    userId: v.id("users"), // Linkki käyttäjään
    type: v.string(), // "pushup", "squat", "situp"
    count: v.number(),
    date: v.string(), // YYYY-MM-DD (Helpottaa ryhmittelyä)
    timestamp: v.number(), // Tarkka aika
  })
  .index("by_user_date", ["userId", "date"]) // Tehokas haku päivittäisille tilastoille
  .index("by_date", ["date"]), // Globaalit tilastot
});

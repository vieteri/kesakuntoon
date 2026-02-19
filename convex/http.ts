import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Telegram Bot webhook — receives updates from Telegram
http.route({
  path: "/telegram-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      return new Response("BOT_TOKEN not configured", { status: 500 });
    }

    let update: any;
    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const message = update?.message;
    if (!message) return new Response("OK", { status: 200 });

    const chatId = message.chat?.id;
    const chatType: string = message.chat?.type || "private";
    const text: string = message.text || "";
    const cmd = text.split("@")[0].trim(); // strip bot username suffix

    const send = async (msg: string, extra: Record<string, unknown> = {}, parseMode = "HTML") => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: parseMode, ...extra }),
      });
    };

    if (cmd === "/leaderboard" || cmd === "/top") {
      if (chatType === "private") {
        await send("🏋️ Add me to a group chat and use <b>/leaderboard</b> there to see the group leaderboard!");
      } else {
        const board: any[] = await ctx.runQuery(api.workouts.getLeaderboard, { chatId });
        if (!board.length) {
          await send("No workouts logged today yet. Be the first! 💪");
        } else {
          const medals = ["🥇", "🥈", "🥉"];
          const section = (title: string, key: "pushup" | "squat" | "situp") => {
            const sorted = [...board].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).filter(u => u[key] > 0);
            if (!sorted.length) return `${title}\n<i>No entries yet</i>`;
            return title + "\n" + sorted.map((u, i) =>
              `${medals[i] ?? `${i + 1}.`} <b>${escapeHtml(u.name)}</b> — ${u[key]} reps`
            ).join("\n");
          };
          await send(
            `🏆 <b>Today's Leaderboard</b>\n\n` +
            section("💪 <b>Pushups</b>", "pushup") + "\n\n" +
            section("🦵 <b>Squats</b>", "squat") + "\n\n" +
            section("🔥 <b>Situps</b>", "situp")
          );
        }
      }
    } else if (cmd === "/goals" || cmd === "/progress") {
      if (chatType === "private") {
        await send("📊 Add me to a group chat and use <b>/goals</b> there to see everyone's progress!");
      } else {
        const progress: any[] = await ctx.runQuery(api.workouts.getGoalsProgress, { chatId });
        if (!progress.length) {
          await send("No workouts logged today yet. Start now! 🏃");
        } else {
          const lines = progress.map((u) => {
            const pct = (done: number, target: number) =>
              Math.min(100, target > 0 ? Math.round((done / target) * 100) : 100);
            const line = (emoji: string, label: string, done: number, target: number) =>
              `${emoji} ${label}: ${done}/${target} ${progressBar(pct(done, target))}`;
            return (
              `<b>${escapeHtml(u.name)}</b>\n` +
              line("💪", "Pushups", u.pushup, u.targetPushup) + "\n" +
              line("🦵", "Squats", u.squat, u.targetSquat) + "\n" +
              line("🔥", "Situps", u.situp, u.targetSitup)
            );
          });
          await send(`📊 <b>Today's Goals</b>\n\n${lines.join("\n\n")}`);
        }
      }
    } else if (cmd === "/stats" || cmd === "/week") {
      // Community weekly totals
      const globalStats: any = await ctx.runQuery(api.workouts.getGlobalStats);
      await send(
        `📈 <b>Community Stats</b>\n\nTotal reps logged: <b>${globalStats?.totalCount?.toLocaleString() ?? 0}</b>\n\nTip: Log your reps in the Kesakuntoon mini app! 💪`
      );
    } else if (cmd === "/streaks") {
      await send("🔥 Streak tracking coming soon! Keep logging daily to build your streak.");
    } else if (cmd === "/workout") {
      await send("Let's get fit! 💪 Track your progress:", {
        reply_markup: {
          inline_keyboard: [[
            { text: "Open Workout Tracker 🏋️", web_app: { url: "https://kesakuntoon.viet.fi" } }
          ]]
        }
      });
    } else if (cmd === "/help" || cmd === "/start") {
      await send(
        `👋 <b>Kesakuntoon Bot</b>\n\nAvailable commands:\n` +
        `/workout — Open the workout tracker app\n` +
        `/leaderboard — Today's top performers\n` +
        `/goals — Everyone's progress toward goals\n` +
        `/stats — Community total reps\n` +
        `/streaks — Daily streak leaderboard\n` +
        `/help — This message`
      );
    }

    return new Response("OK", { status: 200 });
  }),
});

// Register the webhook with Telegram (call this once via GET /register-webhook)
http.route({
  path: "/register-webhook",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return new Response("BOT_TOKEN missing", { status: 500 });

    const url = new URL(request.url);
    const webhookUrl = `${url.origin}/telegram-webhook`;

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    const json = await res.json();
    return new Response(JSON.stringify(json, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;

// ---- helpers ----
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function progressBar(pct: number) {
  const filled = Math.round(pct / 10);
  return "▓".repeat(filled) + "░".repeat(10 - filled) + ` ${pct}%`;
}

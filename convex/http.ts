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
    const text: string = message.text || "";
    const cmd = text.split("@")[0].trim(); // strip bot username suffix

    const send = async (msg: string, parseMode = "HTML") => {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: parseMode }),
      });
    };

    if (cmd === "/leaderboard" || cmd === "/top") {
      const board: any[] = await ctx.runQuery(api.workouts.getLeaderboard);
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
          section("🦵 <b>Squats</b>",  "squat")  + "\n\n" +
          section("🔥 <b>Situps</b>",  "situp")
        );
      }
    } else if (cmd === "/goals" || cmd === "/progress") {
      // Show goal completion % for all users who have logged today
      const today = new Date().toISOString().split("T")[0];
      const board: any[] = await ctx.runQuery(api.workouts.getLeaderboard);
      if (!board.length) {
        await send("No workouts logged today yet. Start now! 🏃");
      } else {
        const lines = board.map((u) => {
          const bar = progressBar(Math.min(100, Math.round((u.total / 150) * 100)));
          return `<b>${escapeHtml(u.name)}</b>\n${bar} ${u.total} reps`;
        });
        await send(`📊 <b>Today's Progress</b>\n\n${lines.join("\n\n")}`);
      }
    } else if (cmd === "/stats" || cmd === "/week") {
      // Community weekly totals
      const globalStats: any = await ctx.runQuery(api.workouts.getGlobalStats);
      await send(
        `📈 <b>Community Stats</b>\n\nTotal reps logged: <b>${globalStats?.totalCount?.toLocaleString() ?? 0}</b>\n\nTip: Log your reps in the Kesakuntoon mini app! 💪`
      );
    } else if (cmd === "/streaks") {
      await send("🔥 Streak tracking coming soon! Keep logging daily to build your streak.");
    } else if (cmd === "/help" || cmd === "/start") {
      await send(
        `👋 <b>Kesakuntoon Bot</b>\n\nAvailable commands:\n` +
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

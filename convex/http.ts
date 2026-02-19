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



    // Bot added to a group — scan known users
    const myChatMember = update?.my_chat_member;
    if (myChatMember) {
      const newStatus = myChatMember.new_chat_member?.status;
      const groupChatId: number = myChatMember.chat?.id;
      if (groupChatId && (newStatus === "member" || newStatus === "administrator")) {
        await ctx.runMutation(api.groups.scanUsersIntoGroup, {
          chatId: groupChatId,
          chatTitle: myChatMember.chat?.title,
        });
      }
      return new Response("OK", { status: 200 });
    }

    const message = update?.message;
    if (!message) return new Response("OK", { status: 200 });

    const chatId = message.chat?.id;
    const chatType: string = message.chat?.type || "private";
    const text: string = message.text || "";
    const cmd = text.split("@")[0].trim(); // strip bot username suffix

    // Auto-link sender to group if they're a known app user
    if (chatType !== "private" && message.from) {
      try {
        await ctx.runMutation(api.groups.autoLinkUser, {
          telegramId: message.from.id,
          firstName: message.from.first_name,
          username: message.from.username,
          chatId,
          chatTitle: message.chat?.title,
        });
      } catch { /* non-fatal */ }
    }

    // Auto-link any users joining the group
    if (message.new_chat_members?.length) {
      for (const member of message.new_chat_members) {
        try {
          await ctx.runMutation(api.groups.autoLinkUser, {
            telegramId: member.id,
            firstName: member.first_name,
            username: member.username,
            chatId,
            chatTitle: message.chat?.title,
          });
        } catch { /* non-fatal */ }
      }
    }

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
    } else if (cmd === "/scan") {
      if (chatType === "private") {
        await send("⚠️ Use /scan in a group chat to scan members into the leaderboard.");
      } else {
        await ctx.runMutation(api.groups.scanUsersIntoGroup, {
          chatId,
          chatTitle: message.chat?.title,
        });
        await send("✅ Scanning group members into the leaderboard...");
      }
    } else if (cmd === "/workout") {
      if (chatType === "private") {
        await send("Let's get fit! 💪 Track your progress:", {
          reply_markup: {
            inline_keyboard: [[
              { text: "Open Workout Tracker 🏋️", web_app: { url: "https://kesakuntoon.viet.fi" } },
            ]]
          }
        });
      } else {
        await send(`💪 To open the workout tracker:\n\nTap <b>KesäkuntoonBot</b> at the top of the chat → <b>Open App</b>`);
      }
    } else if (cmd === "/setmenubutton" || cmd === "/sendmenubutton") {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          menu_button: {
            type: "web_app",
            text: "Workout Tracker 🏋️",
            web_app: { url: "https://kesakuntoon.viet.fi" },
          },
        }),
      });
      const j: any = await res.json();
      await send(j.ok ? "✅ Menu button set for this group!" : `❌ Failed: ${j.description}`);
    } else if (cmd === "/setcommands") {
      const commands = [
        { command: "workout", description: "Open the workout tracker app" },
        { command: "leaderboard", description: "Today's top performers" },
        { command: "goals", description: "Everyone's progress toward goals" },
        { command: "stats", description: "Community total reps" },
        { command: "streaks", description: "Daily streak leaderboard" },
        { command: "scan", description: "Scan group members into the leaderboard" },
        { command: "help", description: "Show available commands" },
      ];
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands }),
      });
      const j: any = await res.json();
      await send(j.ok ? "✅ Commands updated!" : `❌ Failed: ${j.description}`);
    } else if (cmd === "/help" || cmd === "/start") {
      await send(
        `👋 <b>Kesakuntoon Bot</b>\n\nAvailable commands:\n` +
        `/workout — Open the workout tracker app\n` +
        `/leaderboard — Today's top performers\n` +
        `/goals — Everyone's progress toward goals\n` +
        `/stats — Community total reps\n` +
        `/streaks — Daily streak leaderboard\n` +
        `/scan — Scan group members into the leaderboard\n` +
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
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "my_chat_member", "chat_member"],
        }),
      }
    );
    const json = await res.json();
    return new Response(JSON.stringify(json, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Manually trigger group user scan: GET /scan-group?chat_id=<chatId>
// Use this to retroactively link all known users to a group.
http.route({
  path: "/scan-group",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const chatIdStr = url.searchParams.get("chat_id");
    if (!chatIdStr) return new Response("Missing chat_id param", { status: 400 });
    const chatId = parseInt(chatIdStr, 10);
    if (isNaN(chatId)) return new Response("Invalid chat_id", { status: 400 });

    // Fetch chat title via Telegram API
    const botToken = process.env.BOT_TOKEN;
    let chatTitle: string | undefined;
    if (botToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`);
        const data: any = await res.json();
        chatTitle = data?.result?.title;
      } catch { /* ignore */ }
    }

    await ctx.runMutation(api.groups.scanUsersIntoGroup, { chatId, chatTitle });
    return new Response(JSON.stringify({ ok: true, chatId, chatTitle }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Set bot commands: GET /set-commands
http.route({
  path: "/set-commands",
  method: "GET",
  handler: httpAction(async (_ctx, _request) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) return new Response("BOT_TOKEN missing", { status: 500 });

    const commands = [
      { command: "workout", description: "Open the workout tracker app" },
      { command: "leaderboard", description: "Today's top performers" },
      { command: "goals", description: "Everyone's progress toward goals" },
      { command: "stats", description: "Community total reps" },
      { command: "streaks", description: "Daily streak leaderboard" },
      { command: "scan", description: "Scan group members into the leaderboard" },
      { command: "help", description: "Show available commands" },
    ];

    const res = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
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

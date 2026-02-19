"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const ITEM_H = 40;
const VISIBLE = 5;
const CONTAINER_H = ITEM_H * VISIBLE;
const PAD = (CONTAINER_H - ITEM_H) / 2;
const MIN_VAL = 0;
const MAX_VAL = 200;

function hapticTick() {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) { tg.HapticFeedback.impactOccurred("light"); return; }
  } catch {}
  try { navigator.vibrate?.(6); } catch {}
}

function DrumPicker({
  value,
  onChange,
  accentColor,
  disabled,
  cardBg,
}: {
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
  disabled: boolean;
  cardBg: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHapticValueRef = useRef(value);

  const scrollToValue = useCallback((val: number, smooth: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: (val - MIN_VAL) * ITEM_H, behavior: smooth ? "smooth" : "instant" });
  }, []);

  useEffect(() => {
    scrollToValue(value, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isScrollingRef.current) scrollToValue(value, true);
  }, [value, scrollToValue]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isScrollingRef.current = true;
    const currentRaw = Math.round(el.scrollTop / ITEM_H) + MIN_VAL;
    const clamped = Math.max(MIN_VAL, Math.min(MAX_VAL, currentRaw));
    if (clamped !== lastHapticValueRef.current) {
      lastHapticValueRef.current = clamped;
      hapticTick();
    }
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      const raw = Math.round(el.scrollTop / ITEM_H) + MIN_VAL;
      const snapped = Math.max(MIN_VAL, Math.min(MAX_VAL, raw));
      el.scrollTo({ top: (snapped - MIN_VAL) * ITEM_H, behavior: "smooth" });
      onChange(snapped);
    }, 80);
  };

  const items = Array.from({ length: MAX_VAL - MIN_VAL + 1 }, (_, i) => i + MIN_VAL);

  return (
    <div className="relative select-none" style={{ width: 80, height: CONTAINER_H, overflow: "hidden" }}>
      {/* Highlight stripe */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 rounded-lg"
        style={{ top: PAD, height: ITEM_H, border: `2px solid ${accentColor}`, background: `${accentColor}15` }}
      />
      {/* Scroll container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll overflow-x-hidden"
        style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none", touchAction: "pan-y", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div style={{ height: PAD }} />
        {items.map((n) => {
          const dist = Math.abs(n - value);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : dist === 2 ? 0.2 : 0.08;
          const fontSize = dist === 0 ? 24 : dist === 1 ? 17 : 15;
          return (
            <div
              key={n}
              onClick={() => { if (disabled) return; hapticTick(); onChange(n); scrollToValue(n, true); }}
              style={{
                height: ITEM_H, scrollSnapAlign: "center", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: disabled ? "default" : "pointer", opacity,
                transition: "opacity 0.1s, font-size 0.1s", fontWeight: dist === 0 ? 700 : 400,
                fontSize, fontVariantNumeric: "tabular-nums",
                color: dist === 0 ? accentColor : "#71717a",
                letterSpacing: dist === 0 ? "-0.5px" : "0",
              }}
            >
              {n}
            </div>
          );
        })}
        <div style={{ height: PAD }} />
      </div>
      {/* Fades */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-20" style={{ height: PAD, background: `linear-gradient(to bottom, ${cardBg} 20%, transparent 100%)` }} />
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-20" style={{ height: PAD, background: `linear-gradient(to top, ${cardBg} 20%, transparent 100%)` }} />
    </div>
  );
}

// Remove static import of Telegram SDK
// import { retrieveLaunchParams } from "@telegram-apps/sdk-react";

const DEFAULT_TARGETS = { pushup: 50, squat: 50, situp: 50 };

const HYPE_MESSAGES = {
  pushup: ["Pushup king!", "Chest day conquered!", "Arms of steel!"],
  squat:  ["Leg day done!", "Squat god!", "Those quads though!"],
  situp:  ["Core of iron!", "Six-pack loading!", "Abs are made today!"],
};

// Theme tokens
const THEMES = {
  dark: {
    bg:           "bg-[#0f0f0f]",
    card:         "bg-[#1a1a1a]",
    cardBg:       "#1a1a1a",
    border:       "border-[#2a2a2a]",
    borderHype:   { pushup: "border-blue-500", squat: "border-green-500", situp: "border-orange-500" },
    divider:      "border-[#222]",
    textPrimary:  "text-[#f0f0f0]",
    textSecond:   "text-zinc-400",
    textMuted:    "text-zinc-600",
    textAccent:   { pushup: "text-blue-400", squat: "text-green-400", situp: "text-orange-400" },
    inputBg:      "bg-[#111] border-[#333] text-[#f0f0f0]",
    settingsBtn:  "hover:bg-[#222] active:scale-95",
    saveBtn:      "bg-[#f0f0f0] text-[#0f0f0f]",
    cancelBtn:    "border-[#333] text-zinc-300",
    editBtn:      "text-zinc-500 hover:text-blue-400 hover:bg-blue-950",
    deleteBtn:    "text-zinc-500 hover:text-red-400 hover:bg-red-950",
    modalBg:      "bg-[#1a1a1a]",
    progressTrack:"bg-[#2a2a2a]",
  },
  light: {
    bg:           "bg-gray-50",
    card:         "bg-white",
    cardBg:       "#ffffff",
    border:       "border-gray-100",
    borderHype:   { pushup: "border-blue-400", squat: "border-green-400", situp: "border-orange-400" },
    divider:      "border-gray-50",
    textPrimary:  "text-gray-900",
    textSecond:   "text-gray-500",
    textMuted:    "text-gray-400",
    textAccent:   { pushup: "text-blue-600", squat: "text-green-600", situp: "text-orange-500" },
    inputBg:      "bg-white border-gray-300 text-gray-900",
    settingsBtn:  "hover:bg-gray-200 active:scale-95",
    saveBtn:      "bg-gray-800 text-white",
    cancelBtn:    "border-gray-300 text-gray-700",
    editBtn:      "text-gray-400 hover:text-blue-500 hover:bg-blue-50",
    deleteBtn:    "text-gray-400 hover:text-red-500 hover:bg-red-50",
    modalBg:      "bg-white",
    progressTrack:"bg-gray-100",
  },
} as const;

type ThemeKey = keyof typeof THEMES;

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardSection({ leaderboard, t, exerciseConfig }: {
  leaderboard: any[] | undefined;
  t: (typeof THEMES)[ThemeKey];
  exerciseConfig: Record<string, { label: string; color: string; accentHex: string }>;
}) {
  const [activeTab, setActiveTab] = useState<"pushup" | "squat" | "situp">("pushup");
  const tabs: { key: "pushup" | "squat" | "situp"; label: string }[] = [
    { key: "pushup", label: "Pushups" },
    { key: "squat",  label: "Squats"  },
    { key: "situp",  label: "Situps"  },
  ];

  const sorted = leaderboard
    ? [...leaderboard].sort((a, b) => (b[activeTab] ?? 0) - (a[activeTab] ?? 0)).filter(u => u[activeTab] > 0)
    : undefined;

  const cfg = exerciseConfig[activeTab];

  return (
    <div className="w-full max-w-md mb-8">
      <h2 className={`text-lg font-semibold ${t.textSecond} mb-3`}>Today's Leaderboard</h2>
      {/* Tabs */}
      <div className={`flex rounded-xl overflow-hidden border ${t.border} mb-0`}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const tabCfg = exerciseConfig[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-semibold transition ${
                isActive
                  ? `${tabCfg.color} text-white`
                  : `${t.card} ${t.textSecond}`
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className={`${t.card} rounded-b-xl border-x border-b ${t.border} overflow-hidden`}>
        {!sorted ? (
          <div className={`p-4 text-center ${t.textMuted}`}>Loading...</div>
        ) : sorted.length === 0 ? (
          <div className={`p-4 text-center ${t.textMuted}`}>No {cfg.label.toLowerCase()} logged today.</div>
        ) : sorted.map((u: any, i: number) => (
          <div key={u.telegramId} className={`px-4 py-3 flex items-center gap-3 border-b ${t.divider} last:border-0`}>
            <span className="text-lg w-7 text-center shrink-0">{MEDALS[i] ?? `${i + 1}`}</span>
            <span className={`flex-1 font-medium ${t.textPrimary} truncate`}>{u.name}</span>
            <span className="font-bold tabular-nums" style={{ color: cfg.accentHex }}>{u[activeTab]}</span>
            <span className={`text-xs ${t.textMuted}`}>reps</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorFallback({ error }: { error: any }) {
  return (
    <div className="p-4 bg-[#1a0a0a] text-red-400 min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
      <pre className="text-xs bg-[#2a1010] p-2 rounded overflow-auto max-w-full">
        {error?.message || JSON.stringify(error)}
      </pre>
      <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">
        Reload
      </button>
    </div>
  );
}

export default function Home() {
  // 1. STATE
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [lp, setLp] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draftTargets, setDraftTargets] = useState({ pushup: "", squat: "", situp: "" });
  const [savingTargets, setSavingTargets] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("dark");

  // Persist theme to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("theme") as ThemeKey | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  const t = THEMES[theme];

  const addLog = (msg: string) => setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('eruda').then(eruda => eruda.default.init());
    }
  }, []);

  // 2. INITIALIZATION EFFECT
  useEffect(() => {
    setIsMounted(true);
    addLog("App mounted");

    const initTelegram = async () => {
      try {
        if (typeof window !== 'undefined') {
          let attempts = 0;
          while (!(window as any).Telegram?.WebApp && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          const tgWebApp = (window as any).Telegram?.WebApp;
          if (!tgWebApp) { addLog("Not in Telegram (window.Telegram.WebApp missing after waiting)"); return; }
          addLog("Telegram WebApp detected!");
          addLog(`Platform: ${tgWebApp.platform}`);
          addLog(`Version: ${tgWebApp.version}`);
          tgWebApp.ready();
          addLog("WebApp.ready() called");
          const initData = tgWebApp.initData;
          const initDataUnsafe = tgWebApp.initDataUnsafe;
          addLog(`Init data exists: ${!!initData}`);
          addLog(`User: ${JSON.stringify(initDataUnsafe?.user)}`);
          if (initDataUnsafe?.user) {
            setLp({ initData: initDataUnsafe, initDataRaw: initData });
            addLog("User data set successfully");
          } else {
            addLog("No user data in initDataUnsafe");
          }
        }
      } catch (e: any) {
        addLog(`CRITICAL INIT ERROR: ${e.message}`);
        console.error("Telegram init error:", e);
      }
    };

    initTelegram();
  }, []);

  // 3. DERIVED STATE
  const user = lp?.initData?.user;
  const telegramId = user?.id;
  const rawInitData = lp?.initDataRaw;

  // 4. CONVEX HOOKS
  const todayStats     = useQuery(api.workouts.getMyTodayStats, telegramId ? { telegramId } : "skip");
  const globalStats    = useQuery(api.workouts.getGlobalStats);
  const recentWorkouts = useQuery(api.workouts.getRecentWorkouts, telegramId ? { telegramId } : "skip");
  const myTargets      = useQuery(api.workouts.getMyTargets, telegramId ? { telegramId } : "skip");
  const weeklyStats    = useQuery(api.workouts.getMyWeeklyStats, telegramId ? { telegramId } : "skip");
  const leaderboard    = useQuery(api.workouts.getLeaderboard);

  const logWorkoutMutation    = useMutation(api.workouts.logWorkout);
  const setMyTargetsMutation  = useMutation(api.workouts.setMyTargets);
  const deleteWorkoutMutation = useMutation(api.workouts.deleteWorkout);
  const editWorkoutMutation   = useMutation(api.workouts.editWorkout);
  const [logging, setLogging] = useState<string | null>(null);
  const [sliderValues, setSliderValues] = useState({ pushup: 10, squat: 10, situp: 10 });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<{ id: string; type: string; count: number } | null>(null);
  const [editCount, setEditCount] = useState("");

  const targets = {
    pushup: myTargets?.targetPushup ?? DEFAULT_TARGETS.pushup,
    squat:  myTargets?.targetSquat  ?? DEFAULT_TARGETS.squat,
    situp:  myTargets?.targetSitup  ?? DEFAULT_TARGETS.situp,
  };

  const handleSave = async () => {
    if (!telegramId || !rawInitData) { alert("Cannot log: Missing Telegram data"); return; }
    setLogging("saving");
    try {
      const entries = (["pushup", "squat", "situp"] as const).filter(t => sliderValues[t] > 0);
      await Promise.all(entries.map(type => logWorkoutMutation({ initData: rawInitData, type, count: sliderValues[type] })));
      addLog(`Saved: ${entries.map(t => `${sliderValues[t]} ${t}s`).join(", ")}`);
    } catch (err: any) {
      addLog(`Save failed: ${err.message}`);
      alert("Failed to save. See debug info.");
    } finally {
      setLogging(null);
    }
  };

  const openSettings = () => {
    setDraftTargets({ pushup: String(targets.pushup), squat: String(targets.squat), situp: String(targets.situp) });
    setShowSettings(true);
  };

  const handleSaveTargets = async () => {
    if (!rawInitData) { alert("Cannot save: Missing Telegram data"); return; }
    const p = Number(draftTargets.pushup);
    const sq = Number(draftTargets.squat);
    const si = Number(draftTargets.situp);
    if ([p, sq, si].some(n => !Number.isInteger(n) || n < 1 || n > 9999)) {
      alert("Each target must be a whole number between 1 and 9999");
      return;
    }
    setSavingTargets(true);
    try {
      await setMyTargetsMutation({ initData: rawInitData, targetPushup: p, targetSquat: sq, targetSitup: si });
      setShowSettings(false);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSavingTargets(false);
    }
  };

  // 5. RENDER
  if (error) return <ErrorFallback error={error} />;

  if (!isMounted) return (
    <div className={`flex min-h-screen flex-col items-center justify-center p-6 ${t.bg}`}>
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
      <p className={`${t.textSecond} text-sm`}>Loading Kesakuntoon...</p>
    </div>
  );

  const DebugUI = () => (
    <div className="mt-8 p-4 bg-gray-900 text-green-400 font-mono text-xs rounded w-full max-w-md overflow-hidden">
      <p className="font-bold border-b border-gray-700 mb-2">Debug Console</p>
      <div className="space-y-1">
        <p>User ID: {telegramId || "None"}</p>
        <p>Convex URL: {process.env.NEXT_PUBLIC_CONVEX_URL ? "Set" : "Missing"}</p>
        <div className="border-t border-gray-800 mt-2 pt-2 max-h-32 overflow-y-auto">
          {debugLogs.map((l, i) => <p key={i}>{l}</p>)}
        </div>
      </div>
    </div>
  );

  if (!telegramId) {
    return (
      <main className={`flex min-h-screen flex-col items-center justify-center p-6 ${t.bg} ${t.textPrimary} font-sans`}>
        <h1 className="text-2xl font-bold mb-2">Kesakuntoon</h1>
        <p className={`${t.textSecond} mb-4`}>Please open this app in Telegram.</p>
        <DebugUI />
      </main>
    );
  }

  const pushups = todayStats?.pushup || 0;
  const squats  = todayStats?.squat  || 0;
  const situps  = todayStats?.situp  || 0;
  const totalCommunity = globalStats?.totalCount ? globalStats.totalCount.toLocaleString() : "...";

  const hype = {
    pushup: pushups >= targets.pushup,
    squat:  squats  >= targets.squat,
    situp:  situps  >= targets.situp,
  };
  const todayStr = new Date().toISOString().split("T")[0];
  const pickHype = (type: string) => {
    const msgs = HYPE_MESSAGES[type as keyof typeof HYPE_MESSAGES];
    return msgs[todayStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % msgs.length];
  };

  const exerciseConfig = {
    pushup: { label: "Pushups", color: "bg-blue-500",   accentHex: "#2563eb" },
    squat:  { label: "Squats",  color: "bg-green-500",  accentHex: "#16a34a" },
    situp:  { label: "Situps",  color: "bg-orange-500", accentHex: "#f97316" },
  };
  const statEntries: { type: keyof typeof exerciseConfig; count: number }[] = [
    { type: "pushup", count: pushups },
    { type: "squat",  count: squats },
    { type: "situp",  count: situps },
  ];

  return (
    <main className={`flex min-h-screen flex-col items-center p-6 ${t.bg} ${t.textPrimary} font-sans`}>

      {/* Header */}
      <header className="w-full max-w-md mb-8 flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${t.textPrimary}`}>Hi, {user?.first_name}!</h1>
          <p className={`text-sm ${t.textSecond}`}>Today's Progress</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`text-xs ${t.textSecond} uppercase tracking-wide`}>Community Total</p>
            <p className="text-xl font-bold text-blue-500">{totalCommunity}</p>
          </div>
          <button
            onClick={openSettings}
            className={`text-xl p-1 rounded-lg transition ${t.settingsBtn}`}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="w-full max-w-md grid grid-cols-3 gap-3 mb-8">
        {statEntries.map(({ type, count }) => {
          const cfg = exerciseConfig[type];
          const target = targets[type];
          const pct = Math.min(100, target > 0 ? Math.round((count / target) * 100) : 100);
          const isHype = hype[type];
          const hypeText = t.textAccent[type];
          const hypeBorder = t.borderHype[type];
          return (
            <div
              key={type}
              className={`${t.card} p-4 rounded-xl shadow-sm border-2 flex flex-col items-center ${isHype ? hypeBorder : t.border}`}
            >
              <span className={`text-xs ${t.textMuted} font-medium uppercase mb-1`}>{cfg.label}</span>
              <span className={`text-3xl font-bold ${isHype ? hypeText : t.textPrimary}`}>{count}</span>
              <span className={`text-xs ${t.textMuted} mt-0.5`}>/ {target}</span>
              <div className={`w-full ${t.progressTrack} rounded-full h-1.5 mt-2`}>
                <div className={`${cfg.color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              {isHype && (
                <span className={`text-xs font-semibold mt-2 ${hypeText} text-center leading-tight`}>
                  {pickHype(type)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions — Drum Pickers */}
      <div className={`w-full max-w-md ${t.card} rounded-xl shadow-sm border ${t.border} p-4 mb-8`}>
        <div className="flex justify-around mb-4">
          {(["pushup", "squat", "situp"] as const).map((type) => {
            const cfg = exerciseConfig[type];
            return (
              <div key={type} className="flex flex-col items-center gap-2">
                <span className={`text-xs font-semibold ${t.textSecond} uppercase tracking-wide`}>{cfg.label}</span>
                <DrumPicker
                  value={sliderValues[type]}
                  onChange={(v) => setSliderValues(prev => ({ ...prev, [type]: v }))}
                  accentColor={cfg.accentHex}
                  disabled={!!logging}
                  cardBg={t.cardBg}
                />
              </div>
            );
          })}
        </div>
        <button
          onClick={handleSave}
          disabled={!!logging}
          className={`w-full py-3 ${t.saveBtn} rounded-xl font-bold shadow-sm active:scale-95 transition disabled:opacity-60`}
        >
          {logging === "saving" ? "Saving..." : "Save All"}
        </button>
      </div>

      {/* Weekly Charts */}
      <div className="w-full max-w-md mb-8">
        <h2 className={`text-lg font-semibold ${t.textSecond} mb-3`}>This Week</h2>
        <div className={`${t.card} rounded-xl border ${t.border} p-4 space-y-6`}>
          {!weeklyStats ? (
            <div className={`text-center ${t.textMuted} py-4`}>Loading...</div>
          ) : (
            (["pushup", "squat", "situp"] as const).map((type) => {
              const cfg = exerciseConfig[type];
              const data = weeklyStats.map((d: any) => ({
                day: d.date.slice(5), // MM-DD
                reps: d[type] ?? 0,
              }));
              const target = targets[type];
              return (
                <div key={type}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${t.textPrimary}`}>{cfg.label}</span>
                    <span className={`text-xs ${t.textMuted}`}>target {target}/day</span>
                  </div>
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={data} barSize={18} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: theme === "dark" ? "#71717a" : "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: theme === "dark" ? "#71717a" : "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                        contentStyle={{ background: t.cardBg, border: `1px solid ${theme === "dark" ? "#2a2a2a" : "#e5e7eb"}`, borderRadius: 8, fontSize: 12, color: theme === "dark" ? "#f0f0f0" : "#111" }}
                        formatter={(v: any) => [`${v} reps`, cfg.label]}
                      />
                      <Bar dataKey="reps" radius={[4, 4, 0, 0]}>
                        {data.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.reps >= target ? cfg.accentHex : theme === "dark" ? "#2a2a2a" : "#e5e7eb"}
                            fillOpacity={entry.reps > 0 ? 1 : 0.4}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <LeaderboardSection leaderboard={leaderboard} t={t} exerciseConfig={exerciseConfig} />

      {/* Recent Logs */}
      <div className="w-full max-w-md mb-8">
        <h2 className={`text-lg font-semibold ${t.textSecond} mb-3`}>Recent Logs</h2>
        <div className={`${t.card} rounded-xl shadow-sm border ${t.border} overflow-hidden`}>
          {!recentWorkouts ? (
            <div className={`p-4 text-center ${t.textMuted}`}>Loading...</div>
          ) : recentWorkouts.length === 0 ? (
            <div className={`p-4 text-center ${t.textMuted}`}>No logs yet.</div>
          ) : recentWorkouts.map((w: any) => {
            const cfg = exerciseConfig[w.type as keyof typeof exerciseConfig];
            const isDeleting = deletingId === w._id;
            return (
              <div key={w._id} className={`border-b ${t.divider} last:border-0`}>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${cfg?.color ?? "bg-gray-400"} text-white shrink-0`}>
                      {w.type}
                    </span>
                    <span className={`font-semibold ${t.textPrimary}`}>{w.count}</span>
                    <span className={`${t.textMuted} text-xs`}>
                      {new Date(w.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingLog({ id: w._id, type: w.type, count: w.count }); setEditCount(String(w.count)); }}
                      className={`p-1.5 rounded-lg active:scale-90 transition ${t.editBtn}`}
                      aria-label="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                      </svg>
                    </button>
                    <button
                      onClick={async () => {
                        if (!rawInitData) return;
                        setDeletingId(w._id);
                        try {
                          await deleteWorkoutMutation({ initData: rawInitData, workoutId: w._id });
                        } catch (err: any) {
                          addLog(`Delete failed: ${err.message}`);
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      disabled={isDeleting}
                      className={`p-1.5 rounded-lg active:scale-90 transition disabled:opacity-40 ${t.deleteBtn}`}
                      aria-label="Delete"
                    >
                      {isDeleting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 01-1-1V5a1 1 0 011-1h6a1 1 0 011 1v1a1 1 0 01-1 1H9z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Log Modal */}
      {editingLog && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingLog(null); }}
        >
          <div className={`${t.modalBg} rounded-2xl shadow-xl w-full max-w-sm p-6`}>
            <h2 className={`text-xl font-bold ${t.textPrimary} mb-1 capitalize`}>Edit {editingLog.type}s</h2>
            <p className={`text-sm ${t.textSecond} mb-5`}>Change the rep count for this entry</p>
            <input
              type="number"
              min={1}
              max={9999}
              value={editCount}
              onChange={(e) => setEditCount(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6 ${t.inputBg}`}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditingLog(null)}
                className={`flex-1 py-2.5 border rounded-xl font-semibold ${t.cancelBtn}`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!rawInitData || !editingLog) return;
                  const n = Number(editCount);
                  if (!Number.isInteger(n) || n < 1 || n > 9999) { alert("Enter a number between 1 and 9999"); return; }
                  try {
                    await editWorkoutMutation({ initData: rawInitData, workoutId: editingLog.id as any, count: n });
                    setEditingLog(null);
                  } catch (err: any) {
                    addLog(`Edit failed: ${err.message}`);
                    alert("Failed to update. See debug info.");
                  }
                }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold active:scale-95 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEBUG TOGGLE */}
      <details className="w-full max-w-md">
        <summary className={`text-xs ${t.textMuted} cursor-pointer text-center`}>Show Debug Info</summary>
        <DebugUI />
      </details>

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div className={`${t.modalBg} rounded-2xl shadow-xl w-full max-w-sm p-6`}>
            <h2 className={`text-xl font-bold ${t.textPrimary} mb-1`}>Settings</h2>
            <p className={`text-sm ${t.textSecond} mb-5`}>Manage your preferences</p>

            {/* Theme toggle */}
            <div className={`flex items-center justify-between mb-5 pb-5 border-b ${t.border}`}>
              <span className={`text-sm font-medium ${t.textPrimary}`}>Dark mode</span>
              <button
                onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === "dark" ? "bg-blue-600" : "bg-zinc-300"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {/* Daily Targets */}
            <p className={`text-sm font-semibold ${t.textPrimary} mb-3`}>Daily Targets</p>
            {(["pushup", "squat", "situp"] as const).map((type) => {
              const cfg = exerciseConfig[type];
              return (
                <div key={type} className="mb-4">
                  <label className={`block text-sm font-medium ${t.textSecond} mb-1`}>{cfg.label}</label>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={draftTargets[type]}
                    onChange={(e) => setDraftTargets(prev => ({ ...prev, [type]: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${t.inputBg}`}
                  />
                </div>
              );
            })}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className={`flex-1 py-2.5 border rounded-xl font-semibold ${t.cancelBtn}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTargets}
                disabled={savingTargets}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold active:scale-95 transition disabled:opacity-60"
              >
                {savingTargets ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

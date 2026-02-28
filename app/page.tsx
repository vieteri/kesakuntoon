"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../convex/_generated/api";
import { AmountEntrySheet } from "./components/AmountEntrySheet";
import { InlineToast, type InlineToastMessage } from "./components/InlineToast";
import { QuickLogCard } from "./components/QuickLogCard";
import { SendToGroupCard } from "./components/SendToGroupCard";
import { SectionSkeleton } from "./components/SectionSkeleton";
import { TodayScoreboardCard } from "./components/TodayScoreboardCard";
import { useTelegramMainButton } from "./hooks/useTelegramMainButton";

const DEFAULT_TARGETS = { pushup: 50, squat: 50, situp: 50 };
const DEFAULT_QUICK_VALUES = { pushup: 10, squat: 10, situp: 10 };
const IS_DEV = process.env.NODE_ENV !== "production";
const MEDALS = ["🥇", "🥈", "🥉"];

type ThemeKey = "frost" | "dark" | "light";
type ExerciseType = "pushup" | "squat" | "situp";
type ExerciseAmounts = Record<ExerciseType, number>;

const EXERCISE_CONFIG: Record<ExerciseType, {
  label: string;
  accentHex: string;
  barClass: string;
}> = {
  pushup: { label: "Pushups", accentHex: "#4f8dff", barClass: "bg-blue-500" },
  squat: { label: "Squats", accentHex: "#2dcf86", barClass: "bg-emerald-500" },
  situp: { label: "Situps", accentHex: "#ff8b44", barClass: "bg-orange-500" },
};

function hapticTick() {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("light");
      return;
    }
  } catch {
    // ignore
  }
  try {
    navigator.vibrate?.(7);
  } catch {
    // ignore
  }
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="theme-dark min-h-screen bg-[var(--bg)] p-6 text-[var(--text-primary)]">
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {error.message || "Unexpected runtime error"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-400"
        >
          Reload app
        </button>
      </div>
    </div>
  );
}

function LeaderboardSection({
  leaderboard,
}: {
  leaderboard: any[] | undefined;
}) {
  const [activeTab, setActiveTab] = useState<ExerciseType>("pushup");

  const tabs: ExerciseType[] = ["pushup", "squat", "situp"];

  const sorted = useMemo(() => {
    if (!leaderboard) return undefined;
    return [...leaderboard]
      .sort((a, b) => (b[activeTab] ?? 0) - (a[activeTab] ?? 0))
      .filter((row) => row[activeTab] > 0);
  }, [activeTab, leaderboard]);

  return (
    <section className="score-card rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-4 shadow-[var(--card-shadow)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="score-kicker">Group Race</p>
          <h2 className="score-title">Today Leaderboard</h2>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => {
                hapticTick();
                setActiveTab(tab);
              }}
              className={`rounded-xl border px-2 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                isActive
                  ? "border-white/40 bg-white/15 text-[var(--text-primary)]"
                  : "border-[var(--surface-border)] bg-black/20 text-[var(--text-secondary)]"
              }`}
            >
              {EXERCISE_CONFIG[tab].label}
            </button>
          );
        })}
      </div>

      {!sorted ? (
        <SectionSkeleton rows={4} />
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-2)] p-4 text-center text-sm text-[var(--text-secondary)]">
          No {EXERCISE_CONFIG[activeTab].label.toLowerCase()} logged yet today.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)]">
          {sorted.map((row: any, i) => (
            <div
              key={row.telegramId}
              className="flex items-center gap-3 border-b border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-3 last:border-0"
            >
              <span className="w-6 text-center text-sm font-bold">{MEDALS[i] ?? `${i + 1}`}</span>
              <span className="flex-1 truncate text-sm font-semibold text-[var(--text-primary)]">{row.name}</span>
              <span className="text-base font-black tabular-nums" style={{ color: EXERCISE_CONFIG[activeTab].accentHex }}>
                {row[activeTab]}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">reps</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [lp, setLp] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draftTargets, setDraftTargets] = useState({ pushup: "", squat: "", situp: "" });
  const [savingTargets, setSavingTargets] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("frost");
  const [toast, setToast] = useState<InlineToastMessage | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [logging, setLogging] = useState(false);
  const [quickValues, setQuickValues] = useState<ExerciseAmounts>(DEFAULT_QUICK_VALUES);
  const [activeExercise, setActiveExercise] = useState<ExerciseType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<{ id: string; type: ExerciseType; count: number } | null>(null);
  const [editCount, setEditCount] = useState("");
  const toastCounter = useRef(0);

  const addLog = useCallback((msg: string) => {
    if (!IS_DEV) return;
    setDebugLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const pushToast = useCallback((type: InlineToastMessage["type"], message: string) => {
    toastCounter.current += 1;
    setToast({ id: toastCounter.current, type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((prev) => (prev?.id === toast.id ? null : prev)), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as ThemeKey | null;
    if (saved === "frost") {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!IS_DEV || typeof window === "undefined") return;
    if ((window as any).__erudaLoaded) return;
    import("eruda")
      .then((eruda) => {
        eruda.default.init();
        (window as any).__erudaLoaded = true;
      })
      .catch(() => {
        addLog("eruda failed to initialize");
      });
  }, [addLog]);

  useEffect(() => {
    setIsMounted(true);
    const initTelegram = async () => {
      try {
        let attempts = 0;
        while (!(window as any).Telegram?.WebApp && attempts < 50) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts += 1;
        }

        const tgWebApp = (window as any).Telegram?.WebApp;
        if (!tgWebApp) {
          addLog("Telegram WebApp missing");
          return;
        }

        tgWebApp.ready();
        addLog(`Telegram detected ${tgWebApp.platform} ${tgWebApp.version}`);

        const initDataUnsafe = tgWebApp.initDataUnsafe;
        const initDataRaw = tgWebApp.initData;
        if (initDataUnsafe?.user) {
          setLp({ initData: initDataUnsafe, initDataRaw });
          addLog("Telegram user attached");
        }
      } catch (err: any) {
        addLog(`Telegram init failed: ${err?.message ?? "unknown"}`);
        setFatalError(err instanceof Error ? err : new Error("Initialization failed"));
      }
    };

    initTelegram();
  }, [addLog]);

  const user = lp?.initData?.user;
  const telegramId = user?.id;
  const rawInitData = lp?.initDataRaw;
  const startParam = lp?.initData?.start_param;
  const chatId: number | null =
    lp?.initData?.chat?.id ??
    (startParam ? parseInt(startParam, 10) || null : null);

  const todayStats = useQuery(api.workouts.getMyTodayStats, telegramId ? { telegramId } : "skip");
  const globalStats = useQuery(api.workouts.getGlobalStats);
  const recentWorkouts = useQuery(api.workouts.getRecentWorkouts, telegramId ? { telegramId } : "skip");
  const myTargets = useQuery(api.workouts.getMyTargets, telegramId ? { telegramId } : "skip");
  const weeklyStats = useQuery(api.workouts.getMyWeeklyStats, telegramId ? { telegramId } : "skip");
  const myGroups = useQuery(api.groups.getMyGroups, telegramId ? { telegramId } : "skip");
  const effectiveChatId = chatId ?? selectedChatId;
  const leaderboard = useQuery(api.workouts.getLeaderboard, effectiveChatId ? { chatId: effectiveChatId } : "skip");
  const myStreak = useQuery(api.workouts.getMyStreak, telegramId ? { telegramId } : "skip");

  const logWorkoutMutation = useMutation(api.workouts.logWorkout);
  const logWorkoutBatchMutation = useMutation(api.workouts.logWorkoutBatch);
  const setMyTargetsMutation = useMutation(api.workouts.setMyTargets);
  const deleteWorkoutMutation = useMutation(api.workouts.deleteWorkout);
  const editWorkoutMutation = useMutation(api.workouts.editWorkout);

  const targets = {
    pushup: myTargets?.targetPushup ?? DEFAULT_TARGETS.pushup,
    squat: myTargets?.targetSquat ?? DEFAULT_TARGETS.squat,
    situp: myTargets?.targetSitup ?? DEFAULT_TARGETS.situp,
  };

  const stats = {
    pushup: todayStats?.pushup ?? 0,
    squat: todayStats?.squat ?? 0,
    situp: todayStats?.situp ?? 0,
  };

  const totalCommunity = globalStats?.totalCount
    ? globalStats.totalCount.toLocaleString()
    : "...";

  const dayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const totalDraftReps = useMemo(
    () => (Object.keys(quickValues) as ExerciseType[]).reduce((acc, type) => acc + quickValues[type], 0),
    [quickValues]
  );
  const hasAnyAmount = totalDraftReps > 0;

  const handleSave = useCallback(async () => {
    if (!telegramId || !rawInitData) {
      pushToast("error", "Telegram identity is missing. Reopen from Telegram.");
      return;
    }

    const entries = (Object.keys(quickValues) as ExerciseType[])
      .map((type) => ({ type, count: quickValues[type] }))
      .filter((entry) => entry.count > 0);

    if (!entries.length) {
      pushToast("info", "Add at least one rep before saving.");
      return;
    }

    setLogging(true);
    try {
      await logWorkoutBatchMutation({
        initData: rawInitData,
        entries,
        ...(effectiveChatId !== null ? { chatId: effectiveChatId } : {}),
      });
      hapticTick();
      pushToast("success", "Workout saved.");
      addLog("Saved via logWorkoutBatch");
    } catch (batchError: any) {
      addLog(`Batch save failed: ${batchError?.message ?? "unknown"}`);
      try {
        await Promise.all(
          entries.map((entry) =>
            logWorkoutMutation({
              initData: rawInitData,
              type: entry.type,
              count: entry.count,
              ...(effectiveChatId !== null ? { chatId: effectiveChatId } : {}),
            })
          )
        );
        hapticTick();
        pushToast("info", "Workout saved using compatibility mode.");
      } catch (fallbackError: any) {
        addLog(`Fallback save failed: ${fallbackError?.message ?? "unknown"}`);
        pushToast("error", "Could not save workout. Please try again.");
      }
    } finally {
      setLogging(false);
    }
  }, [
    addLog,
    effectiveChatId,
    logWorkoutBatchMutation,
    logWorkoutMutation,
    pushToast,
    quickValues,
    rawInitData,
    telegramId,
  ]);

  const handleClearAll = useCallback(() => {
    if (!hasAnyAmount) return;
    hapticTick();
    setQuickValues({ pushup: 0, squat: 0, situp: 0 });
    pushToast("info", "Amounts cleared.");
  }, [hasAnyAmount, pushToast]);

  const { mainButtonAvailable } = useTelegramMainButton({
    text: hasAnyAmount ? `Save ${totalDraftReps} reps` : "Save workout",
    visible: hasAnyAmount,
    enabled: hasAnyAmount && !logging,
    loading: logging,
    onClick: handleSave,
  });

  const openSettings = () => {
    setDraftTargets({
      pushup: String(targets.pushup),
      squat: String(targets.squat),
      situp: String(targets.situp),
    });
    setShowSettings(true);
  };

  const handleSaveTargets = async () => {
    if (!rawInitData) {
      pushToast("error", "Missing Telegram auth payload.");
      return;
    }

    const p = Number(draftTargets.pushup);
    const sq = Number(draftTargets.squat);
    const si = Number(draftTargets.situp);

    if ([p, sq, si].some((n) => !Number.isInteger(n) || n < 1 || n > 9999)) {
      pushToast("error", "Targets must be whole numbers between 1 and 9999.");
      return;
    }

    setSavingTargets(true);
    try {
      await setMyTargetsMutation({
        initData: rawInitData,
        targetPushup: p,
        targetSquat: sq,
        targetSitup: si,
      });
      setShowSettings(false);
      pushToast("success", "Targets updated.");
    } catch (err: any) {
      pushToast("error", err?.message ? `Failed to save: ${err.message}` : "Failed to save targets.");
    } finally {
      setSavingTargets(false);
    }
  };

  const handleDelete = async (workoutId: string) => {
    if (!rawInitData) {
      pushToast("error", "Missing Telegram auth payload.");
      return;
    }

    setDeletingId(workoutId);
    try {
      await deleteWorkoutMutation({ initData: rawInitData, workoutId: workoutId as any });
      pushToast("success", "Entry deleted.");
    } catch (err: any) {
      addLog(`Delete failed: ${err?.message ?? "unknown"}`);
      pushToast("error", "Failed to delete entry.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!rawInitData || !editingLog) return;

    const n = Number(editCount);
    if (!Number.isInteger(n) || n < 1 || n > 9999) {
      pushToast("error", "Enter a whole number between 1 and 9999.");
      return;
    }

    try {
      await editWorkoutMutation({
        initData: rawInitData,
        workoutId: editingLog.id as any,
        count: n,
      });
      setEditingLog(null);
      pushToast("success", "Entry updated.");
    } catch (err: any) {
      addLog(`Edit failed: ${err?.message ?? "unknown"}`);
      pushToast("error", "Failed to update entry.");
    }
  };

  if (fatalError) return <ErrorFallback error={fatalError} />;

  if (!isMounted) {
    return (
      <div className="theme-dark flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] text-[var(--text-primary)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--action)] border-t-transparent" />
        <p className="font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">Loading Kesakuntoon</p>
      </div>
    );
  }

  if (!telegramId) {
    return (
      <main className="theme-frost min-h-screen bg-[var(--bg)] px-4 py-6 text-[var(--text-primary)]">
        <InlineToast toast={toast} onClose={() => setToast(null)} />
        <div className="mx-auto max-w-md rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-6 shadow-[var(--card-shadow)]">
          <p className="score-kicker">Kesakuntoon</p>
          <h1 className="score-title text-2xl">Open this miniapp in Telegram</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Telegram launch data is required for authentication and saving workouts.
          </p>
        </div>

        {IS_DEV && (
          <details className="mx-auto mt-4 w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Debug
            </summary>
            <div className="mt-3 space-y-1 font-mono text-xs text-[var(--text-secondary)]">
              <p>User ID: none</p>
              <p>initData: missing</p>
            </div>
          </details>
        )}
      </main>
    );
  }

  return (
    <main className={`theme-${theme} min-h-screen bg-[var(--bg)] text-[var(--text-primary)]`}>
      <InlineToast toast={toast} onClose={() => setToast(null)} />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className={`absolute inset-0 ${
            theme === "frost"
              ? "bg-[linear-gradient(135deg,#17335a_0%,#2f4f84_45%,#5f4d8a_100%)]"
              : "bg-[radial-gradient(circle_at_20%_0%,rgba(52,129,255,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(46,204,113,0.12),transparent_40%)]"
          }`}
        />
        <div className="noise-overlay" />
      </div>

      <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-4">
        <header className="stagger-enter rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-4 shadow-[var(--card-shadow)] backdrop-blur-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="score-kicker">{dayLabel}</p>
              <h1 className="score-title text-[2.15rem]">{user?.first_name}, hit your reps</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {effectiveChatId ? "Group mode active" : "Solo mode active"}
              </p>
            </div>
            <button
              onClick={openSettings}
              className="rounded-xl border border-[var(--surface-border)] bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition hover:border-white/45 hover:text-[var(--text-primary)]"
              aria-label="Open settings"
            >
              Settings
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">Community total</p>
            <p className="score-number mt-1 text-[var(--action)]">{totalCommunity}</p>
          </div>
        </header>

        <div className="mt-4 stagger-enter" style={{ animationDelay: "70ms" }}>
          {todayStats === undefined || myTargets === undefined ? (
            <SectionSkeleton rows={6} className="score-card" />
          ) : (
            <TodayScoreboardCard
              stats={stats}
              targets={targets}
              exerciseConfig={EXERCISE_CONFIG}
            />
          )}
        </div>

        <div className="mt-4 grid gap-4 stagger-enter" style={{ animationDelay: "140ms" }}>
          <QuickLogCard
            values={quickValues}
            onEdit={(type) => {
              hapticTick();
              setActiveExercise(type);
            }}
            onSave={handleSave}
            onClearAll={handleClearAll}
            exerciseConfig={EXERCISE_CONFIG}
            disabled={logging}
            showInlineSave={!mainButtonAvailable}
          />
          <SendToGroupCard
            chatId={chatId}
            selectedChatId={selectedChatId}
            groups={myGroups as { chatId: number; chatTitle?: string }[] | undefined}
            onSelect={setSelectedChatId}
            onHaptic={hapticTick}
          />
        </div>

        <section className="mt-4 stagger-enter" style={{ animationDelay: "210ms" }}>
          {myStreak === undefined ? (
            <SectionSkeleton rows={2} />
          ) : (
            <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">Streak</p>
              <p className="mt-1 text-lg font-black text-[var(--text-primary)]">
                {myStreak.streak > 0 ? `🔥 ${myStreak.streak} day streak` : "Start your streak today"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {myStreak.completedToday ? "Targets completed for today" : "Complete all 3 targets to extend streak"}
              </p>
            </div>
          )}
        </section>

        <div className="mt-4">
          {effectiveChatId ? (
            <LeaderboardSection leaderboard={leaderboard} />
          ) : (
            <section className="score-card rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-4 shadow-[var(--card-shadow)] backdrop-blur-xl">
              <p className="score-kicker">Community</p>
              <h2 className="score-title">My Groups</h2>
              <div className="mt-3">
                {!myGroups ? (
                  <SectionSkeleton rows={4} />
                ) : myGroups.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-2)] p-4 text-center text-sm text-[var(--text-secondary)]">
                    Open the miniapp from a group chat to join group leaderboard mode.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)]">
                    {myGroups.map((g: any) => (
                      <div key={g.chatId} className="flex items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-3 last:border-0">
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{g.chatTitle ?? `Group ${g.chatId}`}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            joined {new Date(g.joinedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-300">
                          {g.activeToday} active
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <section className="mt-4 score-card rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-4 shadow-[var(--card-shadow)] backdrop-blur-xl">
          <p className="score-kicker">Trend</p>
          <h2 className="score-title">This Week</h2>

          <div className="mt-3">
            {!weeklyStats ? (
              <SectionSkeleton rows={6} />
            ) : (
              <div className="space-y-5">
                {(["pushup", "squat", "situp"] as ExerciseType[]).map((type) => {
                  const data = weeklyStats.map((d: any) => ({ day: d.date.slice(5), reps: d[type] ?? 0 }));
                  const target = targets[type];
                  const axisColor = theme === "dark" ? "#93a0b8" : "#4d5a70";
                  const inactiveBar = theme === "dark" ? "#283248" : "#ccd5e5";

                  return (
                    <div key={type}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{EXERCISE_CONFIG[type].label}</p>
                        <p className="text-xs text-[var(--text-muted)]">target {target}/day</p>
                      </div>
                      <ResponsiveContainer width="100%" height={100}>
                        <BarChart data={data} barSize={18} margin={{ top: 4, right: 0, left: -30, bottom: 0 }}>
                          <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                            contentStyle={{
                              background: theme === "dark" ? "#111b2d" : "#f3f6ff",
                              border: `1px solid ${theme === "dark" ? "#32415f" : "#c9d4e6"}`,
                              borderRadius: 12,
                              fontSize: 12,
                              color: theme === "dark" ? "#f5f8ff" : "#132038",
                            }}
                            formatter={(value: any) => [`${value} reps`, EXERCISE_CONFIG[type].label]}
                          />
                          <Bar dataKey="reps" radius={[5, 5, 0, 0]}>
                            {data.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={entry.reps >= target ? EXERCISE_CONFIG[type].accentHex : inactiveBar}
                                fillOpacity={entry.reps > 0 ? 1 : 0.45}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-4 score-card rounded-3xl border border-[var(--surface-border-strong)] bg-[var(--surface-1)] p-4 shadow-[var(--card-shadow)] backdrop-blur-xl">
          <p className="score-kicker">History</p>
          <h2 className="score-title">Recent Logs</h2>

          <div className="mt-3">
            {!recentWorkouts ? (
              <SectionSkeleton rows={5} />
            ) : recentWorkouts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-2)] p-4 text-center text-sm text-[var(--text-secondary)]">
                No logs yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)]">
                {recentWorkouts.map((workout: any) => {
                  const cfg = EXERCISE_CONFIG[workout.type as ExerciseType];
                  const isDeleting = deletingId === workout._id;

                  return (
                    <div key={workout._id} className="flex items-center justify-between gap-2 border-b border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-3 last:border-0">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: cfg.accentHex }}>
                          {cfg.label}
                        </p>
                        <p className="text-base font-black text-[var(--text-primary)]">{workout.count}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {new Date(workout.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            hapticTick();
                            setEditingLog({ id: workout._id, type: workout.type, count: workout.count });
                            setEditCount(String(workout.count));
                          }}
                          className="rounded-lg border border-[var(--surface-border)] bg-black/20 px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] transition hover:border-white/45 hover:text-[var(--text-primary)]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(workout._id)}
                          disabled={isDeleting}
                          className="rounded-lg border border-rose-500/45 bg-rose-500/10 px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
                        >
                          {isDeleting ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {IS_DEV && (
          <details className="mt-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Debug Info
            </summary>
            <div className="mt-3 space-y-1 font-mono text-xs text-[var(--text-secondary)]">
              <p>User ID: {telegramId}</p>
              <p>Chat ID: {chatId !== null ? String(chatId) : "solo mode"}</p>
              <p>Start Param: {startParam || "none"}</p>
              <p>Selected Group: {selectedChatId !== null ? String(selectedChatId) : "none"}</p>
              <p>Effective Chat ID: {effectiveChatId !== null ? String(effectiveChatId) : "none"}</p>
              <p>Convex URL: {process.env.NEXT_PUBLIC_CONVEX_URL ? "set" : "missing"}</p>
              <div className="max-h-32 overflow-y-auto border-t border-[var(--surface-border)] pt-2">
                {debugLogs.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </details>
        )}
      </div>

      <AmountEntrySheet
        open={activeExercise !== null}
        type={activeExercise ?? "pushup"}
        label={activeExercise ? EXERCISE_CONFIG[activeExercise].label : "Reps"}
        value={activeExercise ? quickValues[activeExercise] : 0}
        accentColor={activeExercise ? EXERCISE_CONFIG[activeExercise].accentHex : EXERCISE_CONFIG.pushup.accentHex}
        onClose={() => setActiveExercise(null)}
        onApply={(next) => {
          if (!activeExercise) return;
          hapticTick();
          setQuickValues((prev) => ({ ...prev, [activeExercise]: next }));
          setActiveExercise(null);
        }}
        onHaptic={hapticTick}
      />

      {editingLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingLog(null);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-5 shadow-2xl">
            <p className="score-kicker">Edit Entry</p>
            <h3 className="score-title text-xl">{EXERCISE_CONFIG[editingLog.type].label}</h3>
            <input
              type="number"
              min={1}
              max={9999}
              value={editCount}
              onChange={(e) => setEditCount(e.target.value)}
              className="mt-4 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-3 text-center text-2xl font-black text-[var(--text-primary)] outline-none focus:border-[var(--action)]"
              autoFocus
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setEditingLog(null)}
                className="rounded-xl border border-[var(--surface-border)] bg-black/20 px-3 py-2 text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-xl bg-[var(--action)] px-3 py-2 text-sm font-black uppercase tracking-[0.1em] text-[var(--action-text)]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-5 shadow-2xl">
            <p className="score-kicker">Settings</p>
            <h3 className="score-title text-xl">Preferences</h3>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-3">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Theme</span>
              <span className="rounded-lg bg-[var(--action)] px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-[var(--action-text)]">
                Frosted
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {(["pushup", "squat", "situp"] as ExerciseType[]).map((type) => (
                <label key={type} className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    {EXERCISE_CONFIG[type].label} target
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={draftTargets[type]}
                    onChange={(e) => setDraftTargets((prev) => ({ ...prev, [type]: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--action)]"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-xl border border-[var(--surface-border)] bg-black/20 px-3 py-2 text-sm font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTargets}
                disabled={savingTargets}
                className="rounded-xl bg-[var(--action)] px-3 py-2 text-sm font-black uppercase tracking-[0.1em] text-[var(--action-text)] disabled:opacity-60"
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

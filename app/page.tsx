"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect, useRef, useCallback } from "react";

const ITEM_H = 40;
const VISIBLE = 5;
const CONTAINER_H = ITEM_H * VISIBLE;
const PAD = (CONTAINER_H - ITEM_H) / 2;
const MIN_VAL = 0;
const MAX_VAL = 200;

function hapticTick() {
  // Telegram WebApp haptic (iOS + Android via Telegram)
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("light");
      return;
    }
  } catch {}
  // Fallback: Web Vibration API (Android browsers)
  try { navigator.vibrate?.(6); } catch {}
}

function DrumPicker({
  value,
  onChange,
  accentColor,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
  disabled: boolean;
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

  // Scroll to initial value on mount (no animation)
  useEffect(() => {
    scrollToValue(value, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync scroll when value changes externally
  useEffect(() => {
    if (!isScrollingRef.current) {
      scrollToValue(value, true);
    }
  }, [value, scrollToValue]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isScrollingRef.current = true;

    // Fire haptic on each integer tick while scrolling
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
    <div
      className="relative select-none"
      style={{ width: 80, height: CONTAINER_H, overflow: "hidden" }}
    >
      {/* Highlight stripe */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 rounded-lg"
        style={{
          top: PAD,
          height: ITEM_H,
          border: `2px solid ${accentColor}`,
          background: `${accentColor}15`,
        }}
      />
      {/* Scroll container — touch-action: pan-y prevents horizontal drift */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll overflow-x-hidden"
        style={{
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}
      >
        <div style={{ height: PAD }} />
        {items.map((n) => {
          const dist = Math.abs(n - value);
          const opacity = dist === 0 ? 1 : dist === 1 ? 0.45 : dist === 2 ? 0.2 : 0.08;
          const fontSize = dist === 0 ? 24 : dist === 1 ? 17 : 15;
          return (
            <div
              key={n}
              onClick={() => {
                if (disabled) return;
                hapticTick();
                onChange(n);
                scrollToValue(n, true);
              }}
              style={{
                height: ITEM_H,
                scrollSnapAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: disabled ? "default" : "pointer",
                opacity,
                transition: "opacity 0.1s, font-size 0.1s",
                fontWeight: dist === 0 ? 700 : 400,
                fontSize,
                fontVariantNumeric: "tabular-nums",
                color: dist === 0 ? accentColor : "#6b7280",
                letterSpacing: dist === 0 ? "-0.5px" : "0",
              }}
            >
              {n}
            </div>
          );
        })}
        <div style={{ height: PAD }} />
      </div>
      {/* Fade top */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: PAD,
          background: "linear-gradient(to bottom, rgba(255,255,255,1) 20%, rgba(255,255,255,0) 100%)",
        }}
      />
      {/* Fade bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
        style={{
          height: PAD,
          background: "linear-gradient(to top, rgba(255,255,255,1) 20%, rgba(255,255,255,0) 100%)",
        }}
      />
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

// Simple Error Boundary Component
function ErrorFallback({ error }: { error: any }) {
  return (
    <div className="p-4 bg-red-50 text-red-900 min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
      <pre className="text-xs bg-red-100 p-2 rounded overflow-auto max-w-full">
        {error?.message || JSON.stringify(error)}
      </pre>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
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

  // Helper to add logs
  const addLog = (msg: string) => setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    // Initialize Eruda
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
                // Wait for Telegram WebApp script to load (max 5 seconds)
                let attempts = 0;
                while (!(window as any).Telegram?.WebApp && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                const tgWebApp = (window as any).Telegram?.WebApp;

                if (!tgWebApp) {
                    addLog("Not in Telegram (window.Telegram.WebApp missing after waiting)");
                    return;
                }

                addLog("Telegram WebApp detected!");
                addLog(`Platform: ${tgWebApp.platform}`);
                addLog(`Version: ${tgWebApp.version}`);

                // Initialize the WebApp
                tgWebApp.ready();
                addLog("WebApp.ready() called");

                // Get user data from init data
                const initData = tgWebApp.initData;
                const initDataUnsafe = tgWebApp.initDataUnsafe;

                addLog(`Init data exists: ${!!initData}`);
                addLog(`User: ${JSON.stringify(initDataUnsafe?.user)}`);

                if (initDataUnsafe?.user) {
                    setLp({
                        initData: initDataUnsafe,
                        initDataRaw: initData
                    });
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
    // Check if we have valid user data before accessing
    const user = lp?.initData?.user;
    const telegramId = user?.id;
    const rawInitData = lp?.initDataRaw;

    // 4. CONVEX HOOKS (Only run if we have an ID to avoid unnecessary queries)
    // We use "skip" if no ID, so these shouldn't crash
    const todayStats = useQuery(api.workouts.getMyTodayStats, telegramId ? { telegramId } : "skip");
    const globalStats = useQuery(api.workouts.getGlobalStats);
    const recentWorkouts = useQuery(api.workouts.getRecentWorkouts, telegramId ? { telegramId } : "skip");
    const myTargets = useQuery(api.workouts.getMyTargets, telegramId ? { telegramId } : "skip");

    const logWorkoutMutation = useMutation(api.workouts.logWorkout);
    const setMyTargetsMutation = useMutation(api.workouts.setMyTargets);
    const deleteWorkoutMutation = useMutation(api.workouts.deleteWorkout);
    const editWorkoutMutation = useMutation(api.workouts.editWorkout);
    const [logging, setLogging] = useState<string | null>(null);
    const [sliderValues, setSliderValues] = useState({ pushup: 10, squat: 10, situp: 10 });
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingLog, setEditingLog] = useState<{ id: string; type: string; count: number } | null>(null);
    const [editCount, setEditCount] = useState("");

    // Resolved targets (fall back to defaults if not set)
    const targets = {
      pushup: myTargets?.targetPushup ?? DEFAULT_TARGETS.pushup,
      squat:  myTargets?.targetSquat  ?? DEFAULT_TARGETS.squat,
      situp:  myTargets?.targetSitup  ?? DEFAULT_TARGETS.situp,
    };

    const handleSave = async () => {
      if (!telegramId || !rawInitData) {
        alert("Cannot log: Missing Telegram data");
        return;
      }
      setLogging("saving");
      try {
        const entries = (["pushup", "squat", "situp"] as const).filter(t => sliderValues[t] > 0);
        await Promise.all(entries.map(type =>
          logWorkoutMutation({ initData: rawInitData, type, count: sliderValues[type] })
        ));
        addLog(`Saved: ${entries.map(t => `${sliderValues[t]} ${t}s`).join(", ")}`);
      } catch (err: any) {
        addLog(`Save failed: ${err.message}`);
        alert("Failed to save. See debug info.");
      } finally {
        setLogging(null);
      }
    };

    const openSettings = () => {
      setDraftTargets({
        pushup: String(targets.pushup),
        squat:  String(targets.squat),
        situp:  String(targets.situp),
      });
      setShowSettings(true);
    };

    const handleSaveTargets = async () => {
      if (!rawInitData) {
        alert("Cannot save: Missing Telegram data");
        return;
      }
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
    // Only access properties if we have data to prevent crashes
    if (error) return <ErrorFallback error={error} />;

    // Prevent hydration mismatch by showing simple loading state until client mount
    if (!isMounted) return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-400 text-sm">Loading Kesakuntoon...</p>
        </div>
    );

    // Render the debug UI if something is wrong or just for visibility
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

    // If we are not in Telegram (no user ID), show a friendly message + Debug
    if (!telegramId) {
        return (
          <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 text-gray-900 font-sans">
               <h1 className="text-2xl font-bold mb-2">Kesakuntoon</h1>
               <p className="text-gray-500 mb-4">Please open this app in Telegram.</p>
               <DebugUI />
          </main>
        )
    }

    // Safely access stats with fallback values
    const pushups = todayStats?.pushup || 0;
    const squats = todayStats?.squat || 0;
    const situps = todayStats?.situp || 0;
    const totalCommunity = globalStats?.totalCount ? globalStats.totalCount.toLocaleString() : "...";

    // Hype logic
    const hype = {
      pushup: pushups >= targets.pushup,
      squat:  squats  >= targets.squat,
      situp:  situps  >= targets.situp,
    };
    const todayStr = new Date().toISOString().split("T")[0];
    const pickHype = (type: string) => {
      const msgs = HYPE_MESSAGES[type as keyof typeof HYPE_MESSAGES];
      const idx = todayStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % msgs.length;
      return msgs[idx];
    };

    // Per-exercise styles
    const exerciseConfig = {
      pushup: { label: "Pushups", color: "bg-blue-500",  border: "border-blue-400",  text: "text-blue-600" },
      squat:  { label: "Squats",  color: "bg-green-500", border: "border-green-400", text: "text-green-600" },
      situp:  { label: "Situps",  color: "bg-orange-500",border: "border-orange-400",text: "text-orange-500" },
    };
    const statEntries: { type: keyof typeof exerciseConfig; count: number }[] = [
      { type: "pushup", count: pushups },
      { type: "squat",  count: squats },
      { type: "situp",  count: situps },
    ];

    // Main Dashboard
    return (
      <main className="flex min-h-screen flex-col items-center p-6 bg-gray-50 text-gray-900 font-sans">
        <header className="w-full max-w-md mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hi, {user?.first_name}!</h1>
            <p className="text-sm text-gray-500">Today's Progress</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Community Total</p>
              <p className="text-xl font-bold text-blue-600">
                {totalCommunity}
              </p>
            </div>
            <button
              onClick={openSettings}
              className="text-xl p-1 rounded-lg hover:bg-gray-200 active:scale-95 transition"
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
            return (
              <div
                key={type}
                className={`bg-white p-4 rounded-xl shadow-sm border-2 flex flex-col items-center ${isHype ? cfg.border : "border-gray-100"}`}
              >
                <span className="text-xs text-gray-400 font-medium uppercase mb-1">{cfg.label}</span>
                <span className={`text-3xl font-bold ${isHype ? cfg.text : "text-gray-800"}`}>{count}</span>
                <span className="text-xs text-gray-400 mt-0.5">/ {target}</span>
                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div
                    className={`${cfg.color} h-1.5 rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {isHype && (
                  <span className={`text-xs font-semibold mt-2 ${cfg.text} text-center leading-tight`}>
                    {pickHype(type)}
                  </span>
                )}
              </div>
            );
          })}
        </div>


      {/* Actions — Drum Pickers */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8">
        <div className="flex justify-around mb-4">
          {(["pushup", "squat", "situp"] as const).map((type) => {
            const cfg = exerciseConfig[type];
            const accentColor = type === "pushup" ? "#2563eb" : type === "squat" ? "#16a34a" : "#f97316";
            return (
              <div key={type} className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
                <DrumPicker
                  value={sliderValues[type]}
                  onChange={(v) => setSliderValues(prev => ({ ...prev, [type]: v }))}
                  accentColor={accentColor}
                  disabled={!!logging}
                />
              </div>
            );
          })}
        </div>
        <button
          onClick={handleSave}
          disabled={!!logging}
          className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow-sm active:scale-95 transition disabled:opacity-60"
        >
          {logging === "saving" ? "Saving..." : "Save All"}
        </button>
      </div>

      {/* Recent Activity */}
      <div className="w-full max-w-md mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Logs</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {!recentWorkouts ? (
            <div className="p-4 text-center text-gray-400">Loading...</div>
          ) : recentWorkouts.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No logs yet.</div>
          ) : recentWorkouts.map((w: any) => {
            const cfg = exerciseConfig[w.type as keyof typeof exerciseConfig];
            const isDeleting = deletingId === w._id;
            return (
              <div key={w._id} className="border-b border-gray-50 last:border-0">
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${cfg?.color ?? "bg-gray-400"} text-white shrink-0`}>
                      {w.type}
                    </span>
                    <span className="font-semibold text-gray-800">{w.count}</span>
                    <span className="text-gray-400 text-xs">{new Date(w.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingLog({ id: w._id, type: w.type, count: w.count }); setEditCount(String(w.count)); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 active:scale-90 transition"
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
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition disabled:opacity-40"
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
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingLog(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1 capitalize">Edit {editingLog.type}s</h2>
            <p className="text-sm text-gray-500 mb-5">Change the rep count for this entry</p>
            <input
              type="number"
              min={1}
              max={9999}
              value={editCount}
              onChange={(e) => setEditCount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditingLog(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!rawInitData || !editingLog) return;
                  const n = Number(editCount);
                  if (!Number.isInteger(n) || n < 1 || n > 9999) {
                    alert("Enter a number between 1 and 9999");
                    return;
                  }
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
        <summary className="text-xs text-gray-400 cursor-pointer text-center">Show Debug Info</summary>
        <DebugUI />
      </details>

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Daily Targets</h2>
            <p className="text-sm text-gray-500 mb-5">Set your daily rep goals</p>

            {(["pushup", "squat", "situp"] as const).map((type) => {
              const cfg = exerciseConfig[type];
              return (
                <div key={type} className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{cfg.label}</label>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={draftTargets[type]}
                    onChange={(e) => setDraftTargets(prev => ({ ...prev, [type]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              );
            })}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold"
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

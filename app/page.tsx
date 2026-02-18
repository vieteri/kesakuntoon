"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";
// Remove static import of Telegram SDK
// import { retrieveLaunchParams } from "@telegram-apps/sdk-react";

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
                // Check if we are in Telegram Webview
                const isTg = (window as any).Telegram?.WebApp;
                
                if (!isTg) {
                    addLog("Not in Telegram (window.Telegram.WebApp missing)");
                    return; // Don't even try to load SDK if not in Telegram
                }

                addLog("Telegram WebApp detected");

                // DYNAMIC IMPORT to prevent server-side crash
                const { retrieveLaunchParams } = await import("@telegram-apps/sdk-react");
                
                try {
                    const params = retrieveLaunchParams();
                    addLog("Params retrieved successfully");
                    setLp(params);
                } catch(e: any) {
                    addLog(`Failed to retrieve params: ${e.message}`);
                }
            }
        } catch (e: any) {
            addLog(`CRITICAL INIT ERROR: ${e.message}`);
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
    
    const logWorkoutMutation = useMutation(api.workouts.logWorkout);
    const [logging, setLogging] = useState<string | null>(null);
  
    const handleLog = async (type: string, count: number) => {
      if (!telegramId || !rawInitData) {
          alert("Cannot log: Missing Telegram data");
          return;
      }
  
      setLogging(type);
      try {
          await logWorkoutMutation({ initData: rawInitData, type, count });
          addLog(`Logged ${count} ${type}s`);
      } catch (err: any) {
          addLog(`Log failed: ${err.message}`);
          alert("Failed to log. See debug info.");
      } finally {
          setLogging(null);
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
  
    // Main Dashboard
    return (
      <main className="flex min-h-screen flex-col items-center p-6 bg-gray-50 text-gray-900 font-sans">
        <header className="w-full max-w-md mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hi, {user?.firstName}!</h1>
            <p className="text-sm text-gray-500">Today's Progress</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Community Total</p>
            <p className="text-xl font-bold text-blue-600">
              {totalCommunity}
            </p>
          </div>
        </header>
  
        {/* Stats Grid */}
        <div className="w-full max-w-md grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-xs text-gray-400 font-medium uppercase mb-1">Pushups</span>
            <span className="text-3xl font-bold text-gray-800">{pushups}</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-xs text-gray-400 font-medium uppercase mb-1">Squats</span>
            <span className="text-3xl font-bold text-gray-800">{squats}</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <span className="text-xs text-gray-400 font-medium uppercase mb-1">Situps</span>
            <span className="text-3xl font-bold text-gray-800">{situps}</span>
          </div>
        </div>


      {/* Actions */}
      <div className="w-full max-w-md space-y-3 mb-8">
         <button onClick={() => handleLog("pushup", 10)} disabled={!!logging} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-sm active:scale-95 transition">
            {logging === "pushup" ? "Saving..." : "+10 Pushups"}
         </button>
         <button onClick={() => handleLog("squat", 10)} disabled={!!logging} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-sm active:scale-95 transition">
            {logging === "squat" ? "Saving..." : "+10 Squats"}
         </button>
         <button onClick={() => handleLog("situp", 10)} disabled={!!logging} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-sm active:scale-95 transition">
            {logging === "situp" ? "Saving..." : "+10 Situps"}
         </button>
      </div>

      {/* Recent Activity */}
      <div className="w-full max-w-md mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Logs</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {!recentWorkouts ? <div className="p-4 text-center text-gray-400">Loading...</div> : 
             recentWorkouts.length === 0 ? <div className="p-4 text-center text-gray-400">No logs yet.</div> :
             recentWorkouts.map((w: any) => (
                <div key={w._id} className="p-4 border-b border-gray-50 flex justify-between">
                    <span className="font-medium capitalize">{w.count} {w.type}s</span>
                    <span className="text-gray-400 text-sm">{new Date(w.timestamp).toLocaleTimeString()}</span>
                </div>
             ))}
        </div>
      </div>

      {/* DEBUG TOGGLE */}
      <details className="w-full max-w-md">
        <summary className="text-xs text-gray-400 cursor-pointer text-center">Show Debug Info</summary>
        <DebugUI />
      </details>
    </main>
  );
}

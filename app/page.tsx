"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";

export default function Home() {
  const [telegramInitData, setTelegramInitData] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [lp, setLp] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
        // Try to retrieve launch params safely on client mount
        // retrieveLaunchParams checks window.location.hash and sessionStorage
        if (typeof window !== 'undefined') {
            const params = retrieveLaunchParams();
            setLp(params);
            setIsTelegram(true);
        }
    } catch (e) {
        console.error("Not in Telegram environment or failed to retrieve params", e);
    }
  }, []);

  const user = lp?.initData?.user;
  const telegramId = user?.id;
  const rawInitData = lp?.initDataRaw;

  // Fetch Data
  const todayStats = useQuery(api.workouts.getMyTodayStats, telegramId ? { telegramId } : "skip");
  const globalStats = useQuery(api.workouts.getGlobalStats);
  const recentWorkouts = useQuery(api.workouts.getRecentWorkouts, telegramId ? { telegramId } : "skip");
  
  const logWorkoutMutation = useMutation(api.workouts.logWorkout);

  const [logging, setLogging] = useState<string | null>(null);

  const handleLog = async (type: string, count: number) => {
    if (!telegramId || !rawInitData) {
        alert("Please open in Telegram to log workouts.");
        return;
    }

    setLogging(type);
    try {
        await logWorkoutMutation({
            initData: rawInitData,
            type,
            count
        });
    } catch (err) {
        console.error(err);
        alert("Failed to log. Try again.");
    } finally {
        setLogging(null);
    }
  };

  // Prevent hydration mismatch by rendering a loader or generic state until mounted
  if (!isMounted) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 text-gray-900 font-sans">
             <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 w-48 bg-gray-200 rounded"></div>
             </div>
        </main>
      );
  }

  if (!telegramId) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 text-gray-900 font-sans">
             <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Kesakuntoon</h1>
                <p className="text-gray-500">Please open this app in Telegram to track your workouts.</p>
                <div className="mt-8 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm max-w-xs mx-auto">
                    Debug: No Telegram ID found.
                </div>
             </div>
        </main>
      )
  }

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
            {globalStats?.totalCount ? globalStats.totalCount.toLocaleString() : "..."}
          </p>
        </div>
      </header>

      {/* Stats Grid - TODAY */}
      <div className="w-full max-w-md grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center transition-all hover:shadow-md">
          <span className="text-xs text-gray-400 font-medium uppercase mb-1">Pushups</span>
          <span className="text-3xl font-bold text-gray-800">{todayStats?.pushup || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center transition-all hover:shadow-md">
          <span className="text-xs text-gray-400 font-medium uppercase mb-1">Squats</span>
          <span className="text-3xl font-bold text-gray-800">{todayStats?.squat || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center transition-all hover:shadow-md">
          <span className="text-xs text-gray-400 font-medium uppercase mb-1">Situps</span>
          <span className="text-3xl font-bold text-gray-800">{todayStats?.situp || 0}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-md grid grid-cols-1 gap-4 mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Log Activity</h2>
        
        {/* Pushups */}
        <div className="flex gap-2">
            <button 
                onClick={() => handleLog("pushup", 10)}
                disabled={logging !== null}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
                {logging === "pushup" ? <span className="animate-spin">⏳</span> : "+10 Pushups"}
            </button>
             <button 
                onClick={() => handleLog("pushup", 25)}
                disabled={logging !== null}
                className="w-20 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold shadow-sm hover:bg-blue-200 active:scale-95 transition disabled:opacity-50"
            >
                +25
            </button>
        </div>

        {/* Squats */}
        <div className="flex gap-2">
            <button 
                onClick={() => handleLog("squat", 10)}
                disabled={logging !== null}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium shadow-sm hover:bg-green-700 active:scale-95 transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
                {logging === "squat" ? <span className="animate-spin">⏳</span> : "+10 Squats"}
            </button>
             <button 
                onClick={() => handleLog("squat", 25)}
                disabled={logging !== null}
                className="w-20 py-3 bg-green-100 text-green-700 rounded-xl font-bold shadow-sm hover:bg-green-200 active:scale-95 transition disabled:opacity-50"
            >
                +25
            </button>
        </div>

        {/* Situps */}
        <div className="flex gap-2">
            <button 
                onClick={() => handleLog("situp", 10)}
                disabled={logging !== null}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium shadow-sm hover:bg-orange-600 active:scale-95 transition disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
                 {logging === "situp" ? <span className="animate-spin">⏳</span> : "+10 Situps"}
            </button>
             <button 
                onClick={() => handleLog("situp", 25)}
                disabled={logging !== null}
                className="w-20 py-3 bg-orange-100 text-orange-700 rounded-xl font-bold shadow-sm hover:bg-orange-200 active:scale-95 transition disabled:opacity-50"
            >
                +25
            </button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Logs</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {!recentWorkouts ? (
                <div className="p-4 text-center text-gray-400 text-sm">Loading history...</div>
            ) : recentWorkouts.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">No workouts yet. Start sweating!</div>
            ) : (
                recentWorkouts.map((workout: any) => (
                    <div key={workout._id} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center">
                        <div>
                            <p className="font-medium text-gray-800 capitalize">
                                {workout.count} {workout.type}s
                            </p>
                            <p className="text-xs text-gray-400">
                                {new Date(workout.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                                <span className="mx-1">•</span>
                                {new Date(workout.timestamp).toLocaleDateString()}
                            </p>
                        </div>
                        <div className={`h-2 w-2 rounded-full ${
                            workout.type === 'pushup' ? 'bg-blue-400' : 
                            workout.type === 'squat' ? 'bg-green-400' : 'bg-orange-400'
                        }`}></div>
                    </div>
                ))
            )}
        </div>
      </div>
      
      <footer className="mt-12 mb-6 text-center text-xs text-gray-400">
        <p>Kesakuntoon 2026</p>
      </footer>
    </main>
  );
}

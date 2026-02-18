"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useEffect, useState } from "react";
import { useLaunchParams } from "@telegram-apps/sdk-react";

export default function Home() {
  const [telegramInitData, setTelegramInitData] = useState<any>(null);
  
  // Attempt to get launch params safely
  let lp: any;
  try {
    lp = useLaunchParams();
  } catch (e) {
    // Fallback for development outside Telegram
    console.warn("Not in Telegram environment");
  }

  const telegramUser = lp?.initData?.user;
  const telegramId = telegramUser?.id;

  // Convex hooks
  const stats = useQuery(api.workouts.getMyStats, 
    telegramId ? { telegramId } : "skip"
  );
  
  const globalStats = useQuery(api.workouts.getGlobalStats);
  const logWorkout = useMutation(api.workouts.logWorkout);

  const [logging, setLogging] = useState(false);

  const handleLog = async (type: string, count: number) => {
    if (!telegramId) {
      alert("Please open this app in Telegram to log workouts.");
      return;
    }
    
    setLogging(true);
    try {
      // Use the raw initData string from launch params
      const initData = lp?.initDataRaw; 
      
      if (!initData) {
         // Fallback for dev mode
         console.warn("No initData found. Using mock for dev if configured.");
         // In production this should fail or prompt user
         alert("Authentication failed: No Telegram data found.");
         return;
      }

      await logWorkout({
        initData,
        type,
        count,
        // date is optional now, server handles it
      });
      alert(`Logged ${count} ${type}s!`);
    } catch (err) {
      console.error(err);
      alert("Failed to log workout");
    } finally {
      setLogging(false);
    }
  };

  if (!telegramUser && !lp) {
     // Dev mode fallback UI or instructions
     return (
       <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
         <h1 className="text-2xl font-bold mb-4">Kesakuntoon</h1>
         <p>Please open this app in Telegram.</p>
         <p className="text-sm text-gray-500 mt-2">(Dev Mode: Params not found)</p>
       </div>
     );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="w-full max-w-md mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Hi, {telegramUser?.firstName || "User"}!</h1>
          <p className="text-sm text-gray-500">Ready to sweat?</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Community Total</p>
          <p className="text-lg font-bold text-blue-600">{globalStats?.totalCount || 0}</p>
        </div>
      </header>

      <div className="w-full max-w-md grid grid-cols-1 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Your Progress</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Pushups</p>
              <p className="text-xl font-bold">{stats?.pushup || 0}</p>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Squats</p>
              <p className="text-xl font-bold">{stats?.squat || 0}</p>
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Situps</p>
              <p className="text-xl font-bold">{stats?.situp || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-3">
        <h2 className="text-lg font-semibold mb-2">Log Activity</h2>
        
        {["pushup", "squat", "situp"].map((type) => (
          <div key={type} className="flex gap-2">
            <button
              onClick={() => handleLog(type, 10)}
              disabled={logging}
              className="flex-1 py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
            >
              <span className="capitalize">{type}s</span>
              <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">+10</span>
            </button>
            <button
               onClick={() => handleLog(type, 25)}
               disabled={logging}
               className="py-3 px-4 bg-blue-600 text-white rounded-xl font-medium shadow-sm hover:bg-blue-700 transition-colors"
            >
              +25
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

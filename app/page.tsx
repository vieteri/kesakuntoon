"use client";

import { useState } from "react";

export default function Home() {
  const [stats, setStats] = useState({
    pushups: 120,
    squats: 85,
    situps: 45,
  });

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, type: "Pushups", count: 20, time: "2 hours ago" },
    { id: 2, type: "Squats", count: 15, time: "4 hours ago" },
    { id: 3, type: "Situps", count: 10, time: "Yesterday" },
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-gray-50 text-gray-900 font-sans">
      <header className="w-full max-w-md mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kesakuntoon</h1>
          <p className="text-sm text-gray-500">Dashboard (Vercel Test)</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Global Total</p>
          <p className="text-xl font-bold text-blue-600">1,234</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="w-full max-w-md grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-400 font-medium uppercase mb-1">Pushups</span>
          <span className="text-2xl font-bold text-gray-800">{stats.pushups}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-400 font-medium uppercase mb-1">Squats</span>
          <span className="text-2xl font-bold text-gray-800">{stats.squats}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-xs text-gray-400 font-medium uppercase mb-1">Situps</span>
          <span className="text-2xl font-bold text-gray-800">{stats.situps}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md grid grid-cols-1 gap-3 mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Log Workout</h2>
        <div className="grid grid-cols-3 gap-2">
            <button className="py-3 bg-blue-600 text-white rounded-lg font-medium shadow-sm hover:bg-blue-700 transition active:scale-95">
                +10 Pushups
            </button>
            <button className="py-3 bg-green-600 text-white rounded-lg font-medium shadow-sm hover:bg-green-700 transition active:scale-95">
                +10 Squats
            </button>
            <button className="py-3 bg-orange-500 text-white rounded-lg font-medium shadow-sm hover:bg-orange-600 transition active:scale-95">
                +10 Situps
            </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center">
                    <div>
                        <p className="font-medium text-gray-800">{activity.count} {activity.type}</p>
                        <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                </div>
            ))}
        </div>
      </div>
      
      <footer className="mt-12 text-center text-xs text-gray-400">
        <p>Deployed on Vercel</p>
      </footer>
    </main>
  );
}

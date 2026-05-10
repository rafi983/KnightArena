"use client";

import { Clock } from "lucide-react";

interface GameClockProps {
  time: number; // in seconds
  isActive: boolean;
  isLow: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function GameClock({ time, isActive, isLow }: GameClockProps) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-lg font-bold transition-colors ${
        isActive
          ? isLow
            ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 animate-pulse"
            : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <Clock size={14} className="opacity-60" />
      <span>{formatTime(time)}</span>
    </div>
  );
}

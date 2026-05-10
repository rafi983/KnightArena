"use client";

import {
    Clock,
    Cpu,
    Crown,
    FlaskConical,
    Hourglass,
    Infinity,
    LogIn,
    LogOut,
    Timer,
    UserPlus,
    Users,
    Zap,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ColorChoice = "w" | "b" | "random";
type DifficultyChoice = "easy" | "medium" | "hard";

const TIME_OPTIONS = [
  { label: "Bullet 1+0", value: 1, icon: Zap },
  { label: "Blitz 3+0", value: 3, icon: Zap },
  { label: "Blitz 5+0", value: 5, icon: Clock },
  { label: "Rapid 10+0", value: 10, icon: Timer },
  { label: "Rapid 15+10", value: 15, icon: Timer },
  { label: "Classical 30+0", value: 30, icon: Hourglass },
  { label: "No Timer", value: 0, icon: Infinity },
];

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  const [color, setColor] = useState<ColorChoice>("random");
  const [difficulty, setDifficulty] = useState<DifficultyChoice>("medium");
  const [timeValue, setTimeValue] = useState(5);

  const startGame = () => {
    const params = new URLSearchParams({
      color,
      difficulty,
      time: timeValue.toString(),
    });
    router.push(`/play?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-end gap-2 px-4 pt-4">
        {session ? (
          <>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {session.user?.name}
            </span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-300 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/auth/signin"
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <LogIn size={14} /> Sign In
          </Link>
        )}
      </div>

      {/* Hero */}
      <header className="text-center pt-6 pb-6 px-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Crown size={36} className="text-amber-500" />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            KnightArena
          </h1>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg max-w-md mx-auto">
          Play against AI or challenge friends online
        </p>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-lg space-y-6">
          {/* Game Mode Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={startGame}
              className="group relative flex flex-col items-center gap-3 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Cpu
                  size={28}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  Play vs AI
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Challenge the computer
                </p>
              </div>
            </button>

            <Link
              href="/online"
              className="group relative flex flex-col items-center gap-3 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Users
                  size={28}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">
                  Play Online
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Challenge players</p>
              </div>
            </Link>
          </div>

          {/* Extra Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/analysis"
              className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-lg transition-all"
            >
              <FlaskConical size={22} className="text-amber-500 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Analysis</h3>
                <p className="text-xs text-zinc-500">Review games</p>
              </div>
            </Link>
            <Link
              href="/friends"
              className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all"
            >
              <UserPlus size={22} className="text-purple-500 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Friends</h3>
                <p className="text-xs text-zinc-500">Invite & play</p>
              </div>
            </Link>
          </div>

          {/* Setup Panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-5">
            {/* Color Selection */}
            <div>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 block">
                Play as
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "w", label: "White", icon: "♔" },
                    { value: "random", label: "Random", icon: "🎲" },
                    { value: "b", label: "Black", icon: "♚" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setColor(opt.value)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                      color === opt.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 block">
                Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "easy", label: "Easy", color: "text-green-500" },
                    {
                      value: "medium",
                      label: "Medium",
                      color: "text-amber-500",
                    },
                    { value: "hard", label: "Hard", color: "text-red-500" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(opt.value)}
                    className={`py-3 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                      difficulty === opt.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    <span
                      className={`text-sm font-bold ${opt.color}`}
                    >
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Control */}
            <div>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 block">
                Time Control
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTimeValue(opt.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 transition-all cursor-pointer ${
                      timeValue === opt.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    <opt.icon size={16} className="text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 text-center leading-tight">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startGame}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              Start Game
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

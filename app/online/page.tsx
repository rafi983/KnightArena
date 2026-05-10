"use client";

import {
    ArrowLeft,
    Clock,
    Crown,
    Globe,
    Hourglass,
    Link2,
    Search,
    Timer,
    Users,
    Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TIME_OPTIONS = [
  { label: "Bullet 1+0", value: "1+0", icon: Zap },
  { label: "Blitz 3+0", value: "3+0", icon: Zap },
  { label: "Blitz 5+0", value: "5+0", icon: Clock },
  { label: "Rapid 10+0", value: "10+0", icon: Timer },
  { label: "Rapid 15+10", value: "15+10", icon: Timer },
  { label: "Classical 30+0", value: "30+0", icon: Hourglass },
];

export default function OnlinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [timeControl, setTimeControl] = useState("5+0");
  const [inviteCode, setInviteCode] = useState("");
  const [tab, setTab] = useState<"quick" | "private">("quick");

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <Crown size={48} className="text-amber-500 mx-auto" />
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Sign in to play online
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
            Create an account to play against other players, track your rating, and more.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/auth/signin"
              className="px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-2.5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleQuickPlay = () => {
    const params = new URLSearchParams({ mode: "matchmaking", tc: timeControl });
    router.push(`/online/game?${params.toString()}`);
  };

  const handleCreatePrivate = () => {
    const params = new URLSearchParams({ mode: "create", tc: timeControl });
    router.push(`/online/game?${params.toString()}`);
  };

  const handleJoinPrivate = () => {
    if (inviteCode.trim()) {
      const params = new URLSearchParams({ mode: "join", code: inviteCode.trim() });
      router.push(`/online/game?${params.toString()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium hidden sm:inline">Home</span>
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              Play Online
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {session.user?.name}
            </span>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              {(session.user as { rating?: number })?.rating || 1200}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Tab Switcher */}
          <div className="flex bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-1">
            <button
              onClick={() => setTab("quick")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                tab === "quick"
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Search size={16} />
              Quick Match
            </button>
            <button
              onClick={() => setTab("private")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                tab === "private"
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Link2 size={16} />
              Private Game
            </button>
          </div>

          {/* Time Control */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3 block">
              Time Control
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimeControl(opt.value)}
                  className={`flex items-center gap-2 py-3 px-3 rounded-xl border-2 transition-all cursor-pointer ${
                    timeControl === opt.value
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  <opt.icon size={16} className="text-zinc-500 shrink-0" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Area */}
          {tab === "quick" ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Globe size={24} className="text-emerald-500" />
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">
                    Quick Match
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Find an opponent near your rating
                  </p>
                </div>
              </div>
              <button
                onClick={handleQuickPlay}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                Find Match
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-5">
              {/* Create Game */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-blue-500" />
                  <h3 className="font-bold text-zinc-900 dark:text-white">
                    Create & Invite
                  </h3>
                </div>
                <button
                  onClick={handleCreatePrivate}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Create Game
                </button>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-700" />

              {/* Join Game */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Link2 size={20} className="text-purple-500" />
                  <h3 className="font-bold text-zinc-900 dark:text-white">
                    Join with Code
                  </h3>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code"
                    className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-sm"
                  />
                  <button
                    onClick={handleJoinPrivate}
                    disabled={!inviteCode.trim()}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

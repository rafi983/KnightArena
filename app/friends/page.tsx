"use client";

import { ArrowLeft, Check, Crown, Loader2, Swords, UserPlus, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { connectSocket } from "../lib/socket";

type FriendInfo = { id: string; name: string | null; email: string; rating: number };

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [friends, setFriends] = useState<{ id: string; friend: FriendInfo }[]>([]);
  const [pendingReceived, setPendingReceived] = useState<{ id: string; from: FriendInfo }[]>([]);
  const [pendingSent, setPendingSent] = useState<{ id: string; to: FriendInfo }[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [challengingId, setChallengingId] = useState<string | null>(null);
  const selfId = (session?.user as { id?: string })?.id;
  const selfName = session?.user?.name || "Player";

  useEffect(() => {
    if (session) fetchFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;

    const userId = (session.user as { id?: string }).id;
    const userName = session.user.name || "Player";
    if (!userId) return;

    const socket = connectSocket(userId, userName);

    const onGameStart = (data: { gameId: string }) => {
      sessionStorage.setItem("pendingGameState", JSON.stringify(data));
      setChallengingId(null);
      router.push(`/online/game?mode=playing&gameId=${data.gameId}`);
    };

    socket.on("game:start", onGameStart);

    return () => {
      socket.off("game:start", onGameStart);
    };
  }, [session, router]);

  const fetchFriends = async () => {
    const res = await fetch("/api/friends");
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends);
      setPendingReceived(data.pendingReceived);
      setPendingSent(data.pendingSent);
    }
    setLoading(false);
  };

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Friend request sent!");
      setEmail("");
      fetchFriends();
    } else {
      setMessage(data.error || "Error");
    }
  };

  const respond = async (friendshipId: string, action: "accept" | "decline") => {
    await fetch("/api/friends/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    });
    fetchFriends();
  };

  const sendChallenge = (friendId: string) => {
    if (!selfId) {
      setMessage("Session not ready. Please refresh and try again.");
      return;
    }

    setChallengingId(friendId);

    const socket = connectSocket(selfId, selfName);

    const onSent = (data: { challengeId: string; targetUserId: string }) => {
      if (data.targetUserId !== friendId) return;
      setMessage("Challenge sent!");
      cleanup();
      setTimeout(() => setChallengingId((prev) => (prev === friendId ? null : prev)), 1000);
    };

    const onError = (data: { message: string }) => {
      alert(data.message);
      cleanup();
      setChallengingId((prev) => (prev === friendId ? null : prev));
    };

    const timeout = setTimeout(() => {
      cleanup();
      setMessage("Could not send challenge. Please try again.");
      setChallengingId((prev) => (prev === friendId ? null : prev));
    }, 8000);

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("challenge:sent", onSent);
      socket.off("challenge:error", onError);
    };

    socket.on("challenge:sent", onSent);
    socket.on("challenge:error", onError);

    socket.emit("challenge:send", {
      targetUserId: friendId,
      timeControl: "5+0",
      challengerName: selfName,
    });
  };

  if (status === "loading" || loading) {
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
            Sign in to manage friends
          </h2>
          <Link
            href="/auth/signin"
            className="inline-block px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="flex-1 text-center text-lg font-bold text-zinc-900 dark:text-white">
            Friends
          </h1>
          <div className="w-5" />
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Add Friend */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
              <UserPlus size={18} /> Add Friend
            </h3>
            <form onSubmit={sendRequest} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Friend's email"
                required
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Send
              </button>
            </form>
            {message && (
              <p className="text-sm mt-2 text-zinc-600 dark:text-zinc-400">{message}</p>
            )}
          </div>

          {/* Pending Requests */}
          {pendingReceived.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-3">
                Pending Requests ({pendingReceived.length})
              </h3>
              <div className="space-y-2">
                {pendingReceived.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between py-2 px-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {req.from.name || req.from.email}
                      </p>
                      <p className="text-xs text-zinc-500">Rating: {req.from.rating}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => respond(req.id, "accept")}
                        className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 cursor-pointer"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => respond(req.id, "decline")}
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent Requests */}
          {pendingSent.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-3">
                Sent Requests ({pendingSent.length})
              </h3>
              <div className="space-y-2">
                {pendingSent.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between py-2 px-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {req.to.name || req.to.email}
                    </p>
                    <span className="text-xs text-zinc-400">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends List */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-3">
              Friends ({friends.length})
            </h3>
            {friends.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                No friends yet. Add someone above!
              </p>
            ) : (
              <div className="space-y-2">
                {friends.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between py-2.5 px-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {f.friend.name || f.friend.email}
                      </p>
                      <p className="text-xs text-zinc-500">Rating: {f.friend.rating}</p>
                    </div>
                    <button
                      onClick={() => sendChallenge(f.friend.id)}
                      disabled={challengingId === f.friend.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {challengingId === f.friend.id ? (
                        <><Loader2 size={14} className="animate-spin" /> Sent!</>
                      ) : (
                        <><Swords size={14} /> Challenge</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

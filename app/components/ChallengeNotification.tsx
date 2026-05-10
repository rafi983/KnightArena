"use client";

import { Swords, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { connectSocket, getSocket } from "../lib/socket";

type Challenge = {
  challengeId: string;
  from: { userId: string; userName: string };
  timeControl: string;
};

export default function ChallengeNotification() {
  const { data: session } = useSession();
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const pendingAcceptRef = useRef(false);

  const userId = (session?.user as { id?: string })?.id;
  const userName = session?.user?.name || "Player";

  useEffect(() => {
    if (!userId) return;

    const socket = connectSocket(userId, userName);

    const onChallengeReceived = (data: Challenge) => {
      setChallenge(data);
    };

    const onGameStart = (data: { gameId: string }) => {
      if (!pendingAcceptRef.current) return;
      pendingAcceptRef.current = false;
      setChallenge(null);
      // Store game state so the game page can pick it up after navigation
      sessionStorage.setItem("pendingGameState", JSON.stringify(data));
      router.push(`/online/game?mode=playing&gameId=${data.gameId}`);
    };

    const onChallengeDeclined = () => {
      // Could show a toast but for now just clear
    };

    socket.on("challenge:received", onChallengeReceived);
    socket.on("game:start", onGameStart);
    socket.on("challenge:declined", onChallengeDeclined);

    return () => {
      socket.off("challenge:received", onChallengeReceived);
      socket.off("game:start", onGameStart);
      socket.off("challenge:declined", onChallengeDeclined);
    };
  }, [userId, userName, router]);

  const handleAccept = useCallback(() => {
    if (!challenge) return;
    pendingAcceptRef.current = true;
    const socket = getSocket();
    socket.emit("challenge:accept", {
      challengeId: challenge.challengeId,
      challengerUserId: challenge.from.userId,
      timeControl: challenge.timeControl,
      accepterName: userName,
    });
    // game:start will navigate us
  }, [challenge, userName]);

  const handleDecline = useCallback(() => {
    if (!challenge) return;
    const socket = getSocket();
    socket.emit("challenge:decline", {
      challengerUserId: challenge.from.userId,
    });
    setChallenge(null);
  }, [challenge]);

  if (!challenge) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl p-5 w-80">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Swords size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-zinc-900 dark:text-white text-sm">
              Challenge!
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
              <span className="font-semibold">{challenge.from.userName}</span> wants to
              play you
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Time: {challenge.timeControl}
            </p>
          </div>
          <button
            onClick={handleDecline}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

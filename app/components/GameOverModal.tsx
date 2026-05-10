"use client";

import { Trophy, Handshake, Clock, Flag, RotateCcw, Download, Home } from "lucide-react";
import Link from "next/link";
import { GameStatus, PlayerColor } from "../lib/useChessGame";

interface GameOverModalProps {
  status: GameStatus;
  winner?: PlayerColor;
  playerColor: PlayerColor;
  onNewGame: () => void;
  onExportPgn: () => void;
}

export default function GameOverModal({
  status,
  winner,
  playerColor,
  onNewGame,
  onExportPgn,
}: GameOverModalProps) {
  const playerWon = winner === playerColor;
  const isDraw = status === "stalemate" || status === "draw";

  let title = "";
  let subtitle = "";
  let icon = <Trophy size={40} />;

  if (isDraw) {
    title = "Draw!";
    subtitle = status === "stalemate" ? "Stalemate" : "Draw by repetition or 50-move rule";
    icon = <Handshake size={40} className="text-zinc-500" />;
  } else if (status === "checkmate") {
    title = playerWon ? "You Win!" : "You Lose";
    subtitle = "Checkmate";
    icon = playerWon ? (
      <Trophy size={40} className="text-amber-500" />
    ) : (
      <Trophy size={40} className="text-zinc-400" />
    );
  } else if (status === "timeout") {
    title = playerWon ? "You Win!" : "You Lose";
    subtitle = "Time ran out";
    icon = <Clock size={40} className="text-red-500" />;
  } else if (status === "resigned") {
    title = "You Resigned";
    subtitle = "Better luck next time";
    icon = <Flag size={40} className="text-red-500" />;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-3">
          {icon}
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={onNewGame}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium cursor-pointer"
          >
            <RotateCcw size={18} />
            Play Again
          </button>
          <button
            onClick={onExportPgn}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium cursor-pointer"
          >
            <Download size={18} />
            Export PGN
          </button>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors font-medium"
          >
            <Home size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

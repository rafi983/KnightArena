"use client";

import { Flag, Download, RotateCcw } from "lucide-react";

interface GameControlsProps {
  onResign: () => void;
  onExportPgn: () => void;
  onNewGame: () => void;
  gameActive: boolean;
}

export default function GameControls({
  onResign,
  onExportPgn,
  onNewGame,
  gameActive,
}: GameControlsProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
        Controls
      </h3>
      <div className="flex flex-col gap-2">
        {gameActive ? (
          <button
            onClick={onResign}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm font-medium cursor-pointer"
          >
            <Flag size={16} />
            Resign
          </button>
        ) : (
          <button
            onClick={onNewGame}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm font-medium cursor-pointer"
          >
            <RotateCcw size={16} />
            New Game
          </button>
        )}
        <button
          onClick={onExportPgn}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium cursor-pointer"
        >
          <Download size={16} />
          Export PGN
        </button>
      </div>
    </div>
  );
}

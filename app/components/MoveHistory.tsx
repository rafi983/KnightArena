"use client";

import { Move } from "chess.js";
import { useRef, useEffect } from "react";

interface MoveHistoryProps {
  moves: Move[];
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  // Group moves into pairs (white + black)
  const movePairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i].san,
      black: moves[i + 1]?.san,
    });
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Moves
        </h3>
      </div>
      <div
        ref={scrollRef}
        className="max-h-64 lg:max-h-96 overflow-y-auto p-2"
      >
        {movePairs.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-4">
            No moves yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {movePairs.map((pair) => (
              <div
                key={pair.number}
                className="flex items-center text-sm font-mono"
              >
                <span className="w-8 text-right text-zinc-400 text-xs mr-2">
                  {pair.number}.
                </span>
                <span className="w-16 text-zinc-900 dark:text-white font-medium">
                  {pair.white}
                </span>
                <span className="w-16 text-zinc-900 dark:text-white font-medium">
                  {pair.black || ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

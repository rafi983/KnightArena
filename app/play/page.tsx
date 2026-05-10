"use client";

import { Square } from "chess.js";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";
import ChessBoard from "../components/ChessBoard";
import GameClock from "../components/GameClock";
import GameControls from "../components/GameControls";
import GameOverModal from "../components/GameOverModal";
import MoveHistory from "../components/MoveHistory";
import ThemePicker from "../components/ThemePicker";
import { Difficulty } from "../lib/ai";
import { BoardTheme, DEFAULT_THEME } from "../lib/themes";
import { GameStatus, PlayerColor, TIME_CONTROLS, useChessGame } from "../lib/useChessGame";

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-zinc-500">Loading game...</p>
        </div>
      }
    >
      <PlayContent />
    </Suspense>
  );
}

function PlayContent() {
  const searchParams = useSearchParams();

  const colorParam = searchParams.get("color") || "w";
  const difficultyParam = (searchParams.get("difficulty") || "medium") as Difficulty;
  const timeParam = parseInt(searchParams.get("time") || "3", 10);

  const playerColor = useMemo(() => {
    return (colorParam === "random"
      ? Math.random() < 0.5 ? "w" : "b"
      : colorParam) as PlayerColor;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeControl = TIME_CONTROLS.find(
    (tc) => tc.baseTime === timeParam * 60
  ) || TIME_CONTROLS[7]; // Default no timer

  const [gameOver, setGameOver] = useState<{
    status: GameStatus;
    winner?: PlayerColor;
  } | null>(null);

  const handleGameEnd = useCallback(
    (status: GameStatus, winner?: PlayerColor) => {
      setGameOver({ status, winner });
    },
    []
  );

  const {
    game,
    moveHistory,
    status,
    lastMove,
    whiteTime,
    blackTime,
    isThinking,
    makeMove,
    resign,
    getPgn,
    resetGame,
    hasTimer,
  } = useChessGame({
    playerColor,
    difficulty: difficultyParam,
    timeControl,
    onGameEnd: handleGameEnd,
  });

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      return makeMove(from, to, promotion);
    },
    [makeMove]
  );

  const handleNewGame = () => {
    setGameOver(null);
    resetGame();
  };

  const handleExportPgn = () => {
    const pgn = getPgn();
    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chess-game-${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [boardTheme, setBoardTheme] = useState<BoardTheme>(DEFAULT_THEME);

  const aiColor = playerColor === "w" ? "b" : "w";
  const isPlayerTurn = game.turn() === playerColor;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              vs AI ({difficultyParam.charAt(0).toUpperCase() + difficultyParam.slice(1)})
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {timeControl.label} • Playing as {playerColor === "w" ? "White" : "Black"}
            </p>
          </div>
          <ThemePicker currentTheme={boardTheme} onThemeChange={setBoardTheme} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Panel - visible on large screens */}
        <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
          <MoveHistory moves={moveHistory} />
        </div>

        {/* Center - Chess Board */}
        <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
          {/* Opponent info + clock */}
          <div className="w-full max-w-[min(90vw,560px)] flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-sm font-bold">
                {aiColor === "w" ? "♔" : "♚"}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  Computer
                </p>
                <p className="text-xs text-zinc-500">
                  {isThinking && game.turn() === aiColor ? "Thinking..." : ""}
                </p>
              </div>
            </div>
            {hasTimer && (
              <GameClock
                time={aiColor === "w" ? whiteTime : blackTime}
                isActive={game.turn() === aiColor && status === "playing"}
                isLow={(aiColor === "w" ? whiteTime : blackTime) < 30}
              />
            )}
          </div>

          <ChessBoard
            game={game}
            onMove={handleMove}
            flipped={playerColor === "b"}
            disabled={!isPlayerTurn || status !== "playing"}
            lastMove={lastMove}
            theme={boardTheme}
          />

          {/* Player info + clock */}
          <div className="w-full max-w-[min(90vw,560px)] flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white">
                {playerColor === "w" ? "♔" : "♚"}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  You
                </p>
                <p className="text-xs text-zinc-500">
                  {isPlayerTurn && status === "playing" ? "Your turn" : ""}
                </p>
              </div>
            </div>
            {hasTimer && (
              <GameClock
                time={playerColor === "w" ? whiteTime : blackTime}
                isActive={isPlayerTurn && status === "playing"}
                isLow={(playerColor === "w" ? whiteTime : blackTime) < 30}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="flex flex-col gap-4 w-full lg:w-72 shrink-0">
          {/* Move history on mobile */}
          <div className="lg:hidden">
            <MoveHistory moves={moveHistory} />
          </div>
          <GameControls
            onResign={resign}
            onExportPgn={handleExportPgn}
            onNewGame={handleNewGame}
            gameActive={status === "playing"}
          />
        </div>
      </main>

      {/* Game Over Modal */}
      {gameOver && (
        <GameOverModal
          status={gameOver.status}
          winner={gameOver.winner}
          playerColor={playerColor}
          onNewGame={handleNewGame}
          onExportPgn={handleExportPgn}
        />
      )}
    </div>
  );
}

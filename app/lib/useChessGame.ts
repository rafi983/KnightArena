"use client";

import { Chess, Move, Square } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Difficulty, getBestMove } from "./ai";

export type TimeControl = {
  label: string;
  baseTime: number; // in seconds
  increment: number; // in seconds
};

export const TIME_CONTROLS: TimeControl[] = [
  { label: "Bullet 1+0", baseTime: 60, increment: 0 },
  { label: "Blitz 3+0", baseTime: 180, increment: 0 },
  { label: "Blitz 3+2", baseTime: 180, increment: 2 },
  { label: "Blitz 5+0", baseTime: 300, increment: 0 },
  { label: "Rapid 10+0", baseTime: 600, increment: 0 },
  { label: "Rapid 15+10", baseTime: 900, increment: 10 },
  { label: "Classical 30+0", baseTime: 1800, increment: 0 },
  { label: "No Timer", baseTime: 0, increment: 0 },
];

export type GameStatus =
  | "idle"
  | "playing"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "timeout"
  | "resigned";

export type PlayerColor = "w" | "b";

interface UseChessGameOptions {
  playerColor: PlayerColor;
  difficulty: Difficulty;
  timeControl: TimeControl;
  onGameEnd?: (status: GameStatus, winner?: PlayerColor) => void;
}

export function useChessGame({
  playerColor,
  difficulty,
  timeControl,
  onGameEnd,
}: UseChessGameOptions) {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [lastMove, setLastMove] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [whiteTime, setWhiteTime] = useState(timeControl.baseTime);
  const [blackTime, setBlackTime] = useState(timeControl.baseTime);
  const [isThinking, setIsThinking] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const aiThinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameRef = useRef(game);
  const statusRef = useRef(status);
  const whiteTimeRef = useRef(whiteTime);
  const blackTimeRef = useRef(blackTime);
  gameRef.current = game;
  statusRef.current = status;
  whiteTimeRef.current = whiteTime;
  blackTimeRef.current = blackTime;

  const hasTimer = timeControl.baseTime > 0;

  // Timer logic
  useEffect(() => {
    if (!hasTimer || status !== "playing") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const currentTurn = gameRef.current.turn();
      if (currentTurn === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setStatus("timeout");
            onGameEnd?.("timeout", "b");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setStatus("timeout");
            onGameEnd?.("timeout", "w");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasTimer, status, onGameEnd]);

  // AI move
  const makeAiMove = useCallback(() => {
    if (status !== "playing") return;

    if (aiThinkTimeoutRef.current) {
      clearTimeout(aiThinkTimeoutRef.current);
      aiThinkTimeoutRef.current = null;
    }

    setIsThinking(true);

    const currentGame = gameRef.current;
    const aiTurn = currentGame.turn();
    const aiRemaining = aiTurn === "w" ? whiteTimeRef.current : blackTimeRef.current;

    // Human-like think profile by difficulty (with jitter)
    let thinkTime =
      difficulty === "easy"
        ? 220 + Math.floor(Math.random() * 380)
        : difficulty === "medium"
          ? 450 + Math.floor(Math.random() * 650)
          : 800 + Math.floor(Math.random() * 1100);

    // Spend a bit more time in tactical/check positions
    if (currentGame.inCheck()) {
      thinkTime += difficulty === "hard" ? 300 : 180;
    }

    // Under time pressure, move faster
    if (hasTimer) {
      if (aiRemaining <= 10) {
        thinkTime = Math.min(thinkTime, 180);
      } else if (aiRemaining <= 30) {
        thinkTime = Math.min(thinkTime, 320);
      } else if (aiRemaining <= 60) {
        thinkTime = Math.min(thinkTime, 500);
      }
    }

    aiThinkTimeoutRef.current = setTimeout(() => {
      if (statusRef.current !== "playing") {
        setIsThinking(false);
        return;
      }

      const liveGame = gameRef.current;
      const aiMove = getBestMove(liveGame, difficulty);

      if (aiMove) {
        const newGame = new Chess(liveGame.fen());
        newGame.move(aiMove);

        gameRef.current = newGame;
        setGame(newGame);
        setMoveHistory((prev) => [...prev, aiMove]);
        setLastMove({ from: aiMove.from as Square, to: aiMove.to as Square });

        // Add increment
        if (hasTimer && timeControl.increment > 0) {
          if (newGame.turn() === "w") {
            setBlackTime((prev) => prev + timeControl.increment);
          } else {
            setWhiteTime((prev) => prev + timeControl.increment);
          }
        }

        // Check game end
        if (newGame.isCheckmate()) {
          setStatus("checkmate");
          onGameEnd?.("checkmate", liveGame.turn() === "w" ? "w" : "b");
        } else if (newGame.isStalemate()) {
          setStatus("stalemate");
          onGameEnd?.("stalemate");
        } else if (newGame.isDraw()) {
          setStatus("draw");
          onGameEnd?.("draw");
        }
      }

      setIsThinking(false);
      aiThinkTimeoutRef.current = null;
    }, thinkTime);
  }, [difficulty, status, hasTimer, timeControl.increment, onGameEnd]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (status !== "playing") return;
    if (game.turn() !== playerColor && !isThinking) {
      makeAiMove();
    }
  }, [game, playerColor, status, isThinking, makeAiMove]);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      if (status !== "playing") return false;
      if (game.turn() !== playerColor) return false;

      const newGame = new Chess(game.fen());
      try {
        const move = newGame.move({ from, to, promotion: promotion || undefined });
        if (!move) return false;

        gameRef.current = newGame;
        setGame(newGame);
        setMoveHistory((prev) => [...prev, move]);
        setLastMove({ from, to });

        // Add increment
        if (hasTimer && timeControl.increment > 0) {
          if (playerColor === "w") {
            setWhiteTime((prev) => prev + timeControl.increment);
          } else {
            setBlackTime((prev) => prev + timeControl.increment);
          }
        }

        // Check game end
        if (newGame.isCheckmate()) {
          setStatus("checkmate");
          onGameEnd?.("checkmate", playerColor);
        } else if (newGame.isStalemate()) {
          setStatus("stalemate");
          onGameEnd?.("stalemate");
        } else if (newGame.isDraw()) {
          setStatus("draw");
          onGameEnd?.("draw");
        }

        return true;
      } catch {
        return false;
      }
    },
    [game, playerColor, status, hasTimer, timeControl.increment, onGameEnd]
  );

  const resign = useCallback(() => {
    setStatus("resigned");
    const winner = playerColor === "w" ? "b" : "w";
    onGameEnd?.("resigned", winner);
  }, [playerColor, onGameEnd]);

  const getPgn = useCallback(() => {
    return game.pgn();
  }, [game]);

  const resetGame = useCallback(() => {
    if (aiThinkTimeoutRef.current) {
      clearTimeout(aiThinkTimeoutRef.current);
      aiThinkTimeoutRef.current = null;
    }

    const newGame = new Chess();
    gameRef.current = newGame;
    setGame(newGame);
    setMoveHistory([]);
    setStatus("playing");
    setLastMove(null);
    setWhiteTime(timeControl.baseTime);
    setBlackTime(timeControl.baseTime);
    setIsThinking(false);
  }, [timeControl.baseTime]);

  useEffect(() => {
    return () => {
      if (aiThinkTimeoutRef.current) {
        clearTimeout(aiThinkTimeoutRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
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
  };
}

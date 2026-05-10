"use client";

import { Chess, Square } from "chess.js";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import ChessBoard from "../../components/ChessBoard";
import GameClock from "../../components/GameClock";
import GameControls from "../../components/GameControls";
import MoveHistory from "../../components/MoveHistory";
import ThemePicker from "../../components/ThemePicker";
import { connectSocket } from "../../lib/socket";
import { BoardTheme, DEFAULT_THEME } from "../../lib/themes";

type GameState = {
  gameId: string;
  white: { id: string; name: string };
  black: { id: string; name: string };
  fen: string;
  timeControl: string;
  whiteTime: number;
  blackTime: number;
};

type GamePhase = "connecting" | "waiting" | "playing" | "finished";

export default function OnlineGamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-zinc-500">Loading...</p>
        </div>
      }
    >
      <OnlineGameContent />
    </Suspense>
  );
}

function OnlineGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const mode = searchParams.get("mode") || "matchmaking";
  const tc = searchParams.get("tc") || "5+0";
  const joinCode = searchParams.get("code") || "";
  const queryGameId = searchParams.get("gameId") || "";

  const [phase, setPhase] = useState<GamePhase>("connecting");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState<{ san: string }[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [result, setResult] = useState<{ result: string; reason: string } | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(DEFAULT_THEME);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [queuePoolSize, setQueuePoolSize] = useState<number | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const gameIdRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const userId = (session?.user as { id?: string })?.id || "";
  const userName = session?.user?.name || "Player";
  const userRating = (session?.user as { rating?: number })?.rating || 1200;

  const playerColor =
    gameState?.white.id === userId ? "w" : gameState?.black.id === userId ? "b" : null;
  const isPlayerTurn = playerColor === game.turn();

  useEffect(() => {
    if (phase !== "waiting" || mode !== "matchmaking") {
      setWaitSeconds(0);
      return;
    }

    const id = setInterval(() => {
      setWaitSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [phase, mode]);

  // Timer countdown
  useEffect(() => {
    if (phase !== "playing" || !gameState) return;

    timerRef.current = setInterval(() => {
      const currentTurn = game.turn();
      if (currentTurn === "w") {
        setWhiteTime((prev) => Math.max(0, prev - 1));
      } else {
        setBlackTime((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, gameState, game]);

  // Socket connection and events
  useEffect(() => {
    if (!session?.user) return;

    const socket = connectSocket(userId, userName);
    socketRef.current = socket;

    const startFlow = () => {
      socket.emit("register", { userId, userName });

      // If we already know an active game, always rejoin it first.
      if (queryGameId) {
        gameIdRef.current = queryGameId;
        setPhase((prev) =>
          prev === "playing" || prev === "finished" ? prev : "waiting"
        );
        socket.emit("game:rejoin", { gameId: queryGameId });
        return;
      }

      if (mode === "playing") {
        // Arrived from a challenge accept — load game state from sessionStorage
        const stored = sessionStorage.getItem("pendingGameState");
        if (stored) {
          sessionStorage.removeItem("pendingGameState");
          const data = JSON.parse(stored) as GameState;
          gameIdRef.current = data.gameId;
          setGameState(data);
          setGame(new Chess(data.fen));
          setWhiteTime(data.whiteTime);
          setBlackTime(data.blackTime);
          setPhase("playing");
          setOpponentDisconnected(false);
          // Join the socket room for this game
          socket.emit("game:rejoin", { gameId: data.gameId });
        } else if (queryGameId) {
          // Persistent path (refresh/new tab): fetch state from server using gameId
          gameIdRef.current = queryGameId;
          setPhase((prev) =>
            prev === "playing" || prev === "finished" ? prev : "waiting"
          );
          socket.emit("game:rejoin", { gameId: queryGameId });
        } else {
          setPhase((prev) =>
            prev === "playing" || prev === "finished" ? prev : "waiting"
          );
        }
      } else if (mode === "matchmaking") {
        setPhase("waiting");
        socket.emit("matchmaking:join", {
          userId,
          userName,
          rating: userRating,
          timeControl: tc,
        });
      } else if (mode === "create") {
        setPhase("waiting");
        socket.emit("game:create", { userId, userName, timeControl: tc });
      } else if (mode === "join") {
        setPhase("waiting");
        socket.emit("game:join", { userId, userName, inviteCode: joinCode });
      }
    };

    const onConnect = () => startFlow();
    const onMatchmakingWaiting = (data?: { position?: number; poolSize?: number }) => {
      setPhase("waiting");
      if (typeof data?.position === "number") setQueuePosition(data.position);
      if (typeof data?.poolSize === "number") setQueuePoolSize(data.poolSize);
    };

    const onGameCreated = (data: { gameId: string; inviteCode: string }) => {
      gameIdRef.current = data.gameId;
      setInviteCode(data.inviteCode);
      setPhase("waiting");
    };

    const onGameState = (data: GameState) => {
      gameIdRef.current = data.gameId;
      setGameState(data);
      setGame(new Chess(data.fen));
      setWhiteTime(data.whiteTime);
      setBlackTime(data.blackTime);
      setPhase("playing");
      setOpponentDisconnected(false);
      if (mode !== "playing" || queryGameId !== data.gameId) {
        router.replace(`/online/game?mode=playing&gameId=${data.gameId}`);
      }
    };

    const onGameStart = (data: GameState) => {
      gameIdRef.current = data.gameId;
      setGameState(data);
      setGame(new Chess(data.fen));
      setWhiteTime(data.whiteTime);
      setBlackTime(data.blackTime);
      setPhase("playing");
      setOpponentDisconnected(false);
      if (mode !== "playing" || queryGameId !== data.gameId) {
        router.replace(`/online/game?mode=playing&gameId=${data.gameId}`);
      }
    };

    const onGameMoved = (data: {
      from: string;
      to: string;
      promotion?: string;
      san: string;
      fen: string;
      whiteTime: number;
      blackTime: number;
    }) => {
      setGame(new Chess(data.fen));
      setMoveHistory((prev) => [...prev, { san: data.san }]);
      setLastMove({ from: data.from as Square, to: data.to as Square });
      setWhiteTime(data.whiteTime);
      setBlackTime(data.blackTime);
    };

    const onGameOver = (data: { result: string; reason: string; pgn: string }) => {
      setResult({ result: data.result, reason: data.reason });
      setPhase("finished");
      if (timerRef.current) clearInterval(timerRef.current);
    };

    const onOpponentDisconnected = () => {
      setOpponentDisconnected(true);
    };

    const onGameError = (data: { message: string }) => {
      alert(data.message);
    };

    socket.on("connect", onConnect);
    socket.on("matchmaking:waiting", onMatchmakingWaiting);
    socket.on("game:created", onGameCreated);
    socket.on("game:state", onGameState);
    socket.on("game:start", onGameStart);
    socket.on("game:moved", onGameMoved);
    socket.on("game:over", onGameOver);
    socket.on("game:opponent_disconnected", onOpponentDisconnected);
    socket.on("game:error", onGameError);

    if (socket.connected) {
      startFlow();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("matchmaking:waiting", onMatchmakingWaiting);
      socket.off("game:created", onGameCreated);
      socket.off("game:state", onGameState);
      socket.off("game:start", onGameStart);
      socket.off("game:moved", onGameMoved);
      socket.off("game:over", onGameOver);
      socket.off("game:opponent_disconnected", onOpponentDisconnected);
      socket.off("game:error", onGameError);
      if (mode === "matchmaking") {
        socket.emit("matchmaking:leave");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, mode, queryGameId, router]);

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      if (!isPlayerTurn || phase !== "playing") return false;

      const newGame = new Chess(game.fen());
      try {
        const move = newGame.move({ from, to, promotion: promotion || undefined });
        if (!move) return false;

        socketRef.current?.emit("game:move", {
          gameId: gameIdRef.current,
          from,
          to,
          promotion,
        });

        return true;
      } catch {
        return false;
      }
    },
    [game, isPlayerTurn, phase]
  );

  const handleResign = () => {
    socketRef.current?.emit("game:resign", { gameId: gameIdRef.current });
  };

  const handleExportPgn = () => {
    const replay = new Chess();
    for (const m of moveHistory) {
      replay.move(m.san);
    }
    const pgn = replay.pgn();
    const blob = new Blob([pgn], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chess-online-${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Waiting/Connecting screens
  if (phase === "connecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-emerald-500 mx-auto" />
          <p className="text-zinc-500">Connecting...</p>
        </div>
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 max-w-sm w-full text-center space-y-4">
          <Loader2 size={40} className="animate-spin text-emerald-500 mx-auto" />
          {mode === "matchmaking" && (
            <>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Finding opponent...
              </h2>
              <p className="text-sm text-zinc-500">Time control: {tc}</p>
              <p className="text-xs text-zinc-500">
                Searching for {Math.floor(waitSeconds / 60)}m {waitSeconds % 60}s
              </p>
              {queuePoolSize !== null && queuePoolSize > 0 && (
                <p className="text-xs text-zinc-500">
                  Active pool: {queuePoolSize} player{queuePoolSize === 1 ? "" : "s"}
                  {queuePosition ? ` • Your position: ${queuePosition}` : ""}
                </p>
              )}
              {waitSeconds >= 25 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Expanding rating range to find a match faster...
                </p>
              )}
            </>
          )}
          {mode === "create" && inviteCode && (
            <>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Waiting for opponent
              </h2>
              <p className="text-sm text-zinc-500 mb-3">
                Share this code with your friend:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg text-lg font-mono font-bold text-zinc-900 dark:text-white">
                  {inviteCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check size={18} className="text-emerald-500" />
                  ) : (
                    <Copy size={18} className="text-zinc-500" />
                  )}
                </button>
              </div>
            </>
          )}
          {mode === "join" && (
            <>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                Joining game...
              </h2>
              <p className="text-sm text-zinc-500">Code: {joinCode}</p>
            </>
          )}
          <Link
            href="/online"
            className="inline-block mt-4 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Cancel
          </Link>
        </div>
      </div>
    );
  }

  // Game screen
  const opponentName =
    playerColor === "w" ? gameState?.black.name : gameState?.white.name;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link
            href="/online"
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              vs {opponentName || "Opponent"}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {tc} • {playerColor === "w" ? "White" : "Black"}
              {opponentDisconnected && (
                <span className="text-red-500 ml-2">⚠ Opponent disconnected</span>
              )}
            </p>
          </div>
          <ThemePicker currentTheme={boardTheme} onThemeChange={setBoardTheme} />
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 p-4 max-w-7xl mx-auto w-full">
        <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
          <MoveHistory moves={moveHistory as any} />
        </div>

        <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
          {/* Opponent info */}
          <div className="w-full max-w-[min(90vw,560px)] flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-sm font-bold">
                {playerColor === "w" ? "♚" : "♔"}
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {opponentName || "Opponent"}
              </p>
            </div>
            <GameClock
              time={playerColor === "w" ? blackTime : whiteTime}
              isActive={!isPlayerTurn && phase === "playing"}
              isLow={(playerColor === "w" ? blackTime : whiteTime) < 30}
            />
          </div>

          <ChessBoard
            game={game}
            onMove={handleMove}
            flipped={playerColor === "b"}
            disabled={!isPlayerTurn || phase !== "playing"}
            lastMove={lastMove}
            theme={boardTheme}
          />

          {/* Player info */}
          <div className="w-full max-w-[min(90vw,560px)] flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white">
                {playerColor === "w" ? "♔" : "♚"}
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {userName} (You)
              </p>
            </div>
            <GameClock
              time={playerColor === "w" ? whiteTime : blackTime}
              isActive={isPlayerTurn && phase === "playing"}
              isLow={(playerColor === "w" ? whiteTime : blackTime) < 30}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full lg:w-72 shrink-0">
          <div className="lg:hidden">
            <MoveHistory moves={moveHistory as any} />
          </div>
          <GameControls
            onResign={handleResign}
            onExportPgn={handleExportPgn}
            onNewGame={() => window.location.href = "/online"}
            gameActive={phase === "playing"}
          />
        </div>
      </main>

      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {result.result === "draw"
                  ? "Draw!"
                  : (result.result === "white" && playerColor === "w") ||
                    (result.result === "black" && playerColor === "b")
                  ? "You Win!"
                  : "You Lose"}
              </h2>
              <p className="text-sm text-zinc-500 capitalize">{result.reason}</p>
            </div>
            <div className="flex flex-col gap-2 mt-6">
              <Link
                href="/online"
                className="flex items-center justify-center w-full px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
              >
                Play Again
              </Link>
              <button
                onClick={handleExportPgn}
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium cursor-pointer"
              >
                Export PGN
              </button>
              <Link
                href="/"
                className="flex items-center justify-center w-full px-4 py-3 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors font-medium"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Chess } from "chess.js";
import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

interface GameRoom {
  id: string;
  white: string | null;
  black: string | null;
  whiteSocketId: string | null;
  blackSocketId: string | null;
  chess: Chess;
  timeControl: { baseTime: number; increment: number };
  whiteTime: number;
  blackTime: number;
  timerInterval: NodeJS.Timeout | null;
  status: "waiting" | "active" | "finished";
  moves: string[];
  inviteCode: string | null;
  lastMoveTime: number;
}

interface QueueEntry {
  socketId: string;
  userId: string;
  userName: string;
  rating: number;
  timeControl: string;
  joinedAt: number;
}

const games = new Map<string, GameRoom>();
const matchmakingQueue: QueueEntry[] = [];
const userSockets = new Map<string, string>(); // userId -> socketId

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function parseTimeControl(tc: string): { baseTime: number; increment: number } {
  const normalized = tc.replace(/\s+/g, "+").trim();
  const [base, inc] = normalized.split("+").map(Number);
  return { baseTime: (base || 5) * 60, increment: inc || 0 };
}

function normalizeTimeControl(tc: string): string {
  const { baseTime, increment } = parseTimeControl(tc);
  return `${Math.floor(baseTime / 60)}+${increment}`;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Register user
    socket.on("register", (data: { userId: string; userName: string }) => {
      userSockets.set(data.userId, socket.id);
      socket.data.userId = data.userId;
      socket.data.userName = data.userName;
    });

    // Join matchmaking queue
    socket.on(
      "matchmaking:join",
      (data: { userId: string; userName: string; rating: number; timeControl: string }) => {
        if (!data.userId) {
          socket.emit("game:error", { message: "Please sign in to play online." });
          return;
        }

        const normalizedTc = normalizeTimeControl(data.timeControl);

        // Remove if already in queue
        const existingIdx = matchmakingQueue.findIndex((q) => q.userId === data.userId);
        if (existingIdx !== -1) matchmakingQueue.splice(existingIdx, 1);

        const entry: QueueEntry = {
          socketId: socket.id,
          userId: data.userId,
          userName: data.userName,
          rating: data.rating,
          timeControl: normalizedTc,
          joinedAt: Date.now(),
        };
        matchmakingQueue.push(entry);

        // Try to find a match
        const match = matchmakingQueue.find(
          (q) => {
            if (q.userId === data.userId) return false;
            if (q.timeControl !== normalizedTc) return false;

            const waitedSeconds = Math.floor((Date.now() - entry.joinedAt) / 1000);
            const ratingWindow = Math.min(1200, 200 + waitedSeconds * 30);

            return Math.abs(q.rating - data.rating) <= ratingWindow;
          }
        );

        if (match) {
          // Remove both from queue
          matchmakingQueue.splice(matchmakingQueue.indexOf(entry), 1);
          matchmakingQueue.splice(matchmakingQueue.indexOf(match), 1);

          // Create game
          const tc = parseTimeControl(normalizedTc);
          const gameId = generateId();
          const isWhite = Math.random() < 0.5;

          const game: GameRoom = {
            id: gameId,
            white: isWhite ? data.userId : match.userId,
            black: isWhite ? match.userId : data.userId,
            whiteSocketId: isWhite ? socket.id : match.socketId,
            blackSocketId: isWhite ? match.socketId : socket.id,
            chess: new Chess(),
            timeControl: tc,
            whiteTime: tc.baseTime,
            blackTime: tc.baseTime,
            timerInterval: null,
            status: "active",
            moves: [],
            inviteCode: null,
            lastMoveTime: Date.now(),
          };

          games.set(gameId, game);

          // Notify both players
          socket.join(gameId);
          io.sockets.sockets.get(match.socketId)?.join(gameId);

          const gameState = {
            gameId,
            white: { id: isWhite ? data.userId : match.userId, name: isWhite ? data.userName : match.userName },
            black: { id: isWhite ? match.userId : data.userId, name: isWhite ? match.userName : data.userName },
            fen: game.chess.fen(),
            timeControl: normalizedTc,
            whiteTime: game.whiteTime,
            blackTime: game.blackTime,
          };

          io.to(gameId).emit("game:start", gameState);
          startGameTimer(io, gameId);
        } else {
          const sameTcQueue = matchmakingQueue.filter((q) => q.timeControl === normalizedTc);
          const position = sameTcQueue.findIndex((q) => q.socketId === socket.id) + 1;
          socket.emit("matchmaking:waiting", {
            position: Math.max(1, position),
            poolSize: sameTcQueue.length,
            timeControl: normalizedTc,
          });
        }
      }
    );

    // Leave matchmaking
    socket.on("matchmaking:leave", () => {
      const idx = matchmakingQueue.findIndex((q) => q.socketId === socket.id);
      if (idx !== -1) matchmakingQueue.splice(idx, 1);
    });

    // Create private game (invite)
    socket.on(
      "game:create",
      (data: { userId: string; userName: string; timeControl: string }) => {
        const tc = parseTimeControl(data.timeControl);
        const gameId = generateId();
        const inviteCode = generateId();

        const game: GameRoom = {
          id: gameId,
          white: data.userId,
          black: null,
          whiteSocketId: socket.id,
          blackSocketId: null,
          chess: new Chess(),
          timeControl: tc,
          whiteTime: tc.baseTime,
          blackTime: tc.baseTime,
          timerInterval: null,
          status: "waiting",
          moves: [],
          inviteCode,
          lastMoveTime: 0,
        };

        games.set(gameId, game);
        socket.join(gameId);
        socket.emit("game:created", { gameId, inviteCode });
      }
    );

    // Join private game via invite code
    socket.on(
      "game:join",
      (data: { userId: string; userName: string; inviteCode: string }) => {
        const game = Array.from(games.values()).find(
          (g) => g.inviteCode === data.inviteCode && g.status === "waiting"
        );

        if (!game) {
          socket.emit("game:error", { message: "Game not found or already started" });
          return;
        }

        if (game.white === data.userId) {
          socket.emit("game:error", { message: "Cannot join your own game" });
          return;
        }

        game.black = data.userId;
        game.blackSocketId = socket.id;
        game.status = "active";
        game.lastMoveTime = Date.now();

        socket.join(game.id);

        const gameState = {
          gameId: game.id,
          white: { id: game.white, name: "Host" },
          black: { id: game.black, name: data.userName },
          fen: game.chess.fen(),
          timeControl: `${game.timeControl.baseTime / 60}+${game.timeControl.increment}`,
          whiteTime: game.whiteTime,
          blackTime: game.blackTime,
        };

        io.to(game.id).emit("game:start", gameState);
        startGameTimer(io, game.id);
      }
    );

    // Make a move
    socket.on(
      "game:move",
      (data: { gameId: string; from: string; to: string; promotion?: string }) => {
        const game = games.get(data.gameId);
        if (!game || game.status !== "active") return;

        const isWhiteTurn = game.chess.turn() === "w";
        const isPlayerTurn = isWhiteTurn
          ? game.whiteSocketId === socket.id
          : game.blackSocketId === socket.id;

        if (!isPlayerTurn) return;

        try {
          const move = game.chess.move({
            from: data.from,
            to: data.to,
            promotion: data.promotion,
          });

          if (!move) return;

          // Update time
          const now = Date.now();
          if (game.lastMoveTime > 0) {
            const elapsed = Math.floor((now - game.lastMoveTime) / 1000);
            if (isWhiteTurn) {
              game.whiteTime = Math.max(0, game.whiteTime - elapsed) + game.timeControl.increment;
            } else {
              game.blackTime = Math.max(0, game.blackTime - elapsed) + game.timeControl.increment;
            }
          }
          game.lastMoveTime = now;

          game.moves.push(move.san);

          // Broadcast move
          io.to(data.gameId).emit("game:moved", {
            from: data.from,
            to: data.to,
            promotion: data.promotion,
            san: move.san,
            fen: game.chess.fen(),
            whiteTime: game.whiteTime,
            blackTime: game.blackTime,
          });

          // Check game end
          if (game.chess.isGameOver()) {
            let result = "draw";
            let reason = "draw";
            if (game.chess.isCheckmate()) {
              result = isWhiteTurn ? "white" : "black";
              reason = "checkmate";
            } else if (game.chess.isStalemate()) {
              reason = "stalemate";
            } else if (game.chess.isThreefoldRepetition()) {
              reason = "repetition";
            }

            endGame(io, game, result, reason);
          }
        } catch {
          // Invalid move, ignore
        }
      }
    );

    // Rejoin a game room (after page navigation)
    socket.on("game:rejoin", (data: { gameId: string }) => {
      const game = games.get(data.gameId);
      if (!game) return;
      socket.join(data.gameId);
      // Update socket ID references
      if (game.white === socket.data.userId) {
        game.whiteSocketId = socket.id;
      } else if (game.black === socket.data.userId) {
        game.blackSocketId = socket.id;
      }

      const whiteName = game.whiteSocketId
        ? io.sockets.sockets.get(game.whiteSocketId)?.data.userName || "White"
        : "White";
      const blackName = game.blackSocketId
        ? io.sockets.sockets.get(game.blackSocketId)?.data.userName || "Black"
        : "Black";

      socket.emit("game:state", {
        gameId: game.id,
        white: { id: game.white || "", name: whiteName },
        black: { id: game.black || "", name: blackName },
        fen: game.chess.fen(),
        timeControl: `${Math.floor(game.timeControl.baseTime / 60)}+${game.timeControl.increment}`,
        whiteTime: game.whiteTime,
        blackTime: game.blackTime,
      });
    });

    // Challenge a friend
    socket.on(
      "challenge:send",
      (data: { targetUserId: string; timeControl: string; challengerName: string }) => {
        const targetSocketId = userSockets.get(data.targetUserId);
        if (!targetSocketId) {
          socket.emit("challenge:error", { message: "Player is offline" });
          return;
        }

        const challengeId = generateId();
        const challengeData = {
          challengeId,
          from: {
            userId: socket.data.userId,
            userName: data.challengerName,
          },
          timeControl: data.timeControl,
        };

        // Send to target
        io.to(targetSocketId).emit("challenge:received", challengeData);
        socket.emit("challenge:sent", { challengeId, targetUserId: data.targetUserId });
      }
    );

    // Accept a challenge
    socket.on(
      "challenge:accept",
      (data: { challengeId: string; challengerUserId: string; timeControl: string; accepterName: string }) => {
        const challengerSocketId = userSockets.get(data.challengerUserId);
        if (!challengerSocketId) {
          socket.emit("challenge:error", { message: "Challenger disconnected" });
          return;
        }

        // Create the game
        const tc = parseTimeControl(data.timeControl);
        const gameId = generateId();
        const isWhite = Math.random() < 0.5;

        const game: GameRoom = {
          id: gameId,
          white: isWhite ? data.challengerUserId : socket.data.userId,
          black: isWhite ? socket.data.userId : data.challengerUserId,
          whiteSocketId: isWhite ? challengerSocketId : socket.id,
          blackSocketId: isWhite ? socket.id : challengerSocketId,
          chess: new Chess(),
          timeControl: tc,
          whiteTime: tc.baseTime,
          blackTime: tc.baseTime,
          timerInterval: null,
          status: "active",
          moves: [],
          inviteCode: null,
          lastMoveTime: Date.now(),
        };

        games.set(gameId, game);

        socket.join(gameId);
        io.sockets.sockets.get(challengerSocketId)?.join(gameId);

        const challengerName = io.sockets.sockets.get(challengerSocketId)?.data.userName || "Opponent";

        const gameState = {
          gameId,
          white: {
            id: game.white!,
            name: isWhite ? challengerName : data.accepterName,
          },
          black: {
            id: game.black!,
            name: isWhite ? data.accepterName : challengerName,
          },
          fen: game.chess.fen(),
          timeControl: data.timeControl,
          whiteTime: game.whiteTime,
          blackTime: game.blackTime,
        };

        // Emit directly to both participants first (more reliable than room-only)
        io.to(socket.id).emit("game:start", gameState);
        io.to(challengerSocketId).emit("game:start", gameState);
        // Also emit to room for any additional listeners
        io.to(gameId).emit("game:start", gameState);
        startGameTimer(io, gameId);
      }
    );

    // Decline a challenge
    socket.on(
      "challenge:decline",
      (data: { challengerUserId: string }) => {
        const challengerSocketId = userSockets.get(data.challengerUserId);
        if (challengerSocketId) {
          io.to(challengerSocketId).emit("challenge:declined", {
            by: socket.data.userName,
          });
        }
      }
    );

    // Resign
    socket.on("game:resign", (data: { gameId: string }) => {
      const game = games.get(data.gameId);
      if (!game || game.status !== "active") return;

      const result = game.whiteSocketId === socket.id ? "black" : "white";
      endGame(io, game, result, "resign");
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);

      // Remove from queue
      const queueIdx = matchmakingQueue.findIndex((q) => q.socketId === socket.id);
      if (queueIdx !== -1) matchmakingQueue.splice(queueIdx, 1);

      // Remove from userSockets
      if (socket.data.userId) {
        const mappedSocketId = userSockets.get(socket.data.userId);
        if (mappedSocketId === socket.id) {
          userSockets.delete(socket.data.userId);
        }
      }

      // Handle active games disconnect
      for (const [, game] of games) {
        if (game.status !== "active") continue;
        if (game.whiteSocketId === socket.id || game.blackSocketId === socket.id) {
          io.to(game.id).emit("game:opponent_disconnected");
          // Give 30s to reconnect, then forfeit
          setTimeout(() => {
            const currentGame = games.get(game.id);
            if (currentGame && currentGame.status === "active") {
              const isWhiteDisconnected = currentGame.whiteSocketId === socket.id;
              const reconnected = isWhiteDisconnected
                ? currentGame.whiteSocketId !== socket.id
                : currentGame.blackSocketId !== socket.id;
              if (!reconnected) {
                const result = isWhiteDisconnected ? "black" : "white";
                endGame(io, currentGame, result, "abandon");
              }
            }
          }, 30000);
        }
      }
    });
  });

  function startGameTimer(io: SocketIOServer, gameId: string) {
    const game = games.get(gameId);
    if (!game || game.timeControl.baseTime === 0) return;

    game.timerInterval = setInterval(() => {
      const currentGame = games.get(gameId);
      if (!currentGame || currentGame.status !== "active") {
        clearInterval(game.timerInterval!);
        return;
      }

      const now = Date.now();
      const elapsed = Math.floor((now - currentGame.lastMoveTime) / 1000);
      const isWhiteTurn = currentGame.chess.turn() === "w";

      if (isWhiteTurn) {
        const remaining = currentGame.whiteTime - elapsed;
        if (remaining <= 0) {
          endGame(io, currentGame, "black", "timeout");
        }
      } else {
        const remaining = currentGame.blackTime - elapsed;
        if (remaining <= 0) {
          endGame(io, currentGame, "white", "timeout");
        }
      }
    }, 1000);
  }

  function endGame(
    io: SocketIOServer,
    game: GameRoom,
    result: string,
    reason: string
  ) {
    game.status = "finished";
    if (game.timerInterval) {
      clearInterval(game.timerInterval);
      game.timerInterval = null;
    }

    io.to(game.id).emit("game:over", {
      result,
      reason,
      pgn: game.chess.pgn(),
    });

    // Cleanup after 5 minutes
    setTimeout(() => {
      games.delete(game.id);
    }, 300000);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});

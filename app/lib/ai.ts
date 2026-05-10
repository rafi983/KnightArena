import { Chess, Move } from "chess.js";

// Piece values for evaluation
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables for positional evaluation
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30,
  30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5,
  -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0,
  0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30,
  0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20,
  20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20,
  -40, -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_TABLE = [
  -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0,
  5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10,
  0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20,
  -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0,
  0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0,
  0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
];

const QUEEN_TABLE = [
  -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5,
  5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5,
  5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10,
  -10, -20,
];

const KING_MIDDLE_TABLE = [
  -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40,
  -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40,
  -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20,
  -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
];

const PST: Record<string, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_MIDDLE_TABLE,
};

function getPositionValue(
  piece: string,
  color: string,
  index: number
): number {
  const table = PST[piece];
  if (!table) return 0;
  // Mirror table for black pieces
  const adjustedIndex = color === "w" ? index : 63 - index;
  return table[adjustedIndex];
}

function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === "w" ? -Infinity : Infinity;
  }
  if (game.isDraw() || game.isStalemate()) {
    return 0;
  }

  let score = 0;
  const board = game.board();

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const index = rank * 8 + file;
        const pieceValue = PIECE_VALUES[piece.type] || 0;
        const posValue = getPositionValue(piece.type, piece.color, index);

        if (piece.color === "w") {
          score += pieceValue + posValue;
        } else {
          score -= pieceValue + posValue;
        }
      }
    }
  }

  return score;
}

function orderMoves(game: Chess, moves: Move[]): Move[] {
  return moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Captures first (MVV-LVA)
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10;
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10;

    // Promotions
    if (a.promotion) scoreA += PIECE_VALUES[a.promotion] || 0;
    if (b.promotion) scoreB += PIECE_VALUES[b.promotion] || 0;

    // Checks
    game.move(a);
    if (game.inCheck()) scoreA += 50;
    game.undo();

    game.move(b);
    if (game.inCheck()) scoreB += 50;
    game.undo();

    return scoreB - scoreA;
  });
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves({ verbose: true });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evalScore = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export type Difficulty = "easy" | "medium" | "hard";

const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 4,
};

export function getBestMove(game: Chess, difficulty: Difficulty): Move | null {
  const depth = DEPTH_MAP[difficulty];
  const moves = game.moves({ verbose: true });

  if (moves.length === 0) return null;

  const isMaximizing = game.turn() === "w";
  let bestMove: Move | null = null;
  let bestEval = isMaximizing ? -Infinity : Infinity;
  const scoredMoves: Array<{ move: Move; score: number }> = [];

  // Order moves for better pruning
  const orderedMoves = orderMoves(game, [...moves]);

  for (const move of orderedMoves) {
    game.move(move);
    const evalScore = minimax(
      game,
      depth - 1,
      -Infinity,
      Infinity,
      !isMaximizing
    );
    game.undo();

    scoredMoves.push({ move, score: evalScore });

    if (isMaximizing) {
      if (evalScore > bestEval) {
        bestEval = evalScore;
        bestMove = move;
      }
    } else {
      if (evalScore < bestEval) {
        bestEval = evalScore;
        bestMove = move;
      }
    }
  }

  if (!bestMove) return null;

  // Sort from best to worst according to side to move
  scoredMoves.sort((a, b) =>
    isMaximizing ? b.score - a.score : a.score - b.score
  );

  if (difficulty === "easy") {
    // Easy: mostly weak/varied play, but still legal and somewhat sensible
    if (scoredMoves.length > 1) {
      const poolSize = Math.max(2, Math.ceil(scoredMoves.length * 0.5));
      const pool = scoredMoves.slice(0, poolSize);
      if (Math.random() < 0.75) {
        return pool[Math.floor(Math.random() * pool.length)].move;
      }
    }
    return bestMove;
  }

  if (difficulty === "medium") {
    // Medium: usually best move, sometimes one of top alternatives
    const topChoices = scoredMoves.slice(0, Math.min(3, scoredMoves.length));
    if (topChoices.length > 1 && Math.random() < 0.3) {
      return topChoices[Math.floor(Math.random() * topChoices.length)].move;
    }
    return bestMove;
  }

  return bestMove;
}

"use client";

import { Chess, Color, PieceSymbol, Square } from "chess.js";
import { useCallback, useState } from "react";
import { BoardTheme, DEFAULT_THEME } from "../lib/themes";

const PIECE_UNICODE: Record<Color, Record<PieceSymbol, string>> = {
  w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
  b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
};

const PIECE_STYLE: Record<Color, React.CSSProperties> = {
  w: {
    color: "#ffffff",
    textShadow: "0 0 2px #000, 0 0 2px #000, 1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000, -1px 1px 1px #000",
  },
  b: {
    color: "#1a1a1a",
    textShadow: "0 0 2px rgba(255,255,255,0.5), 1px 1px 1px rgba(255,255,255,0.3)",
  },
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square, promotion?: string) => boolean;
  flipped?: boolean;
  disabled?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  theme?: BoardTheme;
}

export default function ChessBoard({
  game,
  onMove,
  flipped = false,
  disabled = false,
  lastMove = null,
  theme = DEFAULT_THEME,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [showPromotion, setShowPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const files = flipped ? [...FILES].reverse() : FILES;
  const ranks = flipped ? [...RANKS].reverse() : RANKS;

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (disabled) return;

      if (showPromotion) return;

      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }

        if (legalMoves.includes(square)) {
          // Check if this is a pawn promotion
          const piece = game.get(selectedSquare);
          if (
            piece &&
            piece.type === "p" &&
            ((piece.color === "w" && square[1] === "8") ||
              (piece.color === "b" && square[1] === "1"))
          ) {
            setShowPromotion({ from: selectedSquare, to: square });
            return;
          }

          const success = onMove(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoves([]);
          if (!success) {
            // Move failed, deselect
          }
          return;
        }

        // Clicked a different piece of same color
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
          const moves = game
            .moves({ square, verbose: true })
            .map((m) => m.to as Square);
          setLegalMoves(moves);
          return;
        }

        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // No piece selected yet
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game
          .moves({ square, verbose: true })
          .map((m) => m.to as Square);
        setLegalMoves(moves);
      }
    },
    [selectedSquare, legalMoves, game, onMove, disabled, showPromotion]
  );

  const handlePromotion = (piece: string) => {
    if (showPromotion) {
      onMove(showPromotion.from, showPromotion.to, piece);
      setShowPromotion(null);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const isSquareLight = (file: number, rank: number) => {
    return (file + rank) % 2 === 0;
  };

  const isLastMove = (square: Square) => {
    if (!lastMove) return false;
    return square === lastMove.from || square === lastMove.to;
  };

  return (
    <div className="relative w-full max-w-[min(90vw,560px)] aspect-square mx-auto">
      {/* Promotion Dialog */}
      {showPromotion && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-2xl">
            <p className="text-sm font-medium text-center mb-3 text-zinc-700 dark:text-zinc-300">
              Promote to:
            </p>
            <div className="flex gap-2">
              {(["q", "r", "b", "n"] as const).map((piece) => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  className="w-14 h-14 flex items-center justify-center text-4xl bg-zinc-100 dark:bg-zinc-700 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-600 transition-colors cursor-pointer"
                >
                  <span style={PIECE_STYLE[game.turn()]}>{PIECE_UNICODE[game.turn()][piece]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-lg overflow-hidden shadow-xl border-2 border-zinc-700 dark:border-zinc-500">
        {ranks.map((rank, rankIdx) =>
          files.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = game.get(square);
            const isLight = isSquareLight(fileIdx, rankIdx);
            const isSelected = square === selectedSquare;
            const isLegal = legalMoves.includes(square);
            const isLast = isLastMove(square);
            const hasPiece = piece !== null;
            const inCheck =
              game.inCheck() &&
              piece?.type === "k" &&
              piece?.color === game.turn();

            let bgColor = isLight
              ? theme.lightSquare
              : theme.darkSquare;

            if (isSelected) {
              bgColor = theme.selectedSquare;
            } else if (isLast) {
              bgColor = isLight ? theme.lastMoveLight : theme.lastMoveDark;
            } else if (inCheck) {
              bgColor = "#EF4444";
            }

            const coordColor = isLight ? theme.coordLight : theme.coordDark;

            return (
              <div
                key={square}
                className="relative flex items-center justify-center cursor-pointer select-none"
                style={{ backgroundColor: bgColor }}
                onClick={() => handleSquareClick(square)}
              >
                {/* Coordinate labels */}
                {fileIdx === 0 && (
                  <span
                    className="absolute top-0.5 left-0.5 text-[10px] font-bold leading-none"
                    style={{ color: coordColor }}
                  >
                    {rank}
                  </span>
                )}
                {rankIdx === 7 && (
                  <span
                    className="absolute bottom-0.5 right-0.5 text-[10px] font-bold leading-none"
                    style={{ color: coordColor }}
                  >
                    {file}
                  </span>
                )}

                {/* Legal move indicator */}
                {isLegal && !hasPiece && (
                  <div className="absolute w-[30%] h-[30%] rounded-full bg-black/20 dark:bg-white/25" />
                )}
                {isLegal && hasPiece && (
                  <div className="absolute inset-[5%] rounded-full border-[3px] border-black/30 dark:border-white/30" />
                )}

                {/* Piece */}
                {piece && (
                  <span
                    className="text-[clamp(1.8rem,7vw,3.5rem)] leading-none select-none pointer-events-none"
                    style={PIECE_STYLE[piece.color]}
                  >
                    {PIECE_UNICODE[piece.color][piece.type]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

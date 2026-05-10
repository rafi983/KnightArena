"use client";

import { Chess, Square } from "chess.js";
import {
    ArrowLeft,
    ChevronFirst,
    ChevronLast,
    ChevronLeft,
    ChevronRight,
    Download,
    FileUp,
    FlipVertical,
    RotateCcw,
    Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import ChessBoard from "../components/ChessBoard";
import ThemePicker from "../components/ThemePicker";
import { BoardTheme, DEFAULT_THEME } from "../lib/themes";

export default function AnalysisPage() {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [positionHistory, setPositionHistory] = useState<string[]>([
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  ]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>(DEFAULT_THEME);
  const [fenInput, setFenInput] = useState("");
  const [pgnInput, setPgnInput] = useState("");
  const [showImport, setShowImport] = useState(false);

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      const newGame = new Chess(game.fen());
      try {
        const move = newGame.move({ from, to, promotion: promotion || undefined });
        if (!move) return false;

        // Truncate future moves if we've gone back
        const newHistory = history.slice(0, currentMoveIndex + 1);
        newHistory.push(move.san);

        const newPositionHistory = positionHistory.slice(0, currentMoveIndex + 2);
        newPositionHistory.push(newGame.fen());

        setGame(newGame);
        setHistory(newHistory);
        setPositionHistory(newPositionHistory);
        setCurrentMoveIndex(newHistory.length - 1);
        setLastMove({ from, to });

        return true;
      } catch {
        return false;
      }
    },
    [game, history, currentMoveIndex, positionHistory]
  );

  const goToMove = (index: number) => {
    if (index < -1 || index >= history.length) return;
    const fen = positionHistory[index + 1];
    setGame(new Chess(fen));
    setCurrentMoveIndex(index);
    setLastMove(null);
  };

  const goFirst = () => goToMove(-1);
  const goPrev = () => goToMove(currentMoveIndex - 1);
  const goNext = () => goToMove(currentMoveIndex + 1);
  const goLast = () => goToMove(history.length - 1);

  const resetBoard = () => {
    setGame(new Chess());
    setHistory([]);
    setPositionHistory(["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]);
    setCurrentMoveIndex(-1);
    setLastMove(null);
  };

  const loadFen = () => {
    try {
      const newGame = new Chess(fenInput.trim());
      setGame(newGame);
      setHistory([]);
      setPositionHistory([newGame.fen()]);
      setCurrentMoveIndex(-1);
      setLastMove(null);
      setFenInput("");
    } catch {
      alert("Invalid FEN");
    }
  };

  const exportPgn = () => {
    const replayGame = new Chess();
    for (const san of history) {
      replayGame.move(san);
    }

    const pgn = replayGame.pgn();
    const blob = new Blob([pgn], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPgnText = (rawText: string) => {
    const newGame = new Chess();
    const normalizedPgn = rawText.replace(/\r\n/g, "\n").trim();
    newGame.loadPgn(normalizedPgn, { strict: false });

    const moves = newGame.history();
    const positions = ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"];
    const replayGame = new Chess();
    for (const san of moves) {
      replayGame.move(san);
      positions.push(replayGame.fen());
    }

    setGame(new Chess(positions[positions.length - 1]));
    setHistory(moves);
    setPositionHistory(positions);
    setCurrentMoveIndex(moves.length - 1);
    setLastMove(null);
  };

  const loadPgn = () => {
    try {
      importPgnText(pgnInput);
      setPgnInput("");
      setShowImport(false);
    } catch {
      alert("Invalid PGN");
    }
  };

  const handlePgnFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      importPgnText(text);
      setShowImport(false);
    } catch {
      alert("Failed to read PGN file");
    } finally {
      e.target.value = "";
    }
  };

  // Move pairs for display
  const movePairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1],
    });
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              Analysis Board
            </h1>
          </div>
          <ThemePicker currentTheme={boardTheme} onThemeChange={setBoardTheme} />
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Move list - desktop */}
        <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Moves
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {movePairs.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-4">
                  Make moves to analyze
                </p>
              ) : (
                <div className="space-y-0.5">
                  {movePairs.map((pair, pairIdx) => (
                    <div key={pair.number} className="flex items-center text-sm font-mono">
                      <span className="w-8 text-right text-zinc-400 text-xs mr-2">
                        {pair.number}.
                      </span>
                      <button
                        onClick={() => goToMove(pairIdx * 2)}
                        className={`w-16 text-left px-1 rounded cursor-pointer ${
                          currentMoveIndex === pairIdx * 2
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold"
                            : "text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {pair.white}
                      </button>
                      {pair.black && (
                        <button
                          onClick={() => goToMove(pairIdx * 2 + 1)}
                          className={`w-16 text-left px-1 rounded cursor-pointer ${
                            currentMoveIndex === pairIdx * 2 + 1
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold"
                              : "text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {pair.black}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="flex flex-col items-center gap-3 w-full lg:w-auto">
          <ChessBoard
            game={game}
            onMove={handleMove}
            flipped={flipped}
            disabled={false}
            lastMove={lastMove}
            theme={boardTheme}
          />

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={goFirst}
              disabled={currentMoveIndex < 0}
              className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronFirst size={18} />
            </button>
            <button
              onClick={goPrev}
              disabled={currentMoveIndex < 0}
              className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goNext}
              disabled={currentMoveIndex >= history.length - 1}
              className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={goLast}
              disabled={currentMoveIndex >= history.length - 1}
              className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <ChevronLast size={18} />
            </button>
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <button
              onClick={() => setFlipped(!flipped)}
              className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title="Flip board"
            >
              <FlipVertical size={18} />
            </button>
            <button
              onClick={resetBoard}
              className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title="Reset"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={exportPgn}
              disabled={history.length === 0}
              className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer disabled:opacity-40"
              title="Export PGN"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-4 w-full lg:w-72 shrink-0">
          {/* Mobile move list */}
          <div className="lg:hidden bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Moves</h3>
            </div>
            <div className="max-h-32 overflow-y-auto p-2">
              {history.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-2">No moves</p>
              ) : (
                <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {history.map((m, i) => (
                    <span
                      key={i}
                      onClick={() => goToMove(i)}
                      className={`cursor-pointer px-0.5 rounded ${
                        i === currentMoveIndex ? "bg-emerald-200 dark:bg-emerald-900/40 font-bold" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}
                      {m}{" "}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>

          {/* FEN Input */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              Load Position (FEN)
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                placeholder="Paste FEN..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={loadFen}
                disabled={!fenInput.trim()}
                className="px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 cursor-pointer"
              >
                Load
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5 break-all">
              Current: {game.fen()}
            </p>
          </div>

          {/* PGN Import */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <button
              onClick={() => setShowImport(!showImport)}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white cursor-pointer"
            >
              <Upload size={16} />
              Import PGN
            </button>
            {showImport && (
              <div className="mt-3 space-y-2">
                <label className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                  <FileUp size={14} />
                  Import .pgn file
                  <input
                    type="file"
                    accept=".pgn,text/plain"
                    onChange={handlePgnFileUpload}
                    className="hidden"
                  />
                </label>
                <textarea
                  value={pgnInput}
                  onChange={(e) => setPgnInput(e.target.value)}
                  placeholder="Paste PGN here..."
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
                />
                <button
                  onClick={loadPgn}
                  disabled={!pgnInput.trim()}
                  className="w-full py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 cursor-pointer"
                >
                  Load PGN
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

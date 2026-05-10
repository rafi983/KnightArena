"use client";

import { BOARD_THEMES, BoardTheme } from "../lib/themes";
import { Palette } from "lucide-react";
import { useState } from "react";

interface ThemePickerProps {
  currentTheme: BoardTheme;
  onThemeChange: (theme: BoardTheme) => void;
}

export default function ThemePicker({
  currentTheme,
  onThemeChange,
}: ThemePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors cursor-pointer"
        title="Board Theme"
      >
        <Palette size={16} className="text-zinc-600 dark:text-zinc-400" />
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hidden sm:inline">
          Theme
        </span>
        <div className="flex gap-0.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: currentTheme.lightSquare }}
          />
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: currentTheme.darkSquare }}
          />
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-3 min-w-[200px]">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
              Board Theme
            </p>
            <div className="space-y-1.5">
              {BOARD_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onThemeChange(theme);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                    currentTheme.id === theme.id
                      ? "bg-zinc-100 dark:bg-zinc-800 ring-2 ring-emerald-500"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex gap-0.5 shrink-0">
                    <div
                      className="w-5 h-5 rounded-sm border border-zinc-200 dark:border-zinc-600"
                      style={{ backgroundColor: theme.lightSquare }}
                    />
                    <div
                      className="w-5 h-5 rounded-sm border border-zinc-200 dark:border-zinc-600"
                      style={{ backgroundColor: theme.darkSquare }}
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {theme.name}
                  </span>
                  {currentTheme.id === theme.id && (
                    <span className="ml-auto text-emerald-500 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

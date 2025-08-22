import React from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ isDark, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-6 bg-gradient-to-r from-gray-400 to-gray-600 dark:from-blue-500 dark:to-purple-600 rounded-full p-1 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      aria-label="Toggle theme"
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="w-3 h-3 text-gray-800" />
        ) : (
          <Sun className="w-3 h-3 text-yellow-500" />
        )}
      </div>
    </button>
  );
} 
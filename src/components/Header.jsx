import React from "react";
import { Keyboard } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import logoWhite from "../assets/logo white.png";
import logoBlack from "../assets/logo black.png";

export default function Header({ onMenuClick, sidebarOpen, isDark, toggleTheme, onShowShortcuts }) {
  return (
    <header className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm border-b border-light-border dark:border-dark-border px-6 py-6 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          className="relative w-10 h-10 flex flex-col justify-center items-center group hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 rounded-lg transition-all duration-200 border border-light-border dark:border-dark-border"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
        >
          <span className={`w-6 h-0.5 bg-light-text dark:bg-dark-text rounded-full transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'rotate-45 translate-y-1.5' : ''
          }`}></span>
          <span className={`w-6 h-0.5 bg-light-text dark:bg-dark-text rounded-full transition-all duration-300 ease-in-out mt-1 ${
            sidebarOpen ? 'opacity-0 scale-0' : ''
          }`}></span>
          <span className={`w-6 h-0.5 bg-light-text dark:bg-dark-text rounded-full transition-all duration-300 ease-in-out mt-1 ${
            sidebarOpen ? '-rotate-45 -translate-y-1.5' : ''
          }`}></span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img 
              src={isDark ? logoWhite : logoBlack} 
              alt="Attendance Pro Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-light-text dark:text-dark-text">Attendance Dashboard</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onShowShortcuts}
          className="p-2 text-light-textSecondary dark:text-dark-textSecondary hover:text-light-text dark:hover:text-dark-text hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 rounded-lg transition-all duration-200 group"
          title="Keyboard Shortcuts (Ctrl+K)"
        >
          <Keyboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        
        <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
        
        <button className="px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 hover:from-blue-600 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync Logs
        </button>
      </div>
    </header>
  );
} 
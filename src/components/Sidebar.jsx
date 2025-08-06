import React from "react";
import logoWhite from "../assets/logo white.png";
import logoBlack from "../assets/logo black.png";

export default function Sidebar({ open, setOpen, isDark, navLinks = [], onNav }) {
  return (
    <aside className="h-full bg-white dark:bg-dark-card shadow-2xl border-r border-light-border dark:border-dark-border flex flex-col">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-light-border dark:border-dark-border">
        <div className="w-12 h-12 flex items-center justify-center">
          <img 
            src={isDark ? logoWhite : logoBlack} 
            alt="Attendance Pro Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-lg font-bold tracking-tight text-light-text dark:text-dark-text">Attendance </span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navLinks.map((link) => (
          <button
            key={link.key}
            onClick={() => {
              onNav && onNav(link.key);
              // Don't close sidebar when nav item is clicked
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group focus:outline-none ${
              link.active 
                ? 'bg-gradient-to-r from-light-accent/10 to-blue-500/10 dark:from-dark-accent/10 dark:to-purple-500/10 text-light-accent dark:text-dark-accent border border-light-accent/20 dark:border-dark-accent/20 shadow-sm' 
                : 'text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-accent/5 dark:hover:bg-dark-accent/5 hover:text-light-text dark:hover:text-dark-text'
            }`}
          >
            <div className={`flex items-center justify-center w-5 h-5 transition-all duration-200 ${
              link.active 
                ? 'text-light-accent dark:text-dark-accent' 
                : 'text-light-textSecondary dark:text-dark-textSecondary group-hover:text-light-text dark:group-hover:text-dark-text'
            }`}>
              {link.icon}
            </div>
            <span className="font-medium">{link.name}</span>
            {link.active && (
              <div className="ml-auto w-2 h-2 bg-light-accent dark:bg-dark-accent rounded-full animate-pulse"></div>
            )}
          </button>
        ))}
      </nav>
      
      {/* Big Logo under About */}
      <div className="px-4 py-6 border-t border-light-border dark:border-dark-border">
        <div className="flex flex-col items-center gap-3">
          <div className="w-28 h-28 flex items-center justify-center">
            <img 
              src={isDark ? logoWhite : logoBlack} 
              alt="Attendance Pro Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
      

    </aside>
  );
} 
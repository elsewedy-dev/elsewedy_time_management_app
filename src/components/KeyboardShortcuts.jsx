import React, { useEffect } from "react";
import { Keyboard, X } from "lucide-react";

export default function KeyboardShortcuts({ isVisible, onClose, shortcuts }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K to toggle shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
      }
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
} 
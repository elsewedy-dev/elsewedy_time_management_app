import React from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function SyncModal({ isOpen, onClose, syncResult, isDark }) {
  if (!isOpen) return null;

  const hasErrors = syncResult?.hasErrors;
  const userSync = syncResult?.userSync;
  const errorMessages = syncResult?.errors || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-sm w-full animate-slideUp border border-light-border dark:border-dark-border">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text dark:hover:text-dark-text transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-3 mb-4">
            {hasErrors ? (
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                {hasErrors ? 'Sync Failed' : 'Sync Complete'}
              </h3>
              {!hasErrors && userSync && (
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                  {userSync.created} new · {userSync.updated} updated
                </p>
              )}
            </div>
          </div>

          {/* Error Messages */}
          {hasErrors && (
            <div className="space-y-2 mb-4">
              {errorMessages.map((error, index) => (
                <p key={index} className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-light-accent dark:bg-dark-accent text-white hover:bg-light-accent-hover dark:hover:bg-dark-accent-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";

export default function AttendanceTable({ data, loading, isDark }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-light-accent dark:border-dark-accent"></div>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-md overflow-x-auto p-4 border border-light-border dark:border-dark-border">
      <table className="min-w-full">
        <thead className="bg-light-accent/5 dark:bg-dark-accent/5">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Employee</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">In Time</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Out Time</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Method</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-light-textSecondary dark:text-dark-textSecondary">No records found.</td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id}
                className={`${
                  idx % 2 === 0 
                    ? 'bg-white dark:bg-dark-card' 
                    : 'bg-light-accent/5 dark:bg-dark-accent/5'
                } hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-colors duration-200`}
              >
                <td className="px-4 py-3 whitespace-nowrap font-medium text-light-text dark:text-dark-text">{row.name}</td>
                <td className="px-4 py-3 whitespace-nowrap text-light-textSecondary dark:text-dark-textSecondary">{row.id}</td>
                <td className="px-4 py-3 whitespace-nowrap text-light-textSecondary dark:text-dark-textSecondary">{row.inTime}</td>
                <td className="px-4 py-3 whitespace-nowrap text-light-textSecondary dark:text-dark-textSecondary">{row.outTime}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      row.status === "In"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-light-textSecondary dark:text-dark-textSecondary">{row.method}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
} 
import React from "react";

export default function StatsCards({ stats, isDark }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.label}  
          className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:shadow-green-600 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{stat.label}</h3>
          </div>
          <p className="text-3xl font-bold text-light-accent dark:text-dark-accent">{stat.value}</p>
        </div>
      ))}
    </div>
  );
} 
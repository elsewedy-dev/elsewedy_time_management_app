import React from "react";

export default function Filters({ filters, setFilters, isDark }) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4 items-center justify-between">
      <div className="flex gap-2 w-full md:w-auto">
        <input
          type="text"
          placeholder="Search name..."
          value={filters.name}
          onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent transition-all duration-200 placeholder-light-textSecondary dark:placeholder-dark-textSecondary"
        />
        <select
          value={filters.type}
          onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent transition-all duration-200"
        >
          <option value="">All Types</option>
          <option value="Face">Face</option>
          <option value="Fingerprint">Fingerprint</option>
        </select>
      </div>
    </div>
  );
} 

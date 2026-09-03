import React, { useState } from "react";
import {
  Users, UserCheck, UserX, TrendingUp,
  BarChart3, Download, RefreshCw,
  Thermometer, X, Loader2, CheckCircle, ChevronDown, ChevronUp
} from "lucide-react";
import Filters from "./Filters";
import AttendanceTable from "./AttendanceTable";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Dashboard({
  stats,
  isDark,
  filters,
  setFilters,
  filteredData,
  loading,
  onExport,
  onReset,
  absentEmployees = [],
  onAbsentUpdate,
}) {
  const [exporting, setExporting]         = useState(false);
  const [showAbsent, setShowAbsent]       = useState(false);
  const [sickLeaveMap, setSickLeaveMap]   = useState({}); // employeeId → { loading, done }
  const [notification, setNotification]   = useState(null);

  function showNotif(message, type = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const date = filters?.date || new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_BASE}/reports/daily/export?date=${date}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendance-${date}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  async function toggleSickLeave(emp) {
    const alreadySick = emp.sickLeave;
    setSickLeaveMap(prev => ({ ...prev, [emp.id]: { loading: true } }));
    try {
      const today = new Date().toISOString().split('T')[0];

      if (emp.attendanceId) {
        // Update existing attendance record
        await fetch(`${API_BASE}/attendance/${emp.attendanceId}/sick-leave`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sickLeave: !alreadySick, sickLeaveNote: alreadySick ? null : 'Sick Leave' }),
        });
      } else {
        // Create new sick leave record
        await fetch(`${API_BASE}/attendance/sick-leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: emp.id, date: today, sickLeaveNote: 'Sick Leave' }),
        });
      }

      setSickLeaveMap(prev => ({ ...prev, [emp.id]: { loading: false, done: true, sick: !alreadySick } }));
      showNotif(alreadySick ? `${emp.firstName} removed from sick leave` : `${emp.firstName} marked as sick leave`);
      if (onAbsentUpdate) onAbsentUpdate();
    } catch (err) {
      setSickLeaveMap(prev => ({ ...prev, [emp.id]: { loading: false } }));
      showNotif('Failed to update sick leave', 'error');
    }
  }

  function isSick(emp) {
    const state = sickLeaveMap[emp.id];
    if (state?.done) return state.sick;
    return emp.sickLeave;
  }

  const enhancedStats = [
    {
      label: "Total Employees",
      value: stats.find(s => s.label === "Total Employees")?.value || 0,
      icon: <Users className="w-6 h-6 text-blue-500" />,
      color: "blue",
      onClick: null,
    },
    {
      label: "Present Today",
      value: stats.find(s => s.label === "Present Today")?.value || 0,
      icon: <UserCheck className="w-6 h-6 text-green-500" />,
      color: "green",
      onClick: null,
    },
    {
      label: "Absent",
      value: stats.find(s => s.label === "Absent")?.value || 0,
      icon: <UserX className="w-6 h-6 text-red-500" />,
      color: "red",
      onClick: () => setShowAbsent(v => !v),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Toast */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium
          ${notification.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
          {notification.type === "error"
            ? <X className="w-4 h-4" />
            : <CheckCircle className="w-4 h-4" />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-light-text dark:text-dark-text flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-light-accent dark:text-dark-accent" />
            Attendance Dashboard
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
            Monitor employee attendance and manage workforce efficiently
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {enhancedStats.map((stat) => (
          <div key={stat.label}
            onClick={stat.onClick || undefined}
            className={`group bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl relative overflow-hidden
              ${stat.onClick ? "cursor-pointer" : ""}`}>
            <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-50/50 to-transparent dark:from-${stat.color}-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-light-hover dark:bg-dark-hover rounded-lg">{stat.icon}</div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{stat.label}</h3>
                </div>
                {stat.onClick && (
                  <span className="text-xs text-light-textSecondary dark:text-dark-textSecondary flex items-center gap-1">
                    {showAbsent ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-light-accent dark:text-dark-accent mb-2">{stat.value}</p>
              {stat.label === "Absent" && stat.onClick && (
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
                  Click to manage sick leave
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Absent employees panel */}
      {showAbsent && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-light-border dark:border-dark-border">
            <h3 className="font-bold text-light-text dark:text-dark-text flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" />
              Absent Employees Today
              <span className="ml-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full font-semibold">
                {absentEmployees.length}
              </span>
            </h3>
            <button onClick={() => setShowAbsent(false)}
              className="p-1 rounded hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 text-light-textSecondary dark:text-dark-textSecondary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {absentEmployees.length === 0 ? (
            <div className="py-10 text-center text-light-textSecondary dark:text-dark-textSecondary">
              <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">All employees are present today!</p>
            </div>
          ) : (
            <div className="divide-y divide-light-border dark:divide-dark-border max-h-80 overflow-y-auto">
              {absentEmployees.map((emp, i) => {
                const sick = isSick(emp);
                const state = sickLeaveMap[emp.id];
                return (
                  <div key={emp.id}
                    className={`flex items-center gap-4 px-5 py-3 transition-colors
                      ${sick ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-light-accent/5 dark:hover:bg-dark-accent/5"}`}>
                    {/* Number */}
                    <span className="text-xs text-light-textSecondary dark:text-dark-textSecondary w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold
                      ${sick ? "bg-blue-500" : "bg-red-400"}`}>
                      {emp.firstName?.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-light-text dark:text-dark-text">
                        {emp.firstName} {emp.lastName}
                        {sick && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                            <Thermometer className="w-3 h-3" /> Sick Leave
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary">
                        ID: {emp.employeeId}
                        {emp.shift && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-white text-xs"
                            style={{ backgroundColor: emp.shift.color || '#6366F1' }}>
                            {emp.shift.name}
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Sick leave button */}
                    <button
                      onClick={() => toggleSickLeave(emp)}
                      disabled={state?.loading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0
                        ${sick
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                          : "bg-light-accent/10 dark:bg-dark-accent/10 text-light-text dark:text-dark-text hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300"
                        } disabled:opacity-50`}>
                      {state?.loading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Thermometer className="w-3.5 h-3.5" />}
                      {state?.loading ? "..." : sick ? "Remove Sick Leave" : "Mark Sick Leave"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters and Table */}
      <div className="space-y-6">
        <Filters filters={filters} setFilters={setFilters} isDark={isDark} onReset={onReset} />
        <AttendanceTable data={filteredData} loading={loading} isDark={isDark} />
      </div>
    </div>
  );
}

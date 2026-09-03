import React, { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Download, Loader2,
  Users, UserCheck, AlertTriangle, Clock, X
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function to12h(time) {
  if (!time) return "--";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${ampm}`;
}

function formatLate(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m late`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m late` : `${h}h late`;
}

function formatTime(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (isNaN(d)) return "--";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function CalendarView() {
  const today = new Date();
  const [viewYear, setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [monthData, setMonthData] = useState({});
  const [holidays, setHolidays]   = useState({}); // { "YYYY-MM-DD": { name, type } }
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayRecords, setDayRecords]     = useState([]);
  const [loadingDay, setLoadingDay]     = useState(false);
  const [exporting, setExporting]       = useState(false);

  // ── Fetch month summary ────────────────────────────────────────────────────
  useEffect(() => {
    fetchMonthSummary(viewYear, viewMonth);
    fetchHolidays(viewYear);
  }, [viewYear, viewMonth]);

  async function fetchHolidays(year) {
    try {
      const res = await fetch(`${API_BASE}/holidays?year=${year}`);
      const json = await res.json();
      if (json.success) {
        const map = {};
        json.data.forEach(h => { map[h.date] = h; });
        setHolidays(map);
      }
    } catch (e) { console.error("Failed to fetch holidays:", e); }
  }

  async function fetchMonthSummary(year, month) {
    setLoadingMonth(true);
    try {
      const firstDay = `${year}-${String(month + 1).padStart(2,"0")}-01`;
      const lastDay  = new Date(year, month + 1, 0);
      const lastDate = `${year}-${String(month + 1).padStart(2,"0")}-${String(lastDay.getDate()).padStart(2,"0")}`;

      const res = await fetch(
        `${API_BASE}/attendance?startDate=${firstDay}&endDate=${lastDate}&limit=500`,
        { headers: { "Content-Type": "application/json" } }
      );
      const json = await res.json();

      if (!json.success) return;

      // Group by date
      const grouped = {};
      (json.data || []).forEach(record => {
        const date = record.date;
        if (!grouped[date]) grouped[date] = { present: 0, late: 0, total: 0 };
        grouped[date].total++;
        if (record.checkInTime) grouped[date].present++;
        if (record.isLate)      grouped[date].late++;
      });
      setMonthData(grouped);
    } catch (e) {
      console.error("Failed to fetch month summary:", e);
    } finally {
      setLoadingMonth(false);
    }
  }

  // ── Fetch day detail ───────────────────────────────────────────────────────
  async function selectDate(dateStr) {
    setSelectedDate(dateStr);
    setLoadingDay(true);
    setDayRecords([]);
    try {
      const res = await fetch(
        `${API_BASE}/attendance?startDate=${dateStr}&endDate=${dateStr}&limit=500`,
        { headers: { "Content-Type": "application/json" } }
      );
      const json = await res.json();
      if (json.success) setDayRecords(json.data || []);
    } catch (e) {
      console.error("Failed to fetch day records:", e);
    } finally {
      setLoadingDay(false);
    }
  }

  // ── Export selected day ────────────────────────────────────────────────────
  async function exportDay(date) {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE}/reports/daily/export?date=${date}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `attendance-${date}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  // ── Calendar grid ──────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr        = today.toISOString().split("T")[0];

  // Build grid cells: leading blanks + days
  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    cells.push({ day: d, dateStr });
  }

  function dayColor(dateStr) {
    const isHoliday = holidays[dateStr];
    if (isHoliday) return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300";
    const data = monthData[dateStr];
    const isFuture = dateStr > todayStr;
    if (isFuture || !data) return null;
    if (data.present === 0) return "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400";
    if (data.late > 0)      return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400";
    return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400";
  }

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6">

      {/* ── Calendar panel ── */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 mt-2">
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">
            Attendance Calendar
          </h2>
          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs text-light-textSecondary dark:text-dark-textSecondary">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Good</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Late</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Absent</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-400 inline-block" /> Holiday</span>
            </div>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 text-light-text dark:text-dark-text transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 text-light-text dark:text-dark-text transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-light-textSecondary dark:text-dark-textSecondary">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loadingMonth ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-light-accent dark:text-dark-accent" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell) return <div key={`blank-${i}`} />;
              const { day, dateStr } = cell;
              const data    = monthData[dateStr];
              const isToday = dateStr === todayStr;
              const isSel   = dateStr === selectedDate;
              const color   = dayColor(dateStr);
              const isFuture = dateStr > todayStr;

              return (
                <button key={dateStr} onClick={() => selectDate(dateStr)}
                  disabled={isFuture}
                  title={holidays[dateStr]?.name || dateStr}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all
                    ${isSel ? "ring-2 ring-light-accent dark:ring-dark-accent scale-105 shadow-lg" : ""}
                    ${isToday && !isSel ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""}
                    ${color || "hover:bg-light-accent/10 dark:hover:bg-dark-accent/10"}
                    ${isFuture ? "opacity-30 cursor-default" : "cursor-pointer hover:scale-105"}
                    bg-white dark:bg-dark-card border border-light-border dark:border-dark-border
                  `}>
                  <span className={`font-semibold ${isToday ? "text-blue-600 dark:text-blue-400" : ""}`}>
                    {day}
                  </span>
                  {holidays[dateStr] ? (
                    <span className="text-xs leading-none mt-0.5 truncate w-full text-center px-0.5" style={{fontSize:'9px'}}>
                      🎉
                    </span>
                  ) : data ? (
                    <span className="text-xs opacity-75 leading-none mt-0.5">
                      {data.present}/{data.total}
                    </span>
                  ) : null}
                  {isToday && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Day detail panel ── */}
      <div className={`w-full lg:w-96 transition-all duration-300 ${selectedDate ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {selectedDate && (
          <div className="bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-2xl shadow-lg overflow-hidden h-fit sticky top-4">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-light-border dark:border-dark-border">
              <div>
                <h4 className="font-bold text-light-text dark:text-dark-text">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h4>
                {monthData[selectedDate] && (
                  <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary mt-0.5">
                    {monthData[selectedDate].present} present · {monthData[selectedDate].late} late
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportDay(selectedDate)} disabled={exporting}
                  title="Export to Excel"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                  {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Export
                </button>
                <button onClick={() => setSelectedDate(null)}
                  className="p-1.5 rounded-lg hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 text-light-textSecondary dark:text-dark-textSecondary transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Holiday banner */}
            {holidays[selectedDate] && (
              <div className="px-5 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                🎉 <span className="font-medium">{holidays[selectedDate].name}</span>
                <span className="text-xs opacity-70">— Public Holiday</span>
              </div>
            )}

            {/* Records */}
            <div className="overflow-y-auto max-h-[60vh]">
              {loadingDay ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-light-accent dark:text-dark-accent" />
                </div>
              ) : dayRecords.length === 0 ? (
                <div className="text-center py-10 text-light-textSecondary dark:text-dark-textSecondary">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No attendance records</p>
                </div>
              ) : (
                <div className="divide-y divide-light-border dark:divide-dark-border">
                  {dayRecords.map((rec, i) => {
                    const emp = rec.employee || rec.Employee || {};
                    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Unknown";
                    const statusColor =
                      rec.status === "present" ? "text-green-600 dark:text-green-400" :
                      rec.status === "late"    ? "text-yellow-600 dark:text-yellow-400" :
                      rec.status === "half_day"? "text-blue-600 dark:text-blue-400" :
                      "text-red-500 dark:text-red-400";

                    return (
                      <div key={rec.id || i} className="flex items-center gap-3 px-5 py-3 hover:bg-light-accent/5 dark:hover:bg-dark-accent/5 transition-colors">
                        {/* Number */}
                        <span className="text-xs text-light-textSecondary dark:text-dark-textSecondary w-5 text-right flex-shrink-0">
                          {i + 1}
                        </span>
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: rec.employee?.shift?.color || "#6366F1" }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-light-text dark:text-dark-text truncate">{name}</p>
                          <div className="flex items-center gap-2 text-xs text-light-textSecondary dark:text-dark-textSecondary">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {formatTime(rec.checkInTime)}
                              {rec.checkOutTime && <> – {formatTime(rec.checkOutTime)}</>}
                            </span>
                            {rec.isLate && (
                              <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" /> {formatLate(rec.lateMinutes)}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Status */}
                        <span className={`text-xs font-semibold flex-shrink-0 ${statusColor}`}>
                          {rec.status === "present"     ? "Present" :
                           rec.status === "late"        ? "Late" :
                           rec.status === "half_day"    ? "Half" :
                           rec.status === "early_leave" ? "Early" : rec.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React from "react";
import { AlertTriangle, Clock } from "lucide-react";

function formatLate(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function to12h(time) {
  if (!time) return '--';
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function ShiftBadge({ shift, mismatch, reason }) {
  if (!shift) {
    return <span className="text-xs text-light-textSecondary dark:text-dark-textSecondary">No shift</span>;
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: shift.color || "#6366F1" }}
        title={`${to12h(shift.startTime)} – ${to12h(shift.endTime)}`}
      >
        <Clock className="w-3 h-3" />
        {shift.name}
      </span>
      {mismatch && (
        <span
          title={reason}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 cursor-help"
        >
          <AlertTriangle className="w-3 h-3" />
          Wrong shift
        </span>
      )}
    </div>
  );
}

export default function AttendanceTable({ data, loading, isDark }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-light-accent dark:border-dark-accent" />
      </div>
    );
  }

  const mismatches = data.filter(r => r.shiftMismatch).length;

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-md overflow-x-auto p-4 border border-light-border dark:border-dark-border">
      {/* Mismatch summary banner */}
      {mismatches > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{mismatches}</strong> employee{mismatches > 1 ? "s" : ""} scanned outside their assigned shift hours.
            Hover the <strong>Wrong shift</strong> badge for details.
          </span>
        </div>
      )}

      <table className="min-w-full">
        <thead className="bg-light-accent/5 dark:bg-dark-accent/5">
          <tr>
            {["#", "Employee", "Shift", "In Time", "Out Time", "Hours", "Status", "Method"].map(h => (
              <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-8 text-light-textSecondary dark:text-dark-textSecondary">
                No records found.
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const isMismatch = row.shiftMismatch;
              return (
                <tr
                  key={row.id || idx}
                  className={`transition-colors duration-200
                    ${isMismatch
                      ? "bg-orange-50/60 dark:bg-orange-900/10 hover:bg-orange-100/60 dark:hover:bg-orange-900/20"
                      : idx % 2 === 0
                        ? "bg-white dark:bg-dark-card hover:bg-light-accent/10 dark:hover:bg-dark-accent/10"
                        : "bg-light-accent/5 dark:bg-dark-accent/5 hover:bg-light-accent/10 dark:hover:bg-dark-accent/10"
                    }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-light-textSecondary dark:text-dark-textSecondary text-center w-10">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-light-text dark:text-dark-text">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ShiftBadge shift={row.shift} mismatch={row.shiftMismatch} reason={row.shiftMismatchReason} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-light-textSecondary dark:text-dark-textSecondary">
                    {row.inTime}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-light-textSecondary dark:text-dark-textSecondary">
                    {row.outTime}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-light-textSecondary dark:text-dark-textSecondary">
                    {row.workingHours ? `${row.workingHours}h` : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold w-fit
                        ${row.status === "In" || row.status === "present"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : row.status === "late"
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                            : row.status === "half_day"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}>
                        {row.status === "present" ? "Present"
                          : row.status === "late" ? "Late"
                          : row.status === "half_day" ? "Half Day"
                          : row.status === "early_leave" ? "Early Leave"
                          : row.status}
                      </span>
                      {row.isLate && row.lateMinutes > 0 && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5 pl-1">
                          +{formatLate(row.lateMinutes)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-light-textSecondary dark:text-dark-textSecondary capitalize">
                    {row.method}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

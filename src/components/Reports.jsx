import React, { useState } from "react";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const mockData = [
  { name: "Mon", present: 45, absent: 5, late: 3 },
  { name: "Tue", present: 42, absent: 8, late: 2 },
  { name: "Wed", present: 48, absent: 2, late: 1 },
  { name: "Thu", present: 44, absent: 6, late: 4 },
  { name: "Fri", present: 46, absent: 4, late: 2 },
  { name: "Sat", present: 20, absent: 30, late: 0 },
  { name: "Sun", present: 0, absent: 50, late: 0 },
];

export default function Reports() {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [reportType, setReportType] = useState("attendance");

  function handleExport() {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Present,Absent,Late\n" +
      mockData.map(row => `${row.name},${row.present},${row.absent},${row.late}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Reports</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg font-medium shadow hover:scale-105 hover:shadow-xl transition-all"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Total Present</h3>
          <p className="text-3xl font-bold">245</p>
          <p className="text-sm opacity-90">This week</p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Total Absent</h3>
          <p className="text-3xl font-bold">55</p>
          <p className="text-sm opacity-90">This week</p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-2">Late Arrivals</h3>
          <p className="text-3xl font-bold">12</p>
          <p className="text-sm opacity-90">This week</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">Weekly Attendance Overview</h3>
          <div className="flex gap-4">
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
            >
              <option value="attendance">Attendance</option>
              <option value="overtime">Overtime</option>
              <option value="leave">Leave</option>
            </select>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 
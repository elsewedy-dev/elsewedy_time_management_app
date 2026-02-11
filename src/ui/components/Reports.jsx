import React, { useState, useEffect } from "react";
import { Download, Users, UserX, Clock, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import apiService from "../../services/api";

export default function Reports() {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [reportType, setReportType] = useState("attendance");
  const [reportData, setReportData] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    try {
      setLoading(true);
      setError(null);
      // Try to fetch weekly attendance data from backend
      const response = await apiService.getWeeklyAttendance();
      if (response && response.data) {
        setReportData(response.data);
        setWeeklyStats(response.summary);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      setError('Unable to connect to backend server');
      setReportData([]);
      setWeeklyStats(null);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!reportData || reportData.length === 0) {
      alert('No data available to export');
      return;
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Date,Present,Absent,Late\n" +
      reportData.map(row => `${row.name},${row.present},${row.absent},${row.late}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const enhancedStats = weeklyStats ? [
    {
      label: "Total Present",
      value: weeklyStats.totalPresent || 0,
      icon: <Users className="w-6 h-6 text-green-500" />,
      description: "Employees present this week",
      trend: "This week",
      color: "green"
    },
    {
      label: "Total Absent",
      value: weeklyStats.totalAbsent || 0,
      icon: <UserX className="w-6 h-6 text-red-500" />,
      description: "Employees absent this week",
      trend: "This week",
      color: "red"
    },
    {
      label: "Late Arrivals",
      value: weeklyStats.totalLate || 0,
      icon: <Clock className="w-6 h-6 text-yellow-500" />,
      description: "Late arrivals this week",
      trend: "This week",
      color: "yellow"
    }
  ] : [];

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <div>
          <h2 className="text-3xl font-bold text-light-text dark:text-dark-text flex items-center gap-3">
            <Activity className="w-8 h-8 text-light-accent dark:text-dark-accent" />
            Reports
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
            Analyze attendance trends and generate insights
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={loading || error || reportData.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:bg-light-accent-hover dark:hover:bg-dark-accent-hover transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-red-800 dark:text-red-200 font-medium">Backend Connection Error</p>
            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-light-accent dark:border-dark-accent"></div>
          <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">Loading report data...</p>
        </div>
      )}

      {!loading && !error && enhancedStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {enhancedStats.map((stat) => (
          <div
            key={stat.label}
            className="group bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-green-600/20 cursor-pointer relative overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-${stat.color}-50/50 to-transparent dark:from-${stat.color}-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-light-hover dark:bg-dark-hover rounded-lg">
                    {stat.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                    {stat.label}
                  </h3>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <p className="text-3xl font-bold text-light-accent dark:text-dark-accent mb-2">
                {stat.value}
              </p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                {stat.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <Activity className="w-3 h-3" />
                {stat.trend}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {!loading && !error && reportData.length > 0 && (
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
          <BarChart data={reportData}>
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
      )}

      {!loading && !error && reportData.length === 0 && (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-12 border border-light-border dark:border-dark-border text-center">
          <Activity className="w-16 h-16 text-light-text-secondary dark:text-dark-text-secondary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">No Report Data Available</h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            There is no attendance data to display. Please ensure the backend is running and employees have checked in.
          </p>
        </div>
      )}
    </div>
  );
}
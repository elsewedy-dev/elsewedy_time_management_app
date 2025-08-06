import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DraggableStatsCards from "./components/DraggableStatsCards";
import Filters from "./components/Filters";
import AttendanceTable from "./components/AttendanceTable";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import About from "./components/About";
import Employees from "./components/Employees";
import Devices from "./components/Devices";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import { 
  LayoutDashboard, 
  Users, 
  Monitor, 
  BarChart3, 
  Settings as SettingsIcon, 
  Info 
} from "lucide-react";

const initialStats = [
  { label: "Total Employees", value: 127 },
  { label: "Present Today", value: 113 },
  { label: "Absent", value: 14 },
];

const initialAttendanceData = [
  {
    name: "Abel Mekonnen",
    id: "EMP102",
    inTime: "2024-07-31T08:12:00",
    outTime: "2024-07-31T17:01:00",
    status: "In",
    method: "Face",
  },
  {
    name: "Sara Bekele",
    id: "EMP103",
    inTime: "2024-07-31T08:27:00",
    outTime: null,
    status: "Out",
    method: "Fingerprint",
  },
  {
    name: "Samuel Gashaw",
    id: "EMP104",
    inTime: "2024-07-31T08:10:00",
    outTime: "2024-07-31T17:15:00",
    status: "In",
    method: "Face",
  },
];

const shortcuts = [
  { description: "Toggle Sidebar", keys: "Ctrl + S" },
  { description: "Show Shortcuts", keys: "Ctrl + K" },
  { description: "Toggle Theme", keys: "Ctrl + T" },
  { description: "Export Data", keys: "Ctrl + E" },
  { description: "Sync Logs", keys: "Ctrl + R" },
];

const pages = [
  { name: "Dashboard", key: "dashboard" },
  { name: "About", key: "about" },
];

function exportToCSV(data) {
  const headers = ["Employee", "ID", "In Time", "Out Time", "Status", "Method"];
  const rows = data.map(row => [
    row.name,
    row.id,
    row.inTime ? new Date(row.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
    row.outTime ? new Date(row.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
    row.status,
    row.method
  ]);
  let csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "attendance.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function App() {
  // For Electron desktop app, start with sidebar closed for better UX
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(initialStats);
  const [attendance] = useState(initialAttendanceData);
  const [loading] = useState(false);
  const [filters, setFilters] = useState({ date: "", name: "", type: "", onExport: handleExport });
  const [isDark, setIsDark] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [page, setPage] = useState("dashboard");

  function handleExport() {
    exportToCSV(filteredData);
  }

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setIsDark(initialTheme === 'dark');
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Stats reordering
  const handleStatsReorder = (newStats) => {
    setStats(newStats);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            setSidebarOpen(!sidebarOpen);
            break;
          case 'k':
            e.preventDefault();
            setShowShortcuts(!showShortcuts);
            break;
          case 't':
            e.preventDefault();
            toggleTheme();
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case 'r':
            e.preventDefault();
            // Trigger sync
            break;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, showShortcuts]);

  // Filtering logic
  const filteredData = useMemo(() => {
    return attendance.filter(row => {
      const dateMatch = !filters.date || (row.inTime && row.inTime.startsWith(filters.date));
      const nameMatch = !filters.name || row.name.toLowerCase().includes(filters.name.toLowerCase());
      const typeMatch = !filters.type || row.method === filters.type;
      return dateMatch && nameMatch && typeMatch;
    });
  }, [attendance, filters]);

  // Sidebar nav links
  const navLinks = [
    { name: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, key: "dashboard", active: page === "dashboard" },
    { name: "Employees", icon: <Users className="w-5 h-5" />, key: "employees", active: page === "employees" },
    { name: "Devices", icon: <Monitor className="w-5 h-5" />, key: "devices", active: page === "devices" },
    { name: "Reports", icon: <BarChart3 className="w-5 h-5" />, key: "reports", active: page === "reports" },
    { name: "Settings", icon: <SettingsIcon className="w-5 h-5" />, key: "settings", active: page === "settings" },
    { name: "About", icon: <Info className="w-5 h-5" />, key: "about", active: page === "about" },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text font-sans flex transition-all duration-300">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 transition-all duration-300 ease-in-out">
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} isDark={isDark} navLinks={navLinks} onNav={setPage} />
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          sidebarOpen={sidebarOpen}
          isDark={isDark}
          toggleTheme={toggleTheme}
          onShowShortcuts={() => setShowShortcuts(true)}
        />
        {/* Main dashboard content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 w-full flex flex-col gap-8">
          {page === "dashboard" && <>
            <DraggableStatsCards stats={stats} onStatsReorder={handleStatsReorder} isDark={isDark} />
            <Filters filters={filters} setFilters={setFilters} isDark={isDark} />
            <AttendanceTable data={filteredData} loading={loading} isDark={isDark} />
          </>}
          {page === "about" && <About isDark={isDark} />}
          {page === "employees" && <Employees />}
          {page === "devices" && <Devices />}
          {page === "reports" && <Reports />}
          {page === "settings" && <Settings />}
        </main>
      </div>
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts 
        isVisible={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        shortcuts={shortcuts}
        isDark={isDark}
      />
      </div>
  );
}

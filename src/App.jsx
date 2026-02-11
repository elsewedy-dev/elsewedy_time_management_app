import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "./ui/components/Sidebar";
import Header from "./ui/components/Header";
import Dashboard from "./ui/components/Dashboard";
import KeyboardShortcuts from "./ui/components/KeyboardShortcuts";
import About from "./ui/components/About";
import Employees from "./ui/components/Employees";
import Devices from "./ui/components/Devices";
import Reports from "./ui/components/Reports";
import Settings from "./ui/components/Settings";
import { useTodayAttendance, useEmployees, useDeviceStats } from "./hooks/useApi";
import apiService from "./services/api";
import { 
  LayoutDashboard, 
  Users, 
  Monitor, 
  BarChart3, 
  Settings as SettingsIcon, 
  Info 
} from "lucide-react";

const initialStats = [
  { label: "Total Employees", value: 0 },
  { label: "Present Today", value: 0 },
  { label: "Absent", value: 0 },
];

const initialAttendanceData = [];

const shortcuts = [
  { description: "Toggle Sidebar", keys: "Ctrl + S" },
  { description: "Show Shortcuts", keys: "Ctrl + K" },
  { description: "Toggle Theme", keys: "Ctrl + T" },
  { description: "Export Data", keys: "Ctrl + E" },
  { description: "Sync Logs", keys: "Ctrl + R" },
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
  const [isDark, setIsDark] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [syncing, setSyncing] = useState(false);
  
  // API hooks
  const { data: todayAttendance, loading: attendanceLoading, error: attendanceError } = useTodayAttendance();
  const { data: employees, loading: employeesLoading } = useEmployees();
  const { data: deviceStats, loading: deviceLoading } = useDeviceStats();
  
  // Derived state from API data
  const [stats, setStats] = useState(initialStats);
  const [attendance, setAttendance] = useState(initialAttendanceData);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ date: "", name: "", type: "", onExport: handleExport });

  function handleExport() {
    exportToCSV(filteredData);
  }

  async function handleSyncLogs() {
    if (syncing) return;
    
    setSyncing(true);
    try {
      const results = await apiService.syncAllDevices();
      
      // Check if any sync had errors
      const hasErrors = results.some(r => r.error);
      
      if (hasErrors) {
        const errorDevices = results.filter(r => r.error);
        alert(`Sync completed with errors:\n${errorDevices.map(r => r.error).join('\n')}`);
      } else {
        // Show success message with details if available
        const successResults = results.filter(r => r.success && r.data);
        if (successResults.length > 0 && successResults[0].data?.userSync) {
          const userSync = successResults[0].data.userSync;
          alert(`Sync completed!\n\nNew employees: ${userSync.created}\nUpdated: ${userSync.updated}\nAttendance logs synced successfully`);
        }
      }
      
      // Refresh attendance data after sync
      window.location.reload();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync logs. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function handleResetToday() {
    if (!confirm('Are you sure you want to clear all attendance records for today? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await apiService.resetTodayAttendance();
      if (response.success) {
        alert(`Successfully reset today's attendance (${response.data.deletedCount} records cleared)`);
        window.location.reload();
      }
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Failed to reset attendance. Please try again.');
    }
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

  // Update stats when API data is received
  useEffect(() => {
    if (todayAttendance && todayAttendance.data && todayAttendance.data.summary) {
      const { totalEmployees, present, absent } = todayAttendance.data.summary;
      
      setStats([
        { label: "Total Employees", value: totalEmployees || 0 },
        { label: "Present Today", value: present || 0 },
        { label: "Absent", value: absent || 0 },
      ]);
    } else if (attendanceError) {
      // Keep stats at 0 when there's an error
      setStats([
        { label: "Total Employees", value: 0 },
        { label: "Present Today", value: 0 },
        { label: "Absent", value: 0 },
      ]);
    }
  }, [todayAttendance, attendanceError]);

  // Update attendance data when API data is received
  useEffect(() => {
    if (todayAttendance && todayAttendance.data) {
      // Handle both array and object with attendance array
      const attendanceArray = Array.isArray(todayAttendance.data) 
        ? todayAttendance.data 
        : todayAttendance.data.attendance || [];
      
      const formattedAttendance = attendanceArray.map(record => {
        // Helper function to safely format time
        const formatTime = (timeString) => {
          if (!timeString) return '--';
          try {
            const date = new Date(timeString);
            if (isNaN(date.getTime())) return '--';
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          } catch (error) {
            console.error('Error formatting time:', error);
            return '--';
          }
        };

        return {
          name: `${record.employee.firstName} ${record.employee.lastName}`,
          id: record.employee.employeeId,
          inTime: formatTime(record.checkInTime),
          outTime: formatTime(record.checkOutTime),
          status: record.status === 'present' ? 'In' : 'Out',
          method: record.verificationMethod === 'face' ? 'Face' : 
                  record.verificationMethod === 'fingerprint' ? 'Fingerprint' : 
                  record.verificationMethod || 'Manual',
        };
      });
      setAttendance(formattedAttendance);
    }
  }, [todayAttendance]);

  // Update loading state
  useEffect(() => {
    setLoading(attendanceLoading || employeesLoading || deviceLoading);
  }, [attendanceLoading, employeesLoading, deviceLoading]);

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
            setShowShortcuts(prev => !prev);
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
            handleSyncLogs();
            break;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, showShortcuts, isDark, toggleTheme, handleExport]);

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
    // { name: "Reports", icon: <BarChart3 className="w-5 h-5" />, key: "reports", active: page === "reports" },
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
          onSyncLogs={handleSyncLogs}
          syncing={syncing}
        />
        {/* Main dashboard content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 w-full flex flex-col gap-8">
          {page === "dashboard" && (
            <Dashboard 
              stats={stats} 
              onStatsReorder={handleStatsReorder} 
              isDark={isDark} 
              filters={filters} 
              setFilters={setFilters} 
              filteredData={filteredData} 
              loading={loading}
              onExport={handleExport}
              onReset={handleResetToday}
            />
          )}
          {page === "about" && <About isDark={isDark} />}
          {page === "employees" && <Employees />}
          {page === "devices" && <Devices />}
          {/* {page === "reports" && <Reports />} */}
          {page === "settings" && <Settings isDark={isDark} toggleTheme={toggleTheme} />}
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
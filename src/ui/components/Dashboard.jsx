import React from "react";
import { 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Clock, 
  Calendar,
  Activity,
  BarChart3,
  Eye,
  Download,
  RefreshCw
} from "lucide-react";
import StatsCards from "./DraggableStatsCards";
import Filters from "./Filters";
import AttendanceTable from "./AttendanceTable";

const Dashboard = ({ 
  stats, 
  onStatsReorder, 
  isDark, 
  filters, 
  setFilters, 
  filteredData, 
  loading,
  onExport 
}) => {
  // Enhanced stats with icons and descriptions
  const enhancedStats = [
    {
      label: "Total Employees",
      value: stats.find(s => s.label === "Total Employees")?.value || 127,
      icon: <Users className="w-6 h-6 text-blue-500" />,
      description: "Registered employees in the system",
      trend: "+2 this month",
      color: "blue"
    },
    {
      label: "Present Today",
      value: stats.find(s => s.label === "Present Today")?.value || 113,
      icon: <UserCheck className="w-6 h-6 text-green-500" />,
      description: "Employees currently at work",
      trend: "89% attendance rate",
      color: "green"
    },
    {
      label: "Absent",
      value: stats.find(s => s.label === "Absent")?.value || 14,
      icon: <UserX className="w-6 h-6 text-red-500" />,
      description: "Employees not present today",
      trend: "11% absence rate",
      color: "red"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
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
        <div className="flex items-center gap-3">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:bg-light-accent-hover dark:hover:bg-dark-accent-hover transition-all duration-200 hover:scale-105"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover transition-all duration-200">
            <RefreshCw className="w-4 h-4" />
            Sync
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {enhancedStats.map((stat) => (
          <div
            key={stat.label}
            className="group bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-green-600/20 cursor-pointer relative overflow-hidden"
          >
            {/* Background gradient effect */}
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card rounded-lg p-4 border border-light-border dark:border-dark-border hover:shadow-md transition-all duration-200 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium text-light-text dark:text-dark-text">Time Tracking</h4>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Real-time monitoring</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-card rounded-lg p-4 border border-light-border dark:border-dark-border hover:shadow-md transition-all duration-200 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h4 className="font-medium text-light-text dark:text-dark-text">Schedule</h4>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Manage shifts</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-card rounded-lg p-4 border border-light-border dark:border-dark-border hover:shadow-md transition-all duration-200 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Eye className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h4 className="font-medium text-light-text dark:text-dark-text">Reports</h4>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Analytics & insights</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-card rounded-lg p-4 border border-light-border dark:border-dark-border hover:shadow-md transition-all duration-200 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h4 className="font-medium text-light-text dark:text-dark-text">Employees</h4>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Manage team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="space-y-6">
        <Filters filters={filters} setFilters={setFilters} isDark={isDark} />
        <AttendanceTable data={filteredData} loading={loading} isDark={isDark} />
      </div>
    </div>
  );
};

export default Dashboard; 
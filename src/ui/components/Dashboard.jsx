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
  onExport,
  onReset
}) => {
  // Enhanced stats with icons and descriptions
  const enhancedStats = [
    {
      label: "Total Employees",
      value: stats.find(s => s.label === "Total Employees")?.value || 0,
      icon: <Users className="w-6 h-6 text-blue-500" />,
      color: "blue"
    },
    {
      label: "Present Today",
      value: stats.find(s => s.label === "Present Today")?.value || 0,
      icon: <UserCheck className="w-6 h-6 text-green-500" />,
      color: "green"
    },
    {
      label: "Absent",
      value: stats.find(s => s.label === "Absent")?.value || 0,
      icon: <UserX className="w-6 h-6 text-red-500" />,
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
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Table */}
      <div className="space-y-6">
        <Filters filters={filters} setFilters={setFilters} isDark={isDark} onReset={onReset} />
        <AttendanceTable data={filteredData} loading={loading} isDark={isDark} />
      </div>
    </div>
  );
};

export default Dashboard; 
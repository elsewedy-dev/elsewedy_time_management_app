import React from "react";

export default function StatsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              index === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
              index === 1 ? 'bg-gradient-to-r from-green-500 to-green-600' :
              'bg-gradient-to-r from-orange-500 to-orange-600'
            }`}>
              {index === 0 && (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              )}
              {index === 1 && (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {index === 2 && (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className={`text-xs font-medium px-2 py-1 rounded-full ${
              index === 0 ? 'bg-blue-500/20 text-blue-300' :
              index === 1 ? 'bg-green-500/20 text-green-300' :
              'bg-orange-500/20 text-orange-300'
            }`}>
              {index === 0 ? 'Total' : index === 1 ? 'Present' : 'Absent'}
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
            {stat.value}
          </h2>
          <h3 className="text-sm font-medium text-gray-300">{stat.label}</h3>
        </div>
      ))}
    </div>
  );
} 
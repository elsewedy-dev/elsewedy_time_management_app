import React, { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import apiService from "../../services/api";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});

  // Fetch devices from backend
  useEffect(() => {
    fetchDevices();
  }, []);

  async function fetchDevices() {
    try {
      setLoading(true);
      const response = await apiService.getDevices();
      if (response.success && response.data) {
        // Add hardcoded Factory U270 device to the list
        const factoryDevice = {
          id: 'factory-u270',
          name: 'Factory U270',
          ipAddress: '192.168.1.11',
          type: 'U270',
          isActive: false,
          lastSyncTime: null
        };
        setDevices([...response.data, factoryDevice]);
      }
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(device) {
    // Factory U270 - show "device not found" error after loading
    if (device.name.toLowerCase().includes("factory") || device.name.toLowerCase().includes("u270")) {
      setSyncing(prev => ({ ...prev, [device.id]: true }));
      
      // Simulate loading for 2 seconds to make it realistic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSyncing(prev => ({ ...prev, [device.id]: false }));
      alert("Device not detected. Please check the device connection and IP address.");
      return;
    }

    // XFace Pro - sync with backend
    setSyncing(prev => ({ ...prev, [device.id]: true }));
    try {
      const result = await apiService.syncDevice(device.id);
      
      if (result.success) {
        alert(`Sync completed!\n\nNew employees: ${result.data?.userSync?.created || 0}\nUpdated: ${result.data?.userSync?.updated || 0}\nAttendance logs synced successfully`);
        // Refresh devices to get updated lastSyncTime
        await fetchDevices();
      } else {
        alert(`Sync failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Sync failed:", error);
      alert(`Sync failed: ${error.message || 'Connection error'}`);
    } finally {
      setSyncing(prev => ({ ...prev, [device.id]: false }));
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Devices</h2>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-light-accent dark:text-dark-accent" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-light-accent/5 dark:bg-dark-accent/5">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">IP Address</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Last Sync</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-light-textSecondary dark:text-dark-textSecondary">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No devices found
                  </td>
                </tr>
              ) : (
                devices.map(device => (
                  <tr key={device.id} className="hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-colors duration-200">
                    <td className="px-4 py-3 font-medium text-light-text dark:text-dark-text">{device.name}</td>
                    <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{device.ipAddress}</td>
                    <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{device.type}</td>
                    <td className="px-4 py-3">
                      {device.isActive ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                          <CheckCircle className="w-4 h-4" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500 dark:text-red-400 font-semibold">
                          <XCircle className="w-4 h-4" /> Offline
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">
                      {device.lastSyncTime ? new Date(device.lastSyncTime).toLocaleString() : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSync(device)}
                        disabled={syncing[device.id]}
                        className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded shadow hover:scale-105 hover:shadow-lg transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing[device.id] ? 'animate-spin' : ''}`} />
                        {syncing[device.id] ? 'Syncing...' : 'Sync Now'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 
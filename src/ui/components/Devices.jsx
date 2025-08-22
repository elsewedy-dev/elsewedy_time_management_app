import React, { useState } from "react";
import { Plus, RefreshCw, CheckCircle, XCircle } from "lucide-react";

const initialDevices = [
  {
    id: 1,
    name: "Main Gate XFace Pro",
    ip: "192.168.1.10",
    type: "XFace Pro",
    status: "online",
    lastSync: "2025-07-31 12:00",
  },
  {
    id: 2,
    name: "Factory U270",
    ip: "192.168.1.11",
    type: "U270",
    status: "offline",
    lastSync: "2025-07-30 18:30",
  },
];

export default function Devices() {
  const [devices, setDevices] = useState(initialDevices);
  const [showModal, setShowModal] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: "", ip: "", type: "XFace Pro" });

  function handleAddDevice(e) {
    e.preventDefault();
    setDevices([
      ...devices,
      {
        id: Date.now(),
        ...newDevice,
        status: "offline",
        lastSync: "--",
      },
    ]);
    setShowModal(false);
    setNewDevice({ name: "", ip: "", type: "XFace Pro" });
  }

  function handleSync(id) {
    setDevices(devices =>
      devices.map(d =>
        d.id === id ? { ...d, status: "online", lastSync: new Date().toLocaleString() } : d
      )
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Devices</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg font-medium shadow hover:scale-105 hover:shadow-xl transition-all"
        >
          <Plus className="w-4 h-4" /> Add Device
        </button>
      </div>
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
            {devices.map(device => (
              <tr key={device.id} className="hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-colors duration-200">
                <td className="px-4 py-3 font-medium text-light-text dark:text-dark-text">{device.name}</td>
                <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{device.ip}</td>
                <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{device.type}</td>
                <td className="px-4 py-3">
                  {device.status === "online" ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                      <CheckCircle className="w-4 h-4" /> Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 dark:text-red-400 font-semibold">
                      <XCircle className="w-4 h-4" /> Offline
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{device.lastSync}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleSync(device.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded shadow hover:scale-105 hover:shadow-lg transition-all text-xs"
                  >
                    <RefreshCw className="w-4 h-4" /> Sync Now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Device Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form
            onSubmit={handleAddDevice}
            className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border w-full max-w-sm animate-fade-in"
          >
            <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text">Add Device</h3>
            <div className="mb-4">
              <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Device Name</label>
              <input
                required
                value={newDevice.name}
                onChange={e => setNewDevice(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-1 text-light-text dark:text-dark-text">IP Address</label>
              <input
                required
                value={newDevice.ip}
                onChange={e => setNewDevice(d => ({ ...d, ip: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Device Type</label>
              <select
                value={newDevice.type}
                onChange={e => setNewDevice(d => ({ ...d, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              >
                <option value="XFace Pro">XFace Pro</option>
                <option value="U270">U270</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-dark-accent/10 text-gray-700 dark:text-dark-textSecondary hover:bg-gray-300 dark:hover:bg-dark-accent/20 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white font-semibold shadow hover:scale-105 hover:shadow-lg transition-all"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 
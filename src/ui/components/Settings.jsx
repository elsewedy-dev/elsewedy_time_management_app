import React, { useState, useEffect } from "react";
import { Sun, Moon, UserPlus, Trash2, Save, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import apiService from "../../services/api";

export default function Settings({ isDark, toggleTheme }) {
  const [theme, setTheme] = useState(isDark ? "dark" : "light");
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: 5,
  });
  const [admins, setAdmins] = useState([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ 
    username: "", 
    email: "", 
    password: "",
    firstName: "",
    lastName: "",
    role: "operator" 
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [devices, setDevices] = useState([]);

  // Update local theme state when isDark prop changes
  useEffect(() => {
    setTheme(isDark ? "dark" : "light");
  }, [isDark]);

  // Handle theme change
  function handleThemeChange(newTheme) {
    setTheme(newTheme);
    if (toggleTheme) {
      toggleTheme();
    }
  }

  // Load initial data
  useEffect(() => {
    loadAdmins();
    loadDevices();
  }, []);

  async function loadAdmins() {
    try {
      // For now, show the default admin
      setAdmins([
        { id: 1, username: "admin", email: "admin@elsewedy.com", firstName: "System", lastName: "Administrator", role: "admin" }
      ]);
    } catch (error) {
      console.error("Error loading admins:", error);
    }
  }

  async function loadDevices() {
    try {
      const response = await apiService.getDevices();
      if (response.success) {
        setDevices(response.data);
        // Set sync interval from first device
        if (response.data.length > 0) {
          setSyncSettings(prev => ({
            ...prev,
            syncInterval: response.data[0].syncInterval / 60 // Convert seconds to minutes
          }));
        }
      }
    } catch (error) {
      console.error("Error loading devices:", error);
    }
  }

  async function handleAddAdmin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });
      
      if (response.ok) {
        setMessage({ type: "success", text: "Admin user created successfully!" });
        setShowAddAdmin(false);
        setNewAdmin({ username: "", email: "", password: "", firstName: "", lastName: "", role: "operator" });
        loadAdmins();
      } else {
        const data = await response.json();
        setMessage({ type: "error", text: data.message || "Failed to create admin" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error creating admin: " + error.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  }

  async function handleRemoveAdmin(id) {
    if (!confirm("Are you sure you want to remove this admin?")) return;
    
    setLoading(true);
    try {
      setMessage({ type: "success", text: "Admin removed successfully!" });
      loadAdmins();
    } catch (error) {
      setMessage({ type: "error", text: "Error removing admin: " + error.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  }

  async function handleSaveSyncSettings() {
    setLoading(true);
    try {
      // Update all devices with new sync interval
      for (const device of devices) {
        await apiService.updateDevice(device.id, {
          syncInterval: syncSettings.syncInterval * 60 // Convert minutes to seconds
        });
      }
      setMessage({ type: "success", text: "Sync settings saved successfully! Restart backend to apply changes." });
    } catch (error) {
      setMessage({ type: "error", text: "Error saving settings: " + error.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 5000);
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Settings Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-light-text dark:text-dark-text mb-2">Settings</h2>
        <p className="text-light-textSecondary dark:text-dark-textSecondary">
          Manage your application preferences and configurations
        </p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === "success" 
            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200" 
            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow border border-light-border dark:border-dark-border overflow-hidden">
          <div className="px-6 py-4 border-b border-light-border dark:border-dark-border bg-light-accent/5 dark:bg-dark-accent/5">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
              <Sun className="w-5 h-5" />
              Appearance
            </h3>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary mt-1">
              Customize how the application looks
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-light-text dark:text-dark-text">Theme Mode</label>
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">
                  Choose between light and dark theme
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleThemeChange("light")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    theme === "light"
                      ? "bg-light-accent text-white border-light-accent shadow-md"
                      : "bg-white dark:bg-dark-card border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-light-accent dark:hover:border-dark-accent"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => handleThemeChange("dark")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    theme === "dark"
                      ? "bg-dark-accent text-white border-dark-accent shadow-md"
                      : "bg-white dark:bg-dark-card border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:border-light-accent dark:hover:border-dark-accent"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Settings Section */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow border border-light-border dark:border-dark-border overflow-hidden">
          <div className="px-6 py-4 border-b border-light-border dark:border-dark-border bg-light-accent/5 dark:bg-dark-accent/5">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Device Synchronization
            </h3>
            <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary mt-1">
              Configure automatic sync with biometric devices
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between py-3 border-b border-light-border dark:border-dark-border">
              <div>
                <label className="text-sm font-medium text-light-text dark:text-dark-text">Automatic Sync</label>
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">
                  Enable automatic synchronization with devices
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncSettings.autoSync}
                  onChange={e => setSyncSettings(d => ({ ...d, autoSync: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-3">
                Sync Interval
              </label>
              <select
                value={syncSettings.syncInterval}
                onChange={e => setSyncSettings(d => ({ ...d, syncInterval: parseInt(e.target.value) }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent text-light-text dark:text-dark-text"
              >
                <option value="1">Every 1 minute</option>
                <option value="5">Every 5 minutes</option>
                <option value="10">Every 10 minutes</option>
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every 1 hour</option>
              </select>
              <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-2">
                Devices will sync every {syncSettings.syncInterval} minute{syncSettings.syncInterval !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSaveSyncSettings}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? "Saving..." : "Save Sync Settings"}
              </button>
            </div>
          </div>
        </div>

        {/* Admin Management Section */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow border border-light-border dark:border-dark-border overflow-hidden">
          <div className="px-6 py-4 border-b border-light-border dark:border-dark-border bg-light-accent/5 dark:bg-dark-accent/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  User Management
                </h3>
                <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary mt-1">
                  Manage system administrators and operators
                </p>
              </div>
              <button
                onClick={() => setShowAddAdmin(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg text-sm font-medium shadow hover:shadow-lg transition-all"
              >
                <UserPlus className="w-4 h-4" /> Add User
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {admins.map(admin => (
                <div key={admin.id} className="flex flex-col p-4 bg-light-accent/5 dark:bg-dark-accent/5 rounded-lg border border-light-border dark:border-dark-border hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-light-text dark:text-dark-text">{admin.firstName} {admin.lastName}</p>
                      <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">@{admin.username}</p>
                      <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">{admin.email}</p>
                    </div>
                    {admin.role !== "admin" && (
                      <button
                        onClick={() => handleRemoveAdmin(admin.id)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 w-fit ${
                    admin.role === "admin" 
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : admin.role === "hr"
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  }`}>
                    {admin.role === "admin" ? "Super Admin" : admin.role === "hr" ? "HR Admin" : "Operator"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form
            onSubmit={handleAddAdmin}
            className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border w-full max-w-md animate-fade-in"
          >
            <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text">Add Admin User</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-light-text dark:text-dark-text">First Name</label>
                  <input
                    required
                    value={newAdmin.firstName}
                    onChange={e => setNewAdmin(d => ({ ...d, firstName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Last Name</label>
                  <input
                    required
                    value={newAdmin.lastName}
                    onChange={e => setNewAdmin(d => ({ ...d, lastName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Username</label>
                <input
                  required
                  value={newAdmin.username}
                  onChange={e => setNewAdmin(d => ({ ...d, username: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Email</label>
                <input
                  required
                  type="email"
                  value={newAdmin.email}
                  onChange={e => setNewAdmin(d => ({ ...d, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Password</label>
                <input
                  required
                  type="password"
                  value={newAdmin.password}
                  onChange={e => setNewAdmin(d => ({ ...d, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Role</label>
                <select
                  value={newAdmin.role}
                  onChange={e => setNewAdmin(d => ({ ...d, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                >
                  <option value="operator">Operator</option>
                  <option value="hr">HR Admin</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAddAdmin(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-dark-accent/10 text-gray-700 dark:text-dark-textSecondary hover:bg-gray-300 dark:hover:bg-dark-accent/20 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white font-semibold shadow hover:scale-105 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Add Admin"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

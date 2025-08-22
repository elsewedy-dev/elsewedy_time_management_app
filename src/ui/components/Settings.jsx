import React, { useState } from "react";
import { Sun, Moon, UserPlus, Trash2 } from "lucide-react";

const initialAdmins = [
  { id: 1, name: "Admin User", email: "admin@company.com", role: "Super Admin" },
  { id: 2, name: "HR Manager", email: "hr@company.com", role: "HR Admin" },
];

export default function Settings() {
  const [companyInfo, setCompanyInfo] = useState({
    name: "Attendance Pro",
    address: "123 Business Street, City, Country",
    phone: "+1 234 567 8900",
    email: "info@attendancepro.com",
  });
  const [theme, setTheme] = useState("light");
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: "30",
    backupEnabled: true,
  });
  const [admins, setAdmins] = useState(initialAdmins);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", role: "HR Admin" });

  function handleAddAdmin(e) {
    e.preventDefault();
    setAdmins([...admins, { id: Date.now(), ...newAdmin }]);
    setShowAddAdmin(false);
    setNewAdmin({ name: "", email: "", role: "HR Admin" });
  }

  function handleRemoveAdmin(id) {
    setAdmins(admins.filter(admin => admin.id !== id));
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Settings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Information */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border">
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">Company Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">Company Name</label>
              <input
                type="text"
                value={companyInfo.name}
                onChange={e => setCompanyInfo(d => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">Address</label>
              <textarea
                value={companyInfo.address}
                onChange={e => setCompanyInfo(d => ({ ...d, address: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">Phone</label>
                <input
                  type="tel"
                  value={companyInfo.phone}
                  onChange={e => setCompanyInfo(d => ({ ...d, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">Email</label>
                <input
                  type="email"
                  value={companyInfo.email}
                  onChange={e => setCompanyInfo(d => ({ ...d, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">Company Logo</label>
              <div className="border-2 border-dashed border-light-border dark:border-dark-border rounded-lg p-6 text-center">
                <p className="text-light-textSecondary dark:text-dark-textSecondary">Click to upload logo</p>
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Theme & Preferences */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border">
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">Theme & Preferences</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-3">Theme</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    theme === "light"
                      ? "bg-light-accent text-white border-light-accent"
                      : "bg-white dark:bg-dark-card border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    theme === "dark"
                      ? "bg-dark-accent text-white border-dark-accent"
                      : "bg-white dark:bg-dark-card border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Device Sync Settings */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border">
          <h3 className="text-xl font-semibold text-light-text dark:text-dark-text mb-6">Device Sync Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-light-text dark:text-dark-text">Auto Sync</label>
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary">Automatically sync with devices</p>
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
              <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">Sync Interval (minutes)</label>
              <select
                value={syncSettings.syncInterval}
                onChange={e => setSyncSettings(d => ({ ...d, syncInterval: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-light-text dark:text-dark-text">Backup Data</label>
                <p className="text-xs text-light-textSecondary dark:text-dark-textSecondary">Automatically backup attendance data</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncSettings.backupEnabled}
                  onChange={e => setSyncSettings(d => ({ ...d, backupEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Admin Management */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-light-text dark:text-dark-text">Admin Management</h3>
            <button
              onClick={() => setShowAddAdmin(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg text-sm font-medium shadow hover:scale-105 hover:shadow-lg transition-all"
            >
              <UserPlus className="w-4 h-4" /> Add Admin
            </button>
          </div>
          <div className="space-y-3">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center justify-between p-3 bg-light-accent/5 dark:bg-dark-accent/5 rounded-lg">
                <div>
                  <p className="font-medium text-light-text dark:text-dark-text">{admin.name}</p>
                  <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary">{admin.email}</p>
                  <span className="inline-block px-2 py-1 text-xs bg-light-accent/20 dark:bg-dark-accent/20 text-light-accent dark:text-dark-accent rounded-full mt-1">
                    {admin.role}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveAdmin(admin.id)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form
            onSubmit={handleAddAdmin}
            className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border w-full max-w-sm animate-fade-in"
          >
            <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text">Add Admin</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Name</label>
                <input
                  required
                  value={newAdmin.name}
                  onChange={e => setNewAdmin(d => ({ ...d, name: e.target.value }))}
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
                <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Role</label>
                <select
                  value={newAdmin.role}
                  onChange={e => setNewAdmin(d => ({ ...d, role: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                >
                  <option value="HR Admin">HR Admin</option>
                  <option value="Super Admin">Super Admin</option>
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
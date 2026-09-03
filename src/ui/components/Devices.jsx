import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  X,
  Save,
  Wifi,
  WifiOff,
} from "lucide-react";
import apiService from "../../services/api";

const DEVICE_TYPES = [
  { value: "u270", label: "U270" },
  { value: "xface_pro", label: "XFace Pro" },
  { value: "fingerprint", label: "Fingerprint" },
  { value: "face_recognition", label: "Face Recognition" },
  { value: "card_reader", label: "Card Reader" },
];

const EMPTY_FORM = {
  name: "",
  type: "xface_pro",
  ipAddress: "",
  port: 4370,
  password: "0",
  location: "",
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});
  const [testing, setTesting] = useState({});

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null); // null = add mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Notification state
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  function showNotification(message, type = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }

  async function fetchDevices() {
    try {
      setLoading(true);
      const response = await apiService.getDevices();
      if (response.success && response.data) {
        setDevices(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  }

  // ── Modal helpers ──────────────────────────────────────────────────────────

  function openAddModal() {
    setEditingDevice(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSaveError("");
    setShowModal(true);
  }

  function openEditModal(device) {
    setEditingDevice(device);
    setForm({
      name: device.name || "",
      type: device.type || "xface_pro",
      ipAddress: device.ipAddress || "",
      port: device.port || 4370,
      password: device.password || "0",
      location: device.location || "",
    });
    setFormErrors({});
    setSaveError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingDevice(null);
    setSaveError("");
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "port" ? Number(value) : value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validateForm() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Device name is required";
    if (!form.ipAddress.trim()) errors.ipAddress = "IP address is required";
    else if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(form.ipAddress))
      errors.ipAddress = "Enter a valid IP address (e.g. 10.201.1.197)";
    if (!form.port || form.port < 1 || form.port > 65535)
      errors.port = "Port must be between 1 and 65535";
    return errors;
  }

  async function handleSave() {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      if (editingDevice) {
        await apiService.updateDevice(editingDevice.id, form);
        showNotification(`"${form.name}" updated successfully`);
      } else {
        await apiService.createDevice(form);
        showNotification(`"${form.name}" added successfully`);
      }
      closeModal();
      await fetchDevices();
    } catch (error) {
      setSaveError(error.message || "Failed to save device");
    } finally {
      setSaving(false);
    }
  }

  // ── Sync & Test ────────────────────────────────────────────────────────────

  async function handleSync(device) {
    setSyncing((prev) => ({ ...prev, [device.id]: true }));
    try {
      const result = await apiService.syncDevice(device.id);
      if (result.success) {
        showNotification(
          `Sync done — ${result.data?.userSync?.created || 0} new employees, ${result.data?.userSync?.updated || 0} updated`
        );
        await fetchDevices();
      } else {
        showNotification(result.error || "Sync failed", "error");
      }
    } catch (error) {
      showNotification(error.message || "Connection error", "error");
    } finally {
      setSyncing((prev) => ({ ...prev, [device.id]: false }));
    }
  }

  async function handleTest(device) {
    setTesting((prev) => ({ ...prev, [device.id]: true }));
    try {
      const result = await apiService.testDeviceConnection(device.id);
      if (result.success) {
        showNotification(`Connected to "${device.name}" successfully`);
      } else {
        showNotification(`Cannot reach "${device.name}": ${result.message}`, "error");
      }
    } catch (error) {
      showNotification(error.message || "Connection test failed", "error");
    } finally {
      setTesting((prev) => ({ ...prev, [device.id]: false }));
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getStatusInfo(device) {
    const syncStatus = device.status?.syncStatus;
    if (!syncStatus) {
      return { online: false, label: "Offline", color: "text-red-500 dark:text-red-400" };
    }
    if (syncStatus.status === "online") {
      return { online: true, label: "Online", color: "text-green-600 dark:text-green-400" };
    }
    if (syncStatus.status === "never_synced") {
      return { online: false, label: "Never Synced", color: "text-yellow-500 dark:text-yellow-400" };
    }
    if (syncStatus.status === "error") {
      return { online: false, label: "Error", color: "text-red-500 dark:text-red-400" };
    }
    return { online: false, label: "Offline", color: "text-red-500 dark:text-red-400" };
  }

  function typeLabel(type) {
    return DEVICE_TYPES.find((t) => t.value === type)?.label || type?.toUpperCase() || "—";
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      {/* Notification toast */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
            ${notification.type === "error" ? "bg-red-600" : "bg-green-600"}`}
        >
          {notification.type === "error" ? (
            <XCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Devices</h2>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Device
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-light-accent dark:text-dark-accent" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-light-accent/5 dark:bg-dark-accent/5">
              <tr>
                {["Name", "IP Address", "Port", "Type", "Status", "Last Sync", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-light-textSecondary dark:text-dark-textSecondary">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="mb-3">No devices found</p>
                    <button
                      onClick={openAddModal}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg text-sm"
                    >
                      <Plus className="w-4 h-4" /> Add your first device
                    </button>
                  </td>
                </tr>
              ) : (
                devices.map((device) => {
                  const status = getStatusInfo(device);
                  return (
                    <tr
                      key={device.id}
                      className="hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-colors duration-200"
                    >
                      <td className="px-4 py-3 font-medium text-light-text dark:text-dark-text">
                        {device.name}
                      </td>
                      <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary font-mono text-sm">
                        {device.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary text-sm">
                        {device.port}
                      </td>
                      <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">
                        {typeLabel(device.type)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 font-semibold text-sm ${status.color}`}>
                          {status.online ? (
                            <Wifi className="w-4 h-4" />
                          ) : (
                            <WifiOff className="w-4 h-4" />
                          )}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary text-sm">
                        {device.lastSyncTime
                          ? new Date(device.lastSyncTime).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(device)}
                            title="Edit device"
                            className="flex items-center gap-1 px-3 py-1 bg-light-accent/10 dark:bg-dark-accent/10 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 text-light-text dark:text-dark-text rounded text-xs transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>

                          {/* Test */}
                          <button
                            onClick={() => handleTest(device)}
                            disabled={testing[device.id]}
                            title="Test connection"
                            className="flex items-center gap-1 px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded text-xs transition-all disabled:opacity-50"
                          >
                            {testing[device.id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Wifi className="w-3.5 h-3.5" />
                            )}
                            {testing[device.id] ? "Testing..." : "Test"}
                          </button>

                          {/* Sync */}
                          <button
                            onClick={() => handleSync(device)}
                            disabled={syncing[device.id]}
                            title="Sync attendance logs"
                            className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded text-xs hover:scale-105 hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing[device.id] ? "animate-spin" : ""}`} />
                            {syncing[device.id] ? "Syncing..." : "Sync Now"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
              <h3 className="text-lg font-bold text-light-text dark:text-dark-text">
                {editingDevice ? "Edit Device" : "Add New Device"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 text-light-textSecondary dark:text-dark-textSecondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                    Device Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Factory Entrance"
                    className={`w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent
                      ${formErrors.name ? "border-red-500" : "border-light-border dark:border-dark-border"}`}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>

                {/* Type */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                    Device Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* IP Address */}
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                    IP Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="ipAddress"
                    value={form.ipAddress}
                    onChange={handleFormChange}
                    placeholder="e.g. 10.201.1.197"
                    className={`w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border text-light-text dark:text-dark-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent
                      ${formErrors.ipAddress ? "border-red-500" : "border-light-border dark:border-dark-border"}`}
                  />
                  {formErrors.ipAddress && <p className="text-red-500 text-xs mt-1">{formErrors.ipAddress}</p>}
                </div>

                {/* Port */}
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                    Port <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="port"
                    type="number"
                    value={form.port}
                    onChange={handleFormChange}
                    placeholder="4370"
                    className={`w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent
                      ${formErrors.port ? "border-red-500" : "border-light-border dark:border-dark-border"}`}
                  />
                  {formErrors.port && <p className="text-red-500 text-xs mt-1">{formErrors.port}</p>}
                </div>

                {/* Device Password */}
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                    Device Password
                  </label>
                  <input
                    name="password"
                    value={form.password}
                    onChange={handleFormChange}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                    Location
                  </label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    placeholder="e.g. Main Entrance"
                    className="w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-light-border dark:border-dark-border">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg text-sm font-medium hover:scale-105 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving..." : editingDevice ? "Save Changes" : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

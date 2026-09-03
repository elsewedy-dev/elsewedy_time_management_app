import React, { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Users, X, Save, Loader2,
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Search
} from "lucide-react";
import apiService from "../../services/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#10B981","#6366F1","#F59E0B","#EF4444","#3B82F6","#8B5CF6","#EC4899","#14B8A6"];

const EMPTY_FORM = {
  name: "", startTime: "08:00", endTime: "16:00",
  breakDuration: 30, workingDays: [0,1,2,3,4,5,6],
  color: "#10B981", description: "", lateThreshold: 15, overtimeThreshold: 30,
};

function ShiftBadge({ color, name }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}>
      <Clock className="w-3 h-3" />{name}
    </span>
  );
}

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modal states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState("");

  // Employee assignment states
  const [expandedShift, setExpandedShift] = useState(null);
  const [shiftEmployees, setShiftEmployees] = useState({});
  const [allEmployees, setAllEmployees] = useState([]);
  const [assignSearch, setAssignSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { fetchShifts(); fetchAllEmployees(); }, []);

  function showNotif(message, type = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }

  async function fetchShifts() {
    try {
      setLoading(true);
      const res = await apiService.getShifts();
      if (res.success) setShifts(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchAllEmployees() {
    try {
      const res = await apiService.getEmployees({ limit: 500 });
      if (res.success && res.data) {
        setAllEmployees(res.data);
      }
    } catch (e) { console.error("Failed to load employees:", e); }
  }

  async function fetchShiftEmployees(shiftId) {
    try {
      const res = await apiService.getShiftEmployees(shiftId);
      if (res.success) setShiftEmployees(prev => ({ ...prev, [shiftId]: res.data }));
    } catch (e) { console.error(e); }
  }

  async function toggleExpand(shiftId) {
    if (expandedShift === shiftId) { setExpandedShift(null); return; }
    setExpandedShift(shiftId);
    setAssignSearch("");
    if (!shiftEmployees[shiftId]) await fetchShiftEmployees(shiftId);
  }

  // ── Modal helpers ────────────────────────────────────────────────────────────
  function openAdd() {
    setEditingShift(null); setForm(EMPTY_FORM);
    setFormErrors({}); setSaveError(""); setShowShiftModal(true);
  }

  function openEdit(shift) {
    setEditingShift(shift);
    setForm({
      name: shift.name, startTime: shift.startTime?.slice(0,5) || "08:00",
      endTime: shift.endTime?.slice(0,5) || "16:00",
      breakDuration: shift.breakDuration ?? 30,
      workingDays: shift.workingDays || [0,1,2,3,4,5,6],
      color: shift.color || "#10B981", description: shift.description || "",
      lateThreshold: shift.lateThreshold ?? 15,
      overtimeThreshold: shift.overtimeThreshold ?? 30,
    });
    setFormErrors({}); setSaveError(""); setShowShiftModal(true);
  }

  function closeModal() { setShowShiftModal(false); setEditingShift(null); setSaveError(""); }

  function handleFormChange(e) {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
    setFormErrors(prev => ({ ...prev, [name]: "" }));
  }

  function toggleDay(day) {
    setForm(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day].sort(),
    }));
  }

  function validateForm() {
    const errors = {};
    if (!form.name.trim()) errors.name = "Shift name is required";
    if (!form.startTime) errors.startTime = "Start time is required";
    if (!form.endTime) errors.endTime = "End time is required";
    if (form.workingDays.length === 0) errors.workingDays = "Select at least one working day";
    return errors;
  }

  async function handleSave() {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setSaving(true); setSaveError("");
    try {
      if (editingShift) {
        await apiService.updateShift(editingShift.id, form);
        showNotif(`"${form.name}" updated`);
      } else {
        await apiService.createShift(form);
        showNotif(`"${form.name}" created`);
      }
      closeModal(); fetchShifts();
    } catch (e) { setSaveError(e.message || "Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDelete(shift) {
    if (!confirm(`Delete shift "${shift.name}"? All assigned employees will be unassigned.`)) return;
    setDeleting(shift.id);
    try {
      await apiService.deleteShift(shift.id);
      showNotif(`"${shift.name}" deleted`);
      fetchShifts();
      if (expandedShift === shift.id) setExpandedShift(null);
    } catch (e) { showNotif(e.message || "Delete failed", "error"); }
    finally { setDeleting(null); }
  }

  // ── Employee assignment ──────────────────────────────────────────────────────
  const assignedIds = new Set((shiftEmployees[expandedShift] || []).map(e => e.id));

  // Show employees that match the search — all employees, both assigned and not
  const searchedEmployees = allEmployees.filter(e => {
    if (!assignSearch.trim()) return true;
    const q = assignSearch.toLowerCase();
    return (
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (e.employeeId || '').toLowerCase().includes(q) ||
      (e.department?.name || '').toLowerCase().includes(q)
    );
  });

  // Split into unassigned and already-assigned for display
  const unassignedResults = searchedEmployees.filter(e => !assignedIds.has(e.id));
  const assignedResults   = searchedEmployees.filter(e =>  assignedIds.has(e.id));

  async function handleAssign(employeeId) {
    if (!expandedShift) return;
    setAssigning(true);
    try {
      await apiService.assignEmployeesToShift(expandedShift, [employeeId]);
      await fetchShiftEmployees(expandedShift);
      await fetchShifts();
      showNotif("Employee assigned");
    } catch (e) { showNotif(e.message || "Failed to assign", "error"); }
    finally { setAssigning(false); }
  }

  async function handleUnassign(employeeId) {
    if (!expandedShift) return;
    setAssigning(true);
    try {
      await apiService.unassignEmployeesFromShift(expandedShift, [employeeId]);
      await fetchShiftEmployees(expandedShift);
      await fetchShifts();
      showNotif("Employee removed from shift");
    } catch (e) { showNotif(e.message || "Failed to unassign", "error"); }
    finally { setAssigning(false); }
  }

  function workingHours(start, end) {
    if (!start || !end) return "--";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? mins % 60 + "m" : ""}`.trim();
  }

  function to12h(time) {
    if (!time) return '--';
    const [h, m] = time.slice(0, 5).split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Toast */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium
          ${notification.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
          {notification.type === "error" ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Shifts</h2>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg shadow hover:scale-105 transition-all text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Shift
        </button>
      </div>

      {/* Shifts list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-light-accent dark:text-dark-accent" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="text-center py-16 text-light-textSecondary dark:text-dark-textSecondary">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-3">No shifts yet</p>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg text-sm">
            <Plus className="w-4 h-4" /> Create your first shift
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {shifts.map(shift => (
            <div key={shift.id}
              className="bg-white dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border shadow overflow-hidden">
              {/* Shift row */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: shift.color }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-light-text dark:text-dark-text">{shift.name}</span>
                    {shift.isNightShift && (
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full">Night</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-1 text-sm text-light-textSecondary dark:text-dark-textSecondary">
                    <span>{to12h(shift.startTime)} – {to12h(shift.endTime)}</span>
                    <span>{workingHours(shift.startTime, shift.endTime)} working</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />{shift.employeeCount || 0} employees
                    </span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {DAYS.map((d, i) => (
                      <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${
                        (shift.workingDays || []).includes(i)
                          ? "text-white font-medium" : "bg-light-accent/10 dark:bg-dark-accent/10 text-light-textSecondary dark:text-dark-textSecondary"
                      }`} style={(shift.workingDays || []).includes(i) ? { backgroundColor: shift.color } : {}}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleExpand(shift.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-light-accent/10 dark:bg-dark-accent/10 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 text-light-text dark:text-dark-text transition-all">
                    <Users className="w-3.5 h-3.5" />
                    {expandedShift === shift.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(shift)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-light-accent/10 dark:bg-dark-accent/10 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 text-light-text dark:text-dark-text transition-all">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(shift)} disabled={deleting === shift.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-all disabled:opacity-50">
                    {deleting === shift.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                </div>
              </div>

              {/* Employee assignment panel */}
              {expandedShift === shift.id && (
                <div className="border-t border-light-border dark:border-dark-border bg-light-accent/3 dark:bg-dark-accent/5 px-5 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Assigned employees */}
                    <div>
                      <h4 className="text-sm font-semibold text-light-text dark:text-dark-text mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Assigned Employees ({(shiftEmployees[shift.id] || []).length})
                      </h4>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {(shiftEmployees[shift.id] || []).length === 0 ? (
                          <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary py-4 text-center">
                            No employees assigned yet
                          </p>
                        ) : (
                          (shiftEmployees[shift.id] || []).map(emp => (
                            <div key={emp.id}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-dark-bg border border-light-border dark:border-dark-border group">
                              <div>
                                <span className="text-sm font-medium text-light-text dark:text-dark-text">
                                  {emp.firstName} {emp.lastName}
                                </span>
                                <span className="ml-2 text-xs text-light-textSecondary dark:text-dark-textSecondary">
                                  #{emp.employeeId}
                                </span>
                                {emp.department && (
                                  <span className="ml-2 text-xs text-light-textSecondary dark:text-dark-textSecondary">
                                    · {emp.department.name}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleUnassign(emp.id)}
                                disabled={assigning}
                                title="Remove from shift"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-30">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Available employees to assign */}
                    <div>
                      <h4 className="text-sm font-semibold text-light-text dark:text-dark-text mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Employees
                        <span className="text-xs font-normal text-light-textSecondary dark:text-dark-textSecondary">
                          ({allEmployees.length} total)
                        </span>
                      </h4>
                      <div className="relative mb-2">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-light-textSecondary dark:text-dark-textSecondary" />
                        <input
                          value={assignSearch}
                          onChange={e => setAssignSearch(e.target.value)}
                          placeholder="Type name or ID to search..."
                          className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-white dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
                        />
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {allEmployees.length === 0 ? (
                          <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary py-4 text-center flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading employees...
                          </p>
                        ) : searchedEmployees.length === 0 ? (
                          <p className="text-sm text-light-textSecondary dark:text-dark-textSecondary py-4 text-center">
                            No employees match "{assignSearch}"
                          </p>
                        ) : (
                          <>
                            {/* Unassigned results */}
                            {unassignedResults.map(emp => (
                              <div key={emp.id}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-dark-bg border border-light-border dark:border-dark-border hover:border-light-accent dark:hover:border-dark-accent transition-all group">
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-light-text dark:text-dark-text">
                                    {emp.firstName} {emp.lastName}
                                  </span>
                                  <span className="ml-2 text-xs text-light-textSecondary dark:text-dark-textSecondary">
                                    #{emp.employeeId}
                                  </span>
                                  {emp.department && (
                                    <span className="ml-1 text-xs text-light-textSecondary dark:text-dark-textSecondary">
                                      · {emp.department.name}
                                    </span>
                                  )}
                                  {emp.shift && (
                                    <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">
                                      · {emp.shift.name}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleAssign(emp.id)}
                                  disabled={assigning}
                                  title="Assign to this shift"
                                  className="ml-2 flex-shrink-0 px-2 py-1 rounded text-xs text-white bg-green-500 hover:bg-green-600 transition-all disabled:opacity-30">
                                  + Add
                                </button>
                              </div>
                            ))}
                            {/* Already assigned results (when searching) */}
                            {assignSearch && assignedResults.map(emp => (
                              <div key={emp.id}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 opacity-70">
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-light-text dark:text-dark-text">
                                    {emp.firstName} {emp.lastName}
                                  </span>
                                  <span className="ml-2 text-xs text-light-textSecondary dark:text-dark-textSecondary">
                                    #{emp.employeeId}
                                  </span>
                                  <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-medium">
                                    ✓ Already in shift
                                  </span>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
              <h3 className="text-lg font-bold text-light-text dark:text-dark-text">
                {editingShift ? "Edit Shift" : "Add New Shift"}
              </h3>
              <button onClick={closeModal}
                className="p-1 rounded hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 text-light-textSecondary dark:text-dark-textSecondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                  <XCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                  Shift Name <span className="text-red-500">*</span>
                </label>
                <input name="name" value={form.name} onChange={handleFormChange}
                  placeholder="e.g. Morning Shift"
                  className={`w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent
                    ${formErrors.name ? "border-red-500" : "border-light-border dark:border-dark-border"}`} />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input type="time" name="startTime" value={form.startTime} onChange={handleFormChange}
                    className={`w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent
                      ${formErrors.startTime ? "border-red-500" : "border-light-border dark:border-dark-border"}`} />
                  {formErrors.startTime && <p className="text-red-500 text-xs mt-1">{formErrors.startTime}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input type="time" name="endTime" value={form.endTime} onChange={handleFormChange}
                    className={`w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent
                      ${formErrors.endTime ? "border-red-500" : "border-light-border dark:border-dark-border"}`} />
                  {formErrors.endTime && <p className="text-red-500 text-xs mt-1">{formErrors.endTime}</p>}
                </div>
              </div>

              {/* Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Late After (min)</label>
                  <input type="number" name="lateThreshold" value={form.lateThreshold} onChange={handleFormChange} min="0"
                    className="w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">OT After (min)</label>
                  <input type="number" name="overtimeThreshold" value={form.overtimeThreshold} onChange={handleFormChange} min="0"
                    className="w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent" />
                </div>
              </div>

              {/* Working days */}
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
                  Working Days <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                        ${form.workingDays.includes(i)
                          ? "text-white border-transparent" : "border-light-border dark:border-dark-border text-light-textSecondary dark:text-dark-textSecondary hover:border-light-accent dark:hover:border-dark-accent"
                        }`}
                      style={form.workingDays.includes(i) ? { backgroundColor: form.color } : {}}>
                      {d}
                    </button>
                  ))}
                </div>
                {formErrors.workingDays && <p className="text-red-500 text-xs mt-1">{formErrors.workingDays}</p>}
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                      className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${form.color === c ? "ring-2 ring-offset-2 ring-light-accent dark:ring-dark-accent scale-110" : ""}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows={2}
                  placeholder="Optional notes about this shift"
                  className="w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent resize-none" />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-light-border dark:border-dark-border">
              <button onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg text-sm font-medium hover:scale-105 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : editingShift ? "Save Changes" : "Create Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

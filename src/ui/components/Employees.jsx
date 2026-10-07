import React, { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Loader2, Save, X, AlertCircle } from "lucide-react";
import apiService from "../../services/api";

const EMPTY_FORM = {
  firstName: "", lastName: "", employeeId: "",
  departmentId: "", shiftId: "", position: "", phone: "", notes: "", isActive: true,
};

export default function Employees({ isAdmin = false }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [notification, setNotification] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  function showNotif(message, type = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }

  async function fetchAll() {
    setLoading(true);
    try {
      const [empRes, deptRes, shiftRes] = await Promise.all([
        apiService.getEmployees({ limit: 500 }),
        fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/departments`).then(r => r.json()).catch(() => ({ success: false })),
        apiService.getShifts(),
      ]);
      if (empRes.success) setEmployees(empRes.data);
      if (deptRes.success) setDepartments(deptRes.data || []);
      if (shiftRes.success) setShifts(shiftRes.data || []);
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setLoading(false);
    }
  }

  // ── Modal ────────────────────────────────────────────────────────────────────
  function openAdd() {
    setEditEmployee(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSaveError("");
    setShowModal(true);
  }

  function openEdit(emp) {
    setEditEmployee(emp);
    setForm({
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      employeeId: emp.employeeId || "",
      departmentId: emp.department?.id || emp.departmentId || "",
      shiftId: emp.shift?.id || emp.shiftId || "",
      position: emp.position || "",
      phone: emp.phone || "",
      notes: emp.notes || "",
      isActive: emp.isActive ?? true,
    });
    setFormErrors({});
    setSaveError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditEmployee(null);
    setSaveError("");
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setFormErrors(prev => ({ ...prev, [name]: "" }));
  }

  function validate() {
    const errors = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required";
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        employeeId: form.employeeId.trim() || undefined,
        departmentId: form.departmentId || undefined,
        shiftId: form.shiftId || undefined,
        position: form.position.trim() || undefined,
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      };

      if (editEmployee) {
        const res = await apiService.updateEmployee(editEmployee.id, payload);
        if (!res.success) throw new Error(res.message);
        showNotif(`${form.firstName} ${form.lastName} updated`);
      } else {
        const res = await apiService.createEmployee(payload);
        if (!res.success) throw new Error(res.message);
        showNotif(`${form.firstName} ${form.lastName} added`);
      }

      closeModal();
      fetchAll();
    } catch (err) {
      setSaveError(err.message || "Failed to save employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp) {
    if (!confirm(`Delete ${emp.firstName} ${emp.lastName}? This will deactivate them.`)) return;
    setDeleting(emp.id);
    try {
      await apiService.deleteEmployee(emp.id);
      showNotif(`${emp.firstName} ${emp.lastName} deactivated`);
      fetchAll();
    } catch (err) {
      showNotif(err.message || "Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  }

  async function toggleStatus(emp) {
    try {
      await apiService.updateEmployee(emp.id, { isActive: !emp.isActive });
      setEmployees(prev => prev.map(e =>
        e.id === emp.id ? { ...e, isActive: !emp.isActive } : e
      ));
    } catch (err) {
      showNotif("Failed to update status", "error");
    }
  }

  const filtered = employees.filter(emp =>
    (!search ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterDept || emp.department?.id === filterDept)
  );

  const inputCls = "w-full px-3 py-2 rounded-lg bg-light-accent/5 dark:bg-dark-accent/5 border border-light-border dark:border-dark-border text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent";
  const errCls = "border-red-500";

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Employees</h2>
        <div className="flex gap-2 flex-wrap">
          <input type="text" placeholder="Search name or ID..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent w-48 text-sm" />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent text-sm">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {isAdmin && (
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg shadow hover:scale-105 transition-all text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-light-accent/5 dark:bg-dark-accent/5">
            <tr>
              {["Employee ID", "Name", "Department", "Shift", "Position", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center">
                <div className="flex items-center justify-center gap-2 text-light-textSecondary dark:text-dark-textSecondary">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Loading...</span>
                </div>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-light-textSecondary dark:text-dark-textSecondary">
                No employees found
              </td></tr>
            ) : (
              filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-colors">
                  <td className="px-4 py-3 text-sm text-light-textSecondary dark:text-dark-textSecondary">{emp.employeeId}</td>
                  <td className="px-4 py-3 font-medium text-light-text dark:text-dark-text">
                    {emp.firstName} {emp.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-light-textSecondary dark:text-dark-textSecondary">
                    {emp.department?.name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-light-textSecondary dark:text-dark-textSecondary">
                    {emp.shift ? (
                      <span className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
                        style={{ backgroundColor: emp.shift.color || "#6366F1" }}>
                        {emp.shift.name}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-light-textSecondary dark:text-dark-textSecondary">
                    {emp.position || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <button onClick={() => toggleStatus(emp)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105
                          ${emp.isActive ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                        {emp.isActive ? <><CheckCircle className="w-3.5 h-3.5" /> Active</> : <><XCircle className="w-3.5 h-3.5" /> Inactive</>}
                      </button>
                    ) : (
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold w-fit
                        ${emp.isActive ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                        {emp.isActive ? <><CheckCircle className="w-3.5 h-3.5" /> Active</> : <><XCircle className="w-3.5 h-3.5" /> Inactive</>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(emp)}
                          className="flex items-center gap-1 px-3 py-1 bg-light-accent/10 dark:bg-dark-accent/10 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 text-light-text dark:text-dark-text rounded text-xs transition-all">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => handleDelete(emp)} disabled={deleting === emp.id}
                          className="flex items-center gap-1 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded text-xs transition-all disabled:opacity-50">
                          {deleting === emp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-light-border dark:border-dark-border">
              <h3 className="text-lg font-bold text-light-text dark:text-dark-text">
                {editEmployee ? "Edit Employee" : "Add Employee"}
              </h3>
              <button onClick={closeModal}
                className="p-1 rounded hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 text-light-textSecondary dark:text-dark-textSecondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5 space-y-4">
                {saveError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{saveError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input name="firstName" value={form.firstName} onChange={handleChange}
                      className={`${inputCls} ${formErrors.firstName ? errCls : ""}`} />
                    {formErrors.firstName && <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Last Name</label>
                    <input name="lastName" value={form.lastName} onChange={handleChange} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Employee ID</label>
                    <input name="employeeId" value={form.employeeId} onChange={handleChange}
                      placeholder="Leave blank to auto-generate"
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Position</label>
                    <input name="position" value={form.position} onChange={handleChange}
                      placeholder="e.g. Operator" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Department</label>
                    <select name="departmentId" value={form.departmentId} onChange={handleChange} className={inputCls}>
                      <option value="">No Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Shift</label>
                    <select name="shiftId" value={form.shiftId} onChange={handleChange} className={inputCls}>
                      <option value="">No Shift</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime?.slice(0,5)}–{s.endTime?.slice(0,5)})</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange}
                    placeholder="e.g. +251900000000" className={inputCls} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                    className={`${inputCls} resize-none`} />
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" name="isActive" id="isActive" checked={form.isActive} onChange={handleChange}
                    className="w-4 h-4 accent-light-accent dark:accent-dark-accent" />
                  <label htmlFor="isActive" className="text-sm text-light-text dark:text-dark-text">Active</label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-light-border dark:border-dark-border">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm text-light-textSecondary dark:text-dark-textSecondary hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg text-sm font-medium hover:scale-105 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : editEmployee ? "Save Changes" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

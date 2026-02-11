import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import apiService from "../../services/api";

const departments = ["Production", "Quality Control", "Maintenance", "Human Resources", "Finance", "IT"];

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [form, setForm] = useState({ name: "", empId: "", department: departments[0], status: "active" });

  // Fetch employees from API
  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setLoading(true);
      const response = await apiService.getEmployees();
      if (response.success && response.data) {
        const formattedEmployees = response.data.map(emp => ({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          empId: emp.employeeId,
          department: emp.department?.name || "N/A",
          status: emp.isActive ? "active" : "inactive",
          isActive: emp.isActive
        }));
        setEmployees(formattedEmployees);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEmployeeStatus(emp) {
    try {
      const newStatus = !emp.isActive;
      const response = await apiService.updateEmployee(emp.id, { isActive: newStatus });
      
      if (response.success) {
        // Update local state
        setEmployees(emps =>
          emps.map(e =>
            e.id === emp.id ? { ...e, status: newStatus ? "active" : "inactive", isActive: newStatus } : e
          )
        );
      } else {
        alert('Failed to update employee status');
      }
    } catch (error) {
      console.error("Failed to toggle employee status:", error);
      alert('Failed to update employee status');
    }
  }

  function openAddModal() {
    setEditEmployee(null);
    setForm({ name: "", empId: "", department: departments[0], status: "active" });
    setShowModal(true);
  }

  function openEditModal(emp) {
    setEditEmployee(emp);
    setForm({ name: emp.name, empId: emp.empId, department: emp.department, status: emp.status });
    setShowModal(true);
  }

  function handleDelete(id) {
    setEmployees(emps => emps.filter(e => e.id !== id));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (editEmployee) {
      setEmployees(emps =>
        emps.map(e =>
          e.id === editEmployee.id ? { ...e, ...form } : e
        )
      );
    } else {
      setEmployees(emps => [
        ...emps,
        { id: Date.now(), ...form },
      ]);
    }
    setShowModal(false);
  }

  const filtered = employees.filter(e =>
    (!search || e.name.toLowerCase().includes(search.toLowerCase())) &&
    (!filterDept || e.department === filterDept)
  );

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 mt-2">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Employees</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent transition-all duration-200 placeholder-light-textSecondary dark:placeholder-dark-textSecondary w-full md:w-56"
          />
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white dark:bg-dark-card text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent transition-all duration-200"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-light-accent/5 dark:bg-dark-accent/5">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Employee ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-light-textSecondary dark:text-dark-textSecondary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading employees...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-light-textSecondary dark:text-dark-textSecondary">
                  No employees found
                </td>
              </tr>
            ) : (
              filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-colors duration-200">
                  <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{emp.empId}</td>
                  <td className="px-4 py-3 font-medium text-light-text dark:text-dark-text">{emp.name}</td>
                  <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{emp.department}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleEmployeeStatus(emp)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full font-semibold text-xs transition-all hover:scale-105 ${
                        emp.status === "active"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                      }`}
                      title={`Click to ${emp.status === "active" ? "deactivate" : "activate"}`}
                    >
                      {emp.status === "active" ? (
                        <>
                          <CheckCircle className="w-4 h-4" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" /> Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(emp)}
                      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded shadow hover:scale-105 hover:shadow-lg transition-all text-xs"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded shadow hover:scale-105 hover:shadow-lg transition-all text-xs"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-8 border border-light-border dark:border-dark-border w-full max-w-sm animate-fade-in"
          >
            <h3 className="text-lg font-bold mb-4 text-light-text dark:text-dark-text">{editEmployee ? "Edit Employee" : "Add Employee"}</h3>
            <div className="mb-4">
              <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Employee ID</label>
              <input
                required
                value={form.empId}
                onChange={e => setForm(f => ({ ...f, empId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Department</label>
              <select
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              >
                {departments.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm mb-1 text-light-text dark:text-dark-text">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                {editEmployee ? "Save" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 
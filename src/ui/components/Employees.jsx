import React, { useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";

const initialEmployees = [
  { id: 1, name: "Abel Mekonnen", empId: "EMP102", department: "HR", status: "active" },
  { id: 2, name: "Sara Bekele", empId: "EMP103", department: "Production", status: "inactive" },
  { id: 3, name: "Samuel Gashaw", empId: "EMP104", department: "IT", status: "active" },
];

const departments = ["HR", "Production", "IT", "Finance", "Logistics"];

export default function Employees() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [form, setForm] = useState({ name: "", empId: "", department: departments[0], status: "active" });

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
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-purple-600 text-white rounded-lg font-medium shadow hover:scale-105 hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-light-accent/5 dark:bg-dark-accent/5">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Employee ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Department</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => (
              <tr key={emp.id} className="hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition-colors duration-200">
                <td className="px-4 py-3 font-medium text-light-text dark:text-dark-text">{emp.name}</td>
                <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{emp.empId}</td>
                <td className="px-4 py-3 text-light-textSecondary dark:text-dark-textSecondary">{emp.department}</td>
                <td className="px-4 py-3">
                  {emp.status === "active" ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                      <CheckCircle className="w-4 h-4" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 dark:text-red-400 font-semibold">
                      <XCircle className="w-4 h-4" /> Inactive
                    </span>
                  )}
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
            ))}
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
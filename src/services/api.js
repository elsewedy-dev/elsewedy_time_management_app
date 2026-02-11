// API service for connecting React frontend to backend
const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authentication token if available
    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication endpoints
  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // Employee endpoints
  async getEmployees(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/employees?${queryString}` : '/employees';
    return await this.request(endpoint);
  }

  async getEmployee(id) {
    return await this.request(`/employees/${id}`);
  }

  async createEmployee(employeeData) {
    return await this.request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    });
  }

  async updateEmployee(id, employeeData) {
    return await this.request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    });
  }

  async deleteEmployee(id) {
    return await this.request(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  async fixEmployeeIds() {
    return await this.request('/employees/fix-employee-ids', {
      method: 'POST',
    });
  }

  async clearITDepartments() {
    return await this.request('/employees/clear-it-departments', {
      method: 'POST',
    });
  }

  // Attendance endpoints
  async getAttendance(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/attendance?${queryString}` : '/attendance';
    return await this.request(endpoint);
  }

  async getAttendanceSummary(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/attendance/summary?${queryString}` : '/attendance/summary';
    return await this.request(endpoint);
  }

  async getTodayAttendance() {
    return await this.request('/attendance/today');
  }

  async getEmployeeAttendance(employeeId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString 
      ? `/attendance/employee/${employeeId}?${queryString}` 
      : `/attendance/employee/${employeeId}`;
    return await this.request(endpoint);
  }

  async createManualAttendance(attendanceData) {
    return await this.request('/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    });
  }

  async updateAttendance(id, attendanceData) {
    return await this.request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(attendanceData),
    });
  }

  async resetTodayAttendance() {
    return await this.request('/attendance/reset-today', {
      method: 'POST',
    });
  }

  // Device endpoints
  async getDevices(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/devices?${queryString}` : '/devices';
    return await this.request(endpoint);
  }

  async getDevice(id) {
    return await this.request(`/devices/${id}`);
  }

  async createDevice(deviceData) {
    return await this.request('/devices', {
      method: 'POST',
      body: JSON.stringify(deviceData),
    });
  }

  async updateDevice(id, deviceData) {
    return await this.request(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(deviceData),
    });
  }

  async testDeviceConnection(id) {
    return await this.request(`/devices/${id}/test`, {
      method: 'POST',
    });
  }

  async syncDevice(id) {
    return await this.request(`/devices/${id}/sync`, {
      method: 'POST',
    });
  }

  async syncAllDevices() {
    // Get all devices and sync them
    const devicesResponse = await this.getDevices();
    if (devicesResponse.success && devicesResponse.data) {
      const syncPromises = devicesResponse.data.map(device => 
        this.syncDevice(device.id).catch(err => ({ error: err.message, deviceId: device.id }))
      );
      return await Promise.all(syncPromises);
    }
    throw new Error('Failed to get devices');
  }

  async getDeviceStats() {
    return await this.request('/devices/stats/overview');
  }

  async getDeviceTime() {
    return await this.request('/devices/time');
  }

  // Report endpoints
  async getDailyReport(date, departmentId, format = 'json') {
    const params = new URLSearchParams({ date, format });
    if (departmentId) params.append('departmentId', departmentId);
    return await this.request(`/reports/daily?${params}`);
  }

  async getWeeklyReport(startDate, endDate, departmentId, format = 'json') {
    const params = new URLSearchParams({ startDate, endDate, format });
    if (departmentId) params.append('departmentId', departmentId);
    return await this.request(`/reports/weekly?${params}`);
  }

  async getMonthlyReport(year, month, departmentId, format = 'json') {
    const params = new URLSearchParams({ year, month, format });
    if (departmentId) params.append('departmentId', departmentId);
    return await this.request(`/reports/monthly?${params}`);
  }

  async getEmployeeReport(employeeId, startDate, endDate, format = 'json') {
    const params = new URLSearchParams({ startDate, endDate, format });
    return await this.request(`/reports/employee/${employeeId}?${params}`);
  }

  // Overtime endpoints
  async getOvertime(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/overtime?${queryString}` : '/overtime';
    return await this.request(endpoint);
  }

  async createOvertime(overtimeData) {
    return await this.request('/overtime', {
      method: 'POST',
      body: JSON.stringify(overtimeData),
    });
  }

  async approveOvertime(id, notes = '') {
    return await this.request(`/overtime/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedNotes: notes }),
    });
  }

  async rejectOvertime(id, notes = '') {
    return await this.request(`/overtime/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ approvedNotes: notes }),
    });
  }

  // Health check
  async healthCheck() {
    return await fetch('http://localhost:3001/health').then(res => res.json());
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

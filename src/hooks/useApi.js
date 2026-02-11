import { useState, useEffect } from 'react';
import apiService from '../services/api';

// Custom hook for API calls with loading and error states
export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (apiCall) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
};

// Hook for fetching data with automatic loading states
export const useApiData = (apiCall, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err.message);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch };
};

// Hook for attendance data
export const useAttendance = (params = {}) => {
  return useApiData(
    () => apiService.getAttendance(params),
    [JSON.stringify(params)]
  );
};

// Hook for today's attendance
export const useTodayAttendance = () => {
  return useApiData(() => apiService.getTodayAttendance());
};

// Hook for employees
export const useEmployees = (params = {}) => {
  return useApiData(
    () => apiService.getEmployees(params),
    [JSON.stringify(params)]
  );
};

// Hook for devices
export const useDevices = (params = {}) => {
  return useApiData(
    () => apiService.getDevices(params),
    [JSON.stringify(params)]
  );
};

// Hook for device stats
export const useDeviceStats = () => {
  return useApiData(() => apiService.getDeviceStats());
};

// Hook for authentication
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    if (token) {
      // In a real app, you'd validate the token with the backend
      setUser({ username: 'admin', role: 'admin' });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiService.login(username, password);
      if (response.success) {
        setUser(response.data.user);
        return response;
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } finally {
      setUser(null);
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };
};

export default apiService;

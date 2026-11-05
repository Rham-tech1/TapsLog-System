/**
 * Axios instance — dynamically configured for TapsLog backend
 * Automatically adapts between desktop ('localhost') and mobile Wi-Fi ('192.168.x.x')
 */
import axios from 'axios';

// Dynamically match host IP (works on both PC 'localhost' and Mobile Wi-Fi '192.168.x.x')
const getBaseURL = () => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:5000/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token if present
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tapslog_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — normalize errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Attach a friendly error code for UI consumption
    if (status === 403) {
      error.errorCode = 'ERROR_403';
      error.friendlyMessage = `Section Mismatch: ${message}`;
    } else if (status === 409) {
      error.errorCode = 'ERROR_409';
      error.friendlyMessage = `Duplicate Tap: ${message}`;
    } else if (status === 401) {
      error.errorCode = 'ERROR_401';
      error.friendlyMessage = 'Unauthorized. Please log in again.';
    } else {
      error.errorCode = 'ERROR_UNKNOWN';
      error.friendlyMessage = message || 'An unexpected error occurred.';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

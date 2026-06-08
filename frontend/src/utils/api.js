import axios from 'axios';

// Resolve the API base URL dynamically
const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return ''; // Use empty string so Vite's dev proxy handles routing
    }
  }
  
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  
  console.warn('[Yatra X] VITE_API_URL is not set. Falling back to https://api.yatrax.in');
  return 'https://api.yatrax.in';
};

export const API_BASE = getApiBase();

export const apiFetch = (path, options = {}) => 
  fetch(`${API_BASE}${path}`, { 
    ...options, 
    headers: { 'Content-Type': 'application/json', ...options.headers } 
  });

// Centralized Axios instance for Spring Boot backend (backward compatibility)
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically append the Bearer JWT token if it exists in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('yatra_x_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

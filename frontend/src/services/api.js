import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost') && !import.meta.env.VITE_API_URL.includes('127.0.0.1')) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173' || window.location.port === '3000') {
      return `${window.location.protocol}//${window.location.hostname}:5000/api`;
    }
    return '/api';
  }
  return 'http://127.0.0.1:5000/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420'
  }
});

// Request Interceptor: Attach JWT token & ngrok bypass headers if present
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('codearena_token') || localStorage.getItem('codearena_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['ngrok-skip-browser-warning'] = '69420';
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

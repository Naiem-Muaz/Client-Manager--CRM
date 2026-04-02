import axios from 'axios';

const NEXTGEN_URL = import.meta.env.VITE_NEXTGEN_API_URL || 'http://localhost:4000/api';

export const NextGenAPI = axios.create({
  baseURL: NEXTGEN_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    NextGenAPI.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('lumina_token', token);
  } else {
    delete NextGenAPI.defaults.headers.common['Authorization'];
    localStorage.removeItem('lumina_token');
  }
};

// Request Interceptor: Auto-inject token
NextGenAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lumina_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized
NextGenAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      setAuthToken(null);
      // Let the AuthContext trigger redirect by listening to token absence
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    return Promise.reject(error.response?.data || error);
  }
);

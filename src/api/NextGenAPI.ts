import axios from 'axios';

// Hardcoded prod fallback prevents a blank API base if VITE_NEXTGEN_API_URL is missing on Vercel.
const NEXTGEN_URL = import.meta.env.VITE_NEXTGEN_API_URL || 'https://lumina-tax-monorepo-production.up.railway.app/api';

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
    // Carry the STATUS through. The rejection used to be the response body alone,
    // so every caller could see WHAT went wrong and never WHETHER it was a refusal
    // (403) or a fault (5xx/network). Team Attendance paid for that: a 403 arrived
    // as an empty list and the screen said "Nobody is currently clocked in."
    // Additive — an extra key on an object callers already receive.
    const body = error.response?.data;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return Promise.reject(Object.assign({}, body, { status: error.response?.status }));
    }
    return Promise.reject(body ?? error);
  }
);

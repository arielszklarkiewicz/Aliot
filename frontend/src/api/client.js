import axios from 'axios';

// Use explicit backend base URL by default for development.
// Can be overridden with REACT_APP_API_BASE_URL if needed.
// In production, REACT_APP_API_BASE_URL MUST be set to avoid localhost
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5047',
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;

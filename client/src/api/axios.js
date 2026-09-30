import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    const responseData = error.response?.data;
    const message = responseData?.message
      || responseData?.errors?.[0]?.message
      || error.message
      || 'Request failed';
    return Promise.reject(new Error(message));
  },
);

export default api;

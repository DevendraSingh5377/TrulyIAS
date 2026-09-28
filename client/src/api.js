import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://trulyias-cmtt.onrender.com/api",
  withCredentials: true, // MANDATORY for cross-origin authentication
});

// Automatically append Bearer token to all requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("trulyias_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
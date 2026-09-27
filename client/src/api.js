import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const tempToken = sessionStorage.getItem("trulyias_temp_token");
  if (tempToken) {
    config.headers["x-temp-token"] = tempToken;
  }
  return config;
});

export default api;
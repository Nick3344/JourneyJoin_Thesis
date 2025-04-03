import axios from "axios";
import { ACCESS_TOKEN } from "./constants";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:5000",
});

/*api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    //const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      //config.headers.Authorization = `Bearer ${localStorage.getItem("access_token")}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);*/
api.interceptors.request.use(
  (config) => {
    // Try to get the token from either key
    const token = localStorage.getItem("access_token") || localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);



export default api;

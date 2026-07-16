import axios from "axios";

// 🚀 En producción (Render) usa REACT_APP_API_URL desde las variables de entorno.
// En desarrollo local, si no existe esa variable, cae al 127.0.0.1:4000 como antes.
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://127.0.0.1:4000",
});

// 🔑 Interceptor: Busca el token en localStorage y lo adjunta en cada petición
API.interceptors.request.use(
  (config) => {
    const token = window.localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;
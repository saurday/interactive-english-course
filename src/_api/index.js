import axios from "axios";


const BASE =
   (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api")
     .replace(/\/+$/, "");

 export const API = axios.create({
   baseURL: BASE,
   headers: { Accept: "application/json" },
 });

// (opsional) interceptor untuk inject token otomatis:
API.interceptors.request.use((config) => {
   let token =
     localStorage.getItem("accessToken") ||
     localStorage.getItem("token");
   if (!token) {
     try {
       const ui = JSON.parse(localStorage.getItem("userInfo") || "{}");
       token = ui?.token;
     } catch {
        // ignore
     }
   }
   if (token) config.headers.Authorization = `Bearer ${token}`;
   else delete config.headers.Authorization;
   return config;
 });


// untuk akses file (misalnya pdf, gambar, dll)
export const storageURL = BASE.replace(/\/api$/, "") + "/storage";

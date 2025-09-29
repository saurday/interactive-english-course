import axios from "axios";

const url = "https://laravel-interactive-english-course-production.up.railway.app"; // alamat backend Laravel kamu

export const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "https://laravel-interactive-english-course-production.up.railway.app",
});

// (opsional) interceptor untuk inject token otomatis:
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// untuk akses file (misalnya pdf, gambar, dll)
export const storageURL = `${url}/storage`;

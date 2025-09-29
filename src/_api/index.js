// src/lib/api.ts (contoh)
import axios from "axios";

// Ambil dari ENV Netlify; fallback ke Railway
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "https://laravel-interactive-english-course-production.up.railway.app")
  .replace(/\/+$/, ""); // hapus trailing slash kalau ada

export const API = axios.create({
  baseURL: `${API_BASE}/api`,      // <— semua endpoint tinggal '/login', '/register', dst.
  // withCredentials: true,        // <-- HANYA aktifkan jika pakai Sanctum/cookie
  headers: { Accept: "application/json" },
  timeout: 15000,
});

// Inject Bearer token dari localStorage (sesuai kode kamu)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// (opsional) Normalisasi error Laravel
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 422 && err.response.data?.errors) {
      err.validation = err.response.data.errors;
    }
    // if (err.response?.status === 401) { /* handle logout/redirect */ }
    return Promise.reject(err);
  }
);

// Helper untuk file public/storage (bukan /api)
export const storageURL = (path = "") =>
  `${API_BASE}/storage/${String(path).replace(/^\/+/, "")}`;

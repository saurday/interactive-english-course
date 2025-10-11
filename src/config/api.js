// src/config/api.js  (JS biasa, bukan TS)
export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.__APP_CONFIG__?.API_BASE_URL) ||
  "http://localhost:8000"; // fallback dev

export const authHeaders = () => {
  const token =
    localStorage.getItem("token") || localStorage.getItem("accessToken") || "";
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Helper fetch yang rapi
export async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders(),
    },
  });

  // Baca aman sebagai JSON / text
  const text = await res.text();
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson && text ? JSON.parse(text) : text;

  if (!res.ok) {
    const msg = isJson ? (data?.message || JSON.stringify(data).slice(0,200)) : text.slice(0,200);
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${msg}`);
  }
  return data;
}

// src/_services/auth.js
import { API } from "@/_api";
// src/_services/auth.js
const BASE = import.meta.env.VITE_API_BASE_URL; // tanpa trailing slash

export async function login(email, password) {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let msg = 'Login failed';
    try {
      const j = await res.json();
      msg =
        j.message ||
        (j.errors && Object.values(j.errors)[0]?.[0]) ||
        msg;
    } catch {
      msg = (await res.text()) || msg;
    }
    throw new Error(msg);
  }
  return res.json(); // { access_token, user, ... }
}


export const register = async (payload) => {
  const { data } = await API.post("/register", payload);
  return data;
};

export const me = async () => {
  const { data } = await API.get("/user"); // ganti ke '/me' kalau backend-mu pakai itu
  return data;
};


/**
 * Karena Sanctum token BUKAN JWT (opaque string),
 * kita tidak bisa decode/cek expiry via react-jwt.
 * Gantikan helper ini supaya tidak memakai react-jwt.
 */
export const useDecodeToken = (token) => {
  if (!token) {
    return {
      success: false,
      message: "No token found",
      data: null,
    };
  }
  // Tidak bisa decode token Sanctum — anggap valid selama ada.
  return {
    success: true,
    message: "Sanctum opaque token; cannot decode payload",
    data: null,
  };
};

/**
 * Logout: cukup kirim Authorization header.
 * Tidak perlu kirim body { token }.
 */
export const logout = async () => {
  const { data } = await API.post("/logout", {}); // interceptor inject Bearer

  // bersihkan storage
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("userInfo");
  localStorage.removeItem("role");

  return data;
};

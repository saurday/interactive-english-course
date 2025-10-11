// src/_services/auth.js
import { API } from "../_api";

/**
 * Login ke backend.
 * Backend (AuthController) mengembalikan:
 * { success, message, access_token, token_type, user }
 */
export const login = async (email, password) => {
  const { data } = await API.post("/login", { email, password });
  // Kamu simpan ke localStorage di komponen (Login.jsx),
  // jadi di sini cukup kembalikan data apa adanya:
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
  const accessToken =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  const { data } = await API.post(
    "/logout",
    {}, // body kosong
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // bersihkan storage
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("userInfo");
  localStorage.removeItem("role");

  return data;
};

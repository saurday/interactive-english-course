// src/_services/auth.js
import { API } from "../_api";

/**
 * Login ke backend Laravel
 */
export const login = async (email, password) => {
  const { data } = await API.post("/login", { email, password });
  return data;
};

/**
 * Karena Sanctum token adalah opaque string,
 * tidak bisa di-decode seperti JWT.
 */
export const useDecodeToken = (token) => {
  if (!token) {
    return {
      success: false,
      message: "No token found",
      data: null,
    };
  }
  return {
    success: true,
    message: "Sanctum opaque token; cannot decode payload",
    data: null,
  };
};

/**
 * Logout user.
 */
export const logout = async () => {
  const accessToken =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  const { data } = await API.post(
    "/logout",
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // bersihkan storage
  ["accessToken", "token", "userInfo", "role"].forEach((k) =>
    localStorage.removeItem(k)
  );

  return data;
};

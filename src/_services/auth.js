// src/_services/auth.js
import { get, post } from "@/config/api"; // <-- satu pintu

// LOGIN
export const login = (email, password) =>
  post("login", { email, password }); // <-- tanpa '/api' & tanpa leading slash

// REGISTER
export const register = (payload) => post("register", payload);

// ME (ambil ulang profil jika perlu)
export const me = async () => {
  const id = JSON.parse(localStorage.getItem("userInfo") || "{}")?.id;
  if (!id) throw new Error("No user id");
  return get(`users/${id}`); // backend-mu pakai /api/users/{id}
};

// LOGOUT
export const logout = async () => {
  await post("logout", {}); // Authorization header di-inject oleh interceptor
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("userInfo");
  localStorage.removeItem("role");
};

// Token Sanctum itu opaque; anggap valid selama ada.
export const useDecodeToken = (token) => ({
  success: !!token,
  message: token ? "Sanctum opaque token" : "No token found",
  data: null,
});


// utils/auth.js
export const getToken = () => localStorage.getItem("accessToken");
export const getUser  = () => {
  try { return JSON.parse(localStorage.getItem("userInfo") || "{}"); }
  catch { return {}; }
};
export const getRole  = () => localStorage.getItem("role"); // "admin" | "dosen" | "mahasiswa"
export const isAuthed = () => !!getToken();

// ➕ Tambahan: standardisasi rute berdasarkan role
export const routeByRole = (role) => {
  switch (role) {
    case "admin":      return "/admin";
    case "dosen":      return "/lecture";
    case "mahasiswa":  return "/student"; // <— match dengan App.jsx
    default:           return "/";
  }
};

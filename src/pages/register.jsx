// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(null);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validasi sederhana
    if (!formData.fullName || !formData.email || !formData.password) {
      setErrorMsg("Semua field wajib diisi.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrorMsg("Format email tidak valid.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Password dan konfirmasi tidak cocok.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await axios.post("http://127.0.0.1:8000/api/register", {
        name: formData.fullName,   // map ke 'name' backend
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        role: "mahasiswa",
      });

      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      // Ambil pesan dari backend jika ada
      const apiErr =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.email ||
        err?.response?.data?.errors?.name ||
        err?.response?.data?.errors?.password;
      setErrorMsg(
        Array.isArray(apiErr) ? apiErr.join(", ") : apiErr || "Registrtion failed!"
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((s) => !s);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword((s) => !s);

  return (
    <div className="min-h-screen flex flex-col bg-white">


      {/* PAGE CONTENT */}
      <main style={styles.container}>
        <div style={styles.card}>
          {/* Header */}
          <div style={styles.header}>
            <h1 className="font-inter-bold text-2xl" style={styles.title}>Welcome!</h1>
            <p className="font-inter-regular text-sm" style={styles.subtitle}>
              Create your account and start improving your English
            </p>
          </div>

          {/* Error message */}
          {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

          {/* Register Form */}
          <form onSubmit={handleRegister} style={styles.form} noValidate>
            {/* Full Name */}
            <div className="font-poppins-semibold text-sm" style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <span style={styles.icon} aria-hidden>
                  👤
                </span>
                <input className="font-poppins-regular text-sm"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div style={styles.inputGroup}>
              <label className="font-poppins-semibold text-sm" style={styles.label}>Email address</label>
              <div style={styles.inputWrapper}>
                <span style={styles.icon} aria-hidden>
                  📧
                </span>
                <input className="font-poppins-regular text-sm"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.inputGroup}>
              <label  className="font-poppins-semibold text-sm" style={styles.label}>Create Password</label>
              <div style={styles.inputWrapper}>
                <span style={styles.icon} aria-hidden>
                  🔒
                </span>
                <input className="font-poppins-regular text-sm"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  style={styles.input}
                  required
                />
                <button 
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={styles.eyeButton}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={styles.inputGroup}>
              <label className="font-poppins-semibold text-sm" style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrapper}>
                <span style={styles.icon} aria-hidden>
                  🔒
                </span>
                <input className="font-poppins-regular text-sm"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Re-enter your password"
                  style={styles.input}
                  required
                />
                <button 
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  style={styles.eyeButton}
                  aria-label={
                    showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button className="btn-inter-bold"
              type="submit"
              style={{
                ...styles.registerButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              disabled={loading}
            >
              {loading ? "Loading..." : "Register"}
            </button>

            {/* Link Login */}
            <div style={styles.loginSection}>
              <span className="font-poppins-small text-xs" style={styles.loginText}>Already have an account? </span>
              <Link to="/login" className="font-poppins-small" style={styles.loginLink}>
                Login
              </Link>
            </div>
          </form>
        </div>
      </main>


    </div>
  );
}

/* ========== Inline styles untuk tampilan sesuai mockup ========== */
const styles = {
  container: {
    minHeight: "calc(100vh - 200px)",
    backgroundColor: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
    padding: "40px",
    width: "100%",
    maxWidth: "450px",
    border: "1px solid rgba(0,0,0,0.06)",
  },
  header: { textAlign: "center", marginBottom: "28px" },
  title: { fontSize: "28px", fontWeight: 800, color: "#1f2937", margin: "0 0 12px" },
  subtitle: { fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: 1.5 },
  errorBox: {
    background: "#FEF2F2",
    color: "#991B1B",
    border: "1px solid #FCA5A5",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    marginBottom: 16,
  },
  form: { width: "100%" },
  inputGroup: { marginBottom: "18px" },
  label: { display: "block", fontSize: "14px", fontWeight: 700, color: "#374151", marginBottom: 8 },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    backgroundColor: "#f9fafb",
  },
  icon: { padding: "12px", fontSize: "16px", color: "#8b5cf6" },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "12px 8px",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "#374151",
  },
  eyeButton: {
    background: "none",
    border: "none",
    padding: "12px",
    cursor: "pointer",
    fontSize: "16px",
    color: "#6b7280",
  },
  registerButton: {
    width: "100%",
    backgroundColor: "#8b5cf6",
    color: "white",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "16px",
    fontWeight: 700,
    marginTop: "6px",
    marginBottom: "16px",
    boxShadow: "0 6px 18px rgba(139, 92, 246, 0.35)",
    transition: "background-color 0.3s ease",
  },
  loginSection: { textAlign: "center" },
  loginText: { fontSize: "14px", color: "#6b7280" },
  loginLink: { fontSize: "14px", color: "#8b5cf6", textDecoration: "none", fontWeight: 600 },
};

// src/pages/Login.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login, useDecodeToken } from "../_services/auth";
import { routeByRole } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();

  // state form + UI
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // state proses
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // cek token existing
  const token = localStorage.getItem("accessToken");
  const decodedData = useDecodeToken(token);

  const togglePasswordVisibility = () => setShowPassword((s) => !s);

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await login(email, password);
      const token = response.access_token;

      localStorage.setItem("accessToken", token);
      localStorage.setItem("token", token);
      localStorage.setItem("userInfo", JSON.stringify(response.user));
      localStorage.setItem("role", response.user.role);
      // 👉 arahkan konsisten pakai helper
      navigate(routeByRole(response.user.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Jika sudah login & buka /login, langsung arahkan ke dashboard sesuai role
    if (token && decodedData && decodedData.success) {
      const storedRole =
        localStorage.getItem("role") ||
        (JSON.parse(localStorage.getItem("userInfo") || "{}")?.role ?? null);
      navigate(routeByRole(storedRole), { replace: true });
    }
  }, [token, decodedData, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* MAIN */}
      <main style={styles.pageBg}>
        <div style={styles.container}>
          <div style={styles.card}>
            {/* Header */}
            <div style={styles.header}>
              <h1 className="text-2xl font-inter-bold" style={styles.title}>
                Welcome!
              </h1>
              <p className="text-sm font-inter-regular" style={styles.subtitle}>
                Log in and continue your learning journey seamlessly
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Email */}
              <div style={styles.inputGroup}>
                <label
                  className="text-sm font-poppins-semibold"
                  style={styles.label}
                  htmlFor="email"
                >
                  Email address
                </label>
                <div style={styles.inputWrapper}>
                  <span style={styles.leftIcon} aria-hidden>
                    📧
                  </span>
                  <input
                    className="text-sm font-poppins-regular"
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div style={styles.inputGroup}>
                <label
                  className="text-sm font-poppins-semibold"
                  htmlFor="password"
                  style={styles.label}
                >
                  Password
                </label>
                <div style={styles.inputWrapper}>
                  <span style={styles.leftIcon} aria-hidden>
                    🔒
                  </span>
                  <input
                    className="text-sm font-poppins-regular"
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <button
                    className="btn-inter-bold"
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    style={styles.eyeButton}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              {/* Forgot */}
              {/* <div style={styles.forgotPassword}>
                <a
                  className="text-sm font-inter-regular"
                  href="#"
                  style={styles.forgotLink}
                >
                  Forgot password?
                </a>
              </div> */}

              {/* Submit */}
              <button
                type="submit"
                style={{
                  ...styles.loginButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </button>

              {/* Register */}
              <div style={styles.registerSection}>
                <span
                  className="text-xs font-poppins-small"
                  style={styles.registerText}
                >
                  Don’t have an account yet?{" "}
                </span>
                <Link
                  to="/register"
                  className="font-poppins-small"
                  style={styles.registerLink}
                >
                  Register
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ===== Inline Styles untuk tampilan sesuai mockup ===== */
const styles = {
  pageBg: {
    // garis tipis di atas footer akan terlihat saat scroll, jadi biarkan putih bersih di area form
    background:
      "linear-gradient(to bottom, #ffffff 0%, #ffffff 70%, #ffffff 70%)",
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: "960px",
    padding: "40px 16px 64px",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "32px 28px",
    boxShadow:
      "0 25px 50px -12px rgba(0,0,0,0.12), 0 10px 15px -3px rgba(0,0,0,0.08)",
    border: "1px solid rgba(0,0,0,0.06)",
  },
  header: { textAlign: "left", marginBottom: 24 },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
  },
  subtitle: {
    margin: "8px 0 0",
    fontSize: 14,
    color: "#6b7280",
  },
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
  inputGroup: { marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 8,
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
  },
  leftIcon: {
    padding: "12px",
    fontSize: 16,
    color: "#8b5cf6",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "12px 8px",
    fontSize: 14,
    backgroundColor: "transparent",
    color: "#111827",
  },
  eyeButton: {
    background: "none",
    border: "none",
    padding: "12px",
    cursor: "pointer",
    fontSize: 16,
    color: "#6b7280",
  },
  forgotPassword: { textAlign: "left", margin: "6px 0 20px" },
  forgotLink: { fontSize: 13, color: "#8b5cf6", textDecoration: "none" },
  loginButton: {
    width: "100%",
    backgroundColor: "#8b5cf6",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 14,
    boxShadow: "0 6px 18px rgba(139, 92, 246, 0.35)",
    transition: "background-color .2s ease",
  },
  registerSection: { textAlign: "center" },
  registerText: { fontSize: 14, color: "#6b7280" },
  registerLink: {
    fontSize: 14,
    color: "#8b5cf6",
    textDecoration: "none",
    fontWeight: 600,
  },
};

// src/pages/mahasiswa/Settings.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  Settings as IconSettings,
  LogOut,
  Menu,
  BookOpenText,
} from "lucide-react";
import { get, put, ApiError } from "@/config/api"; // ✅ pakai wrapper api

const getMe = () => {
  try {
    const u = JSON.parse(localStorage.getItem("userInfo") || "{}");
    return u?.id ?? null;
  } catch {
    return null;
  }
};

export default function StudentSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const userId = getMe();

  useEffect(() => {
    (async () => {
      if (!userId) {
        navigate("/login");
        return;
      }
      setErr("");
      setLoading(true);
      try {
        // ✅ GET /users/:id (wrapper sudah handle baseURL + /api + Bearer)
        const j = await get(`/users/${userId}`);
        setName(j.name || "");
        setEmail(j.email || "");
      } catch (e) {
        setErr(
          e instanceof ApiError
            ? `Failed to load profile (${e.status})`
            : e?.message || "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const payload = { name, email };
      if (password || currentPassword) {
        payload.current_password = currentPassword;
        payload.password = password;
        payload.password_confirmation = passwordConfirmation;
      }

      // ✅ PUT /users/:id
      const updated = await put(`/users/${userId}`, payload);

      // simpan user terbaru ke localStorage
      try {
        const prev = JSON.parse(localStorage.getItem("userInfo") || "{}");
        localStorage.setItem("userInfo", JSON.stringify({ ...prev, ...updated }));
      } catch {
        /* ignore */
      }

      // reset field password
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
      alert("Profile updated");
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message || `Failed to update profile (${e.status})`
          : e?.message || "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <>
      <style>{`
:root{
  --primary:#7c3aed; --ink:#111827; --muted:#64748b; --bg:#f8f7ff; --sbw:240px;
}
*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0; font-family:'Inter','Poppins',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:var(--ink)}
.layout{display:flex; min-height:100vh; background:
  radial-gradient(1200px 400px at 80% -100px, rgba(124,58,237,.06), transparent 60%),
  var(--bg)}
/* ====== Sidebar ====== */
.sidebar {
  width: var(--sbw);
  background:#fff;
  border-right:1px solid #e2e8f0;
  padding:16px;
  position:sticky;
  top:0;
  height:100vh;
}

.sidebar h3 { font-weight:800; margin:0 0 12px; }

.menu-item{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-radius:10px;
  color:#475569;
  font-weight:600;
  text-decoration:none;
  margin-bottom:6px;
  font-size:14px;
  cursor:pointer;
  transition: background .15s ease, color .15s ease;
  user-select:none;
}

.menu-item:hover,
.menu-item.active{
  background:#f3f0ff;
  color:var(--primary);
}

button.menu-item{
  background:transparent;
  border:0;
  width:100%;
  text-align:left;
}
.content{flex:1; padding:24px; max-width:900px; width:100%; margin:0 auto}
.hamburger{display:none; border:1px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px}
.card{background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px}
.page-title{font-size:20px; font-weight:800; margin:0 0 12px}
.label{font-weight:700; margin-bottom:6px; display:block}
.input{width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit}
.input:focus{outline:none; border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15)}
.row{display:grid; grid-template-columns:1fr 1fr; gap:12px}
.btn{display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; font-weight:700; cursor:pointer}
.btn-primary{background:#6b46c1; color:#fff; border-color:#6b46c1}
.btn-primary:hover{background:#553c9a}
.error{color:#dc2626; margin-bottom:10px}
@media (max-width:640px){
  .sidebar{position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease; z-index: 50;}
  .sidebar.open{transform:translateX(0)}
  .hamburger{display:inline-flex}
  .content{padding:10px 12px 90px}
  .row{grid-template-columns:1fr}
}
      `}</style>

      <div className="layout">
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>LEXENT</h3>
          <Link
            to="/student"
            className="menu-item"
            onClick={() => setIsSidebarOpen(false)}
          >
            <Home size={18} /> Dashboard
          </Link>
          <Link
            to="/student/cefr"
            className="menu-item"
            onClick={() => setIsSidebarOpen(false)}
          >
            <BookOpenText size={18} /> CEFR Modules
          </Link>
          <Link
            to="/student/settings"
            className="menu-item"
            onClick={() => setIsSidebarOpen(false)}
          >
            <IconSettings size={18} /> Settings
          </Link>
          <button className="menu-item" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </aside>

        {/* Content */}
        <main className="content">
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <button
              className="hamburger"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <h1 className="page-title">Profile Settings</h1>
          </div>

          <div className="card">
            {err && <div className="error">{err}</div>}

            {loading ? (
              <div>Loading…</div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="row">
                  <div>
                    <label className="label">Name</label>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{ marginTop: 16, color: "#64748b", fontWeight: 700 }}
                >
                  Change Password (optional)
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <div>
                    <label className="label">Current password</label>
                    <input
                      className="input"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">New password</label>
                    <input
                      className="input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Confirm new password</label>
                    <input
                      className="input"
                      type="password"
                      value={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

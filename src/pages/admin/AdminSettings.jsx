// src/pages/admin/AdminSettings.jsx
import React, { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  User,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  XCircle,
  BookOpen,
} from "lucide-react";

/* ====== API client (named imports) ====== */
import { get, put } from "@/config/api";

/* ====== Helpers ====== */
const getUserId = () => {
  try {
    const u = JSON.parse(localStorage.getItem("userInfo") || "{}");
    return u?.id ?? null;
  } catch {
    return null;
  }
};

/* ====== Page ====== */
export default function AdminSettings() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showNew2, setShowNew2] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // {type:'success'|'error', text:string}

  const userId = getUserId();

  const sidebar = [
    { label: "Dashboard", icon: <LayoutDashboard size={18} />, to: "/admin" },
    { label: "Manage Users", icon: <Users size={18} />, to: "/admin/users" },
    {
      label: "User Progress",
      icon: <BarChart2 size={18} />,
      to: "/admin/progress",
    },
    {
      label: "CEFR Modules",
      to: "/admin/cefrmodules",
      icon: <BookOpen size={18} />,
    },
    {
      label: "Settings",
      icon: <SettingsIcon size={18} />,
      to: "/admin/settings",
    },
    { label: "Logout", icon: <LogOut size={18} />, action: "logout" },
  ];

  // meta viewport (konsisten)
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
    );
  }, []);

  // preload dari localStorage biar instan
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("userInfo") || "{}");
      if (u?.name) setName(u.name);
      if (u?.email) setEmail(u.email);
    } catch {
      /* ignore */
    }
  }, []);

  // fetch dari server untuk kebenaran data
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        // ⬇️ CUKUP "/users/:id" (baseURL sudah mengandung /api)
        const { data: u } = await get(`/users/${userId}`);
        setName(u?.name || "");
        setEmail(u?.email || "");
      } catch (e) {
        setMsg({
          type: "error",
          text: e?.message || "Failed to load profile.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleLogout = (e) => {
    e?.preventDefault?.();
    try {
      localStorage.clear();
    } finally {
      navigate("/");
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setMsg({ type: "error", text: "Name and email are required." });
      return;
    }
    if (newPwd || newPwd2 || curPwd) {
      if (!curPwd) {
        setMsg({
          type: "error",
          text: "Enter current password to change password.",
        });
        return;
      }
      if (newPwd.length < 6) {
        setMsg({ type: "error", text: "Password minimum 6 characters." });
        return;
      }
      if (newPwd !== newPwd2) {
        setMsg({ type: "error", text: "Confirm new password does not match." });
        return;
      }
    }

    try {
      setSaving(true);
      setMsg(null);

      const body = {
        name: name.trim(),
        email: email.trim(),
      };
      // Jika ada permintaan ganti password
      if (curPwd && newPwd) {
        body.current_password = curPwd;
        body.password = newPwd;
        body.password_confirmation = newPwd2;
      }

      // ⬇️ PUT via helper; baseURL sudah /api
      const { data: j } = await put(`/users/${userId}`, body);

      // perbarui localStorage userInfo
      try {
        localStorage.setItem(
          "userInfo",
          JSON.stringify({
            ...JSON.parse(localStorage.getItem("userInfo") || "{}"),
            name: j?.name,
            email: j?.email,
            id: j?.id,
          })
        );
      } catch {
        /* ignore */
      }
      // bersihkan field password
      setCurPwd("");
      setNewPwd("");
      setNewPwd2("");

      setMsg({ type: "success", text: "Profil berhasil diperbarui." });
    } catch (e) {
      setMsg({
        type: "error",
        text: e?.message || "Gagal menyimpan perubahan.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
:root{
  --primary:#7c3aed;
  --primary-700:#6b46c1;
  --ink:#111827;
  --muted:#64748b;
  --bg:#f8f7ff;
}
*,
*::before,
*::after { box-sizing:border-box; }
html, body, #root { width:100%; height:100%; }
body{
  font-family:'Inter','Poppins',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  background:var(--bg);
  color:var(--ink);
  margin:0;
  font-size:16px;
}
.layout{
  display:flex; min-height:100vh; width:100%;
  background:
    radial-gradient(1200px 400px at 80% -100px, rgba(124,58,237,.06), transparent 60%),
    var(--bg);
}
.content{ flex:1; padding:24px; max-width:960px; margin:0 auto; width:100%; }
.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin-bottom:12px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }

.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; width:100%; }
.page-title{ font-size:24px; font-weight:800; margin:0 0 4px; }

.row{ display:grid; grid-template-columns:1fr; gap:16px; }
.section-title{ font-size:15px; font-weight:800; margin:0 0 8px; }
.input{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; font-size:14px; }
.input:focus{ border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15); }
.field{ display:grid; gap:6px; }
.grid-2{ display:grid; gap:12px; grid-template-columns:1fr 1fr; }
.help{ color:#64748b; font-size:12px; }

.btn{ display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:10px; font-weight:700; cursor:pointer;
  border:1px solid #cbd5e1; background:#fff; font-size:14px; }
.btn-primary{ background:#6b46c1; color:#fff; border-color:#6b46c1; }
.btn-primary:hover{ background:#553c9a; }
.actions{ display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }

.alert{ display:flex; align-items:flex-start; gap:8px; border-radius:10px; padding:10px 12px; margin-bottom:12px; }
.alert.success{ background:#f0fdf4; border:1px solid #86efac; color:#166534; }
.alert.error{ background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }

.pwd-wrap{ position:relative; }
.pwd-toggle{ position:absolute; right:8px; top:50%; transform:translateY(-50%); border:0; background:transparent; cursor:pointer; padding:4px; }

.sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 16px;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 950;
}
/* Sidebar */
.sidebar{width:240px; background:#fff; border-right:1px solid #e2e8f0; position:sticky; top:0; height:100vh; padding:14px; z-index:40}
.sidebar h3{margin:0 0 10px; font-weight:800; font-size:18px}
.menu-item{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:#475569; font-weight:600; text-decoration:none; margin-bottom:6px; font-size:14px}
.menu-item:hover{ background:#f3f0ff; color:var(--primary) }
.menu-item.active{ background:#f3f0ff; color:var(--primary) }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; cursor:pointer }

.hamburger{
  border:1px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px;
  display:none; align-items:center; justify-content:center;
}
.hamburger:hover{ background:#f8fafc; }
.backdrop{
  position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:940; display:none;
}

/* ===== MOBILE ===== */
@media (max-width:640px){
  .sidebar{
    position:fixed; left:0; top:0; bottom:0; height:100vh;
    transform:translateX(-100%); transition:transform .25s ease; z-index:950;
    width:80vw; max-width:300px;
  }
  .sidebar.open{ transform:translateX(0); }
  .backdrop{ display:block; }

  .content{ padding:12px 14px 28px; max-width:none; }
  .breadcrumb .hamburger{ display:inline-flex; }
  .grid-2{ grid-template-columns:1fr; }
  .actions{ justify-content:stretch; }
  .actions .btn{ width:100%; }
}

/* desktop: sembunyikan hamburger */
@media (min-width:641px){
  .breadcrumb .hamburger{ display:none !important; }
}
      `}</style>

      <div className="layout">
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>Admin</h3>
          {sidebar.map(({ label, icon, to, action }) =>
            action === "logout" ? (
              <button
                key={label}
                type="button"
                className="menu-item"
                onClick={handleLogout}
              >
                {icon} {label}
              </button>
            ) : (
              <NavLink
                key={label}
                to={to}
                end={to === "/admin"} // exact hanya untuk dashboard
                className={({ isActive }) =>
                  `menu-item ${isActive ? "active" : ""}`
                }
                onClick={() => setIsSidebarOpen(false)}
              >
                {icon} {label}
              </NavLink>
            )
          )}
        </aside>

        {/* BACKDROP */}
        {isSidebarOpen && (
          <div className="backdrop" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Content */}
        <main className="content">
          <div className="breadcrumb">
            <button
              className="hamburger"
              aria-label="Open menu"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <Link to="/admin">Dashboard</Link>
            <span>›</span>
            <span>Settings</span>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h1
              className="page-title"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <SettingsIcon size={22} /> Admin Settings
            </h1>
            <div style={{ color: "#64748b" }}>
              Perbarui informasi akun Anda.
            </div>
          </div>

          <div className="row">
            {/* Alert */}
            {msg && (
              <div className={`alert ${msg.type}`}>
                {msg.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <XCircle size={18} />
                )}
                <div>{msg.text}</div>
              </div>
            )}

            {/* Profile */}
            <div className="card">
              <div className="section-title">Profil</div>
              {loading ? (
                <div className="help">Loading profile…</div>
              ) : (
                <form onSubmit={saveProfile}>
                  <div className="grid-2">
                    <div className="field">
                      <label style={{ fontWeight: 700 }}>
                        <User size={14} style={{ marginRight: 6 }} />
                        Name
                      </label>
                      <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="field">
                      <label style={{ fontWeight: 700 }}>
                        <Mail size={14} style={{ marginRight: 6 }} />
                        Email
                      </label>
                      <input
                        className="input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div style={{ height: 12 }} />

                  <div className="section-title">Ganti Password (opsional)</div>
                  <div className="grid-2">
                    <div className="field">
                      <label style={{ fontWeight: 700 }}>
                        <KeyRound size={14} style={{ marginRight: 6 }} />
                        Current password
                      </label>
                      <div className="pwd-wrap">
                        <input
                          className="input"
                          type={showCur ? "text" : "password"}
                          value={curPwd}
                          onChange={(e) => setCurPwd(e.target.value)}
                          placeholder="••••••"
                        />
                        <button
                          type="button"
                          className="pwd-toggle"
                          onClick={() => setShowCur((v) => !v)}
                          aria-label="toggle current password"
                        >
                          {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="help">
                        Wajib diisi jika ingin mengganti password.
                      </div>
                    </div>

                    <div className="field">
                      <label style={{ fontWeight: 700 }}>
                        <KeyRound size={14} style={{ marginRight: 6 }} />
                        New password
                      </label>
                      <div className="pwd-wrap">
                        <input
                          className="input"
                          type={showNew ? "text" : "password"}
                          value={newPwd}
                          onChange={(e) => setNewPwd(e.target.value)}
                          placeholder="Minimal 6 karakter"
                        />
                        <button
                          type="button"
                          className="pwd-toggle"
                          onClick={() => setShowNew((v) => !v)}
                          aria-label="toggle new password"
                        >
                          {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="field">
                      <label style={{ fontWeight: 700 }}>
                        <KeyRound size={14} style={{ marginRight: 6 }} />
                        Confirm new password
                      </label>
                      <div className="pwd-wrap">
                        <input
                          className="input"
                          type={showNew2 ? "text" : "password"}
                          value={newPwd2}
                          onChange={(e) => setNewPwd2(e.target.value)}
                          placeholder="Ulangi password baru"
                        />
                        <button
                          type="button"
                          className="pwd-toggle"
                          onClick={() => setShowNew2((v) => !v)}
                          aria-label="toggle confirm password"
                        >
                          {showNew2 ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      <Save size={16} />
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

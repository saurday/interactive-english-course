import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
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
} from "lucide-react";

/* ====== Config & helpers ====== */
const BASE_URL = "https://laravel-interactive-english-course-production.up.railway.app";

const getUserId = () => {
  try {
    const u = JSON.parse(localStorage.getItem("userInfo") || "{}");
    return u?.id ?? null;
  } catch {
    return null;
  }
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  Accept: "application/json",
  "Content-Type": "application/json",
});

/* ====== Page ====== */
export default function LecturerSettings() {
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

  // Sidebar menu
  const sidebar = [
    { label: "Dashboard", icon: <Home size={18} />, to: "/lecture" },
    { label: "Reports", icon: <BarChart2 size={18} />, to: "/lecture/reports" },
    { label: "Settings", icon: <SettingsIcon size={18} />, to: "/lecture/settings" },
    { label: "Logout", icon: <LogOut size={18} />, action: "logout" },
  ];

  // meta viewport (konsisten dengan halaman lain)
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
        const r = await fetch(`${BASE_URL}/api/users/${userId}`, {
          headers: authHeaders(),
        });
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        const u = await r.json();
        setName(u.name || "");
        setEmail(u.email || "");
      } catch (e) {
        setMsg({ type: "error", text: e?.message || "Failed to load profile." });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleLogout = (e) => {
    e?.preventDefault?.();
    try {
      localStorage.clear();
   } catch {
      /* ignore */
    }
    navigate("/");
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setMsg({ type: "error", text: "Name and email are required." });
      return;
    }
    if (newPwd || newPwd2 || curPwd) {
      if (!curPwd) {
        setMsg({ type: "error", text: "Enter current password to change password." });
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

      const r = await fetch(`${BASE_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      const j = await r.json();
      if (!r.ok) {
        // tampilkan error dari backend bila ada
        const firstError =
          j?.message ||
          (j?.errors &&
            Object.values(j.errors)[0] &&
            Object.values(j.errors)[0][0]);
        throw new Error(firstError || `Gagal menyimpan (${r.status})`);
      }

      // perbarui localStorage userInfo biar konsisten
      try {
        localStorage.setItem(
          "userInfo",
          JSON.stringify({ ...(JSON.parse(localStorage.getItem("userInfo") || "{}")), name: j.name, email: j.email, id: j.id })
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
      setMsg({ type: "error", text: e?.message || "Gagal menyimpan perubahan." });
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

.sidebar{
  width:240px; background:#fff; border-right:1px solid #e5e7eb; padding:16px;
  position:sticky; top:0; height:100vh; z-index:950;
}
.menu-item{
  display:flex; align-items:center; gap:8px; padding:10px; border-radius:8px;
  color:#4a5568; font-weight:600; cursor:pointer; text-decoration:none; font-size:16px;
}
.menu-item:hover{ background:#f3f0ff; color:var(--primary); }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; }

.content{ flex:1; padding:24px; max-width:960px; margin:0 auto; width:100%; }
.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin-bottom:12px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }

.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; width:100%; }
.page-title{ font-size:28px; font-weight:800; margin:0 0 4px; }

.row{ display:grid; grid-template-columns:1fr; gap:16px; }
.section-title{ font-size:16px; font-weight:800; margin:0 0 8px; }
.input{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }
.input:focus{ border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15); }
.field{ display:grid; gap:6px; }
.grid-2{ display:grid; gap:12px; grid-template-columns:1fr 1fr; }
.help{ color:#64748b; font-size:12px; }

.btn{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; font-weight:700; cursor:pointer;
  border:1px solid #cbd5e1; background:#fff; }
.btn-primary{ background:#6b46c1; color:#fff; border-color:#6b46c1; }
.btn-primary:hover{ background:#553c9a; }
.actions{ display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }

.alert{ display:flex; align-items:flex-start; gap:8px; border-radius:10px; padding:10px 12px; margin-bottom:12px; }
.alert.success{ background:#f0fdf4; border:1px solid #86efac; color:#166534; }
.alert.error{ background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }

.pwd-wrap{ position:relative; }
.pwd-toggle{ position:absolute; right:8px; top:50%; transform:translateY(-50%); border:0; background:transparent; cursor:pointer; padding:4px; }

@media (max-width:640px){
  .sidebar{ position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease; }
  .sidebar.open{ transform:translateX(0); }
  .content{ padding:10px 12px 90px; }
}
      `}</style>

      <div className="layout">
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>Lecturer</h3>
          {sidebar.map(({ label, icon, to, action }) =>
            action === "logout" ? (
              <button key={label} type="button" className="menu-item" onClick={handleLogout}>
                {icon} {label}
              </button>
            ) : (
              <Link
                key={label}
                to={to}
                className="menu-item"
                onClick={() => setIsSidebarOpen(false)}
              >
                {icon} {label}
              </Link>
            )
          )}
        </aside>

        {/* Content */}
        <main className="content">
          <div className="breadcrumb">
            <button
              className="btn"
              style={{ padding: 6, borderRadius: 10, borderColor: "#e2e8f0" }}
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <Link to="/lecture">Dashboard</Link>
            <span>›</span>
            <span>Settings</span>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SettingsIcon size={22} /> Settings
            </h1>
            <div style={{ color: "#64748b" }}>Perbarui informasi akun Anda.</div>
          </div>

          <div className="row">
            {/* Alert */}
            {msg && (
              <div className={`alert ${msg.type}`}>
                {msg.type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
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
                      <div className="help">Required if you want to change your password.</div>
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
                          placeholder="Minimal 6 chacaracter"
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
                          placeholder="Re-enter new password"
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
                    <button type="submit" className="btn btn-primary" disabled={saving}>
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

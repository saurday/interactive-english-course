// src/pages/lecture/CefrLevelList.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  BarChart2,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const sidebarMenuDosen = [
  { label: "Dashboard", icon: <Home size={18} />, to: "/lecture", end: true }, // <-- tambahkan end
  { label: "CEFR Modules", icon: <BookOpen size={18} />, to: "/lecture/cefr" },
  { label: "Reports", icon: <BarChart2 size={18} />, to: "/lecture/reports" },
  { label: "Settings", icon: <Settings size={18} />, to: "/lecture/settings" },
  { label: "Logout", icon: <LogOut size={18} />, action: "logout" },
];

const STATIC_CEFR = [
  { code: "A1", name: "Beginner", desc: "Basic user" },
  { code: "A2", name: "Elementary", desc: "Basic user" },
  { code: "B1", name: "Intermediate", desc: "Independent user" },
  { code: "B2", name: "Upper-Intermediate", desc: "Independent user" },
  { code: "C1", name: "Advanced", desc: "Proficient user" },
  { code: "C2", name: "Proficient", desc: "Proficient user" },
];

// hapus "A1 ", "A2 -", dst di depan nama
function stripCode(name = "", code = "") {
  if (!name) return name;
  // contoh yang ditangani: "A1 Beginner", "A1 - Beginner", "A1: Beginner"
  const re = new RegExp(`^\\s*${code}\\s*[-:]?\\s*`, "i");
  return name.replace(re, "").trim();
}

// Coba beberapa endpoint; fallback ke STATIC_CEFR bila gagal/kosong
async function fetchLevels(token) {
  const tries = [`${BASE_URL}/api/cefr-levels`, `${BASE_URL}/api/cefr-levels`];
  for (const url of tries) {
    try {
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) continue;
      const j = await r.json();
      const arr = Array.isArray(j) ? j : j.levels || j.data || [];
      if (!Array.isArray(arr) || arr.length === 0) continue;

      // Normalisasi agar punya {code,name,desc}
      return arr
        .map((x) => ({
          id: x.id,
          code:
            x.code ||
            x.level ||
            (typeof x.name === "string" ? x.name.toUpperCase() : ""),
          name: x.name || x.title || (x.code ? `Level ${x.code}` : "Level"),
          desc: x.description || x.desc || "",
        }))
        .filter((x) => x.code);
    } catch {
      /* ignore and try next */
    }
  }
  return STATIC_CEFR;
}

export default function CefrLevelList() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const [levels, setLevels] = useState(STATIC_CEFR);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchLevels(token);
        setLevels(data.length ? data : STATIC_CEFR);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleLogout = (e) => {
    e?.preventDefault?.();
    localStorage.clear();
    navigate("/");
  };

  return (
    <>
      <style>{`
:root{
  --primary:#7c3aed; --primary-50:#f5f3ff; --ink:#1f2937; --muted:#64748b; --bg:#f8f7ff;
}
body{ font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
.dashboard-container{ display:flex; min-height:100vh; background: radial-gradient(1200px 400px at 80% -100px, rgba(124,58,237,.06), transparent 60%), var(--bg); }
.sidebar{ width:240px; background:#fff; border-right:1px solid #e2e8f0; padding:16px; position:sticky; top:0; height:100vh; }
.menu-item{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:#475569; font-weight:600; text-decoration:none; margin-bottom:6px; font-size:14px}
.menu-item:hover{ background:#f3f0ff; color:var(--primary) }
.menu-item.active{ background:#f3f0ff; color:var(--primary) }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; cursor:pointer }

.content{ flex:1; padding:24px; max-width:1400px; margin:0 auto; }
.content-header{ display:flex; align-items:center; gap:10px; justify-content:space-between; margin-bottom:18px; }
.page-title{ font-size:28px; font-weight:800; color:var(--ink); margin:0; }
.level-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
@media (max-width:1200px){ .level-grid{ grid-template-columns:repeat(2,1fr); } }
@media (max-width:640px){
  .sidebar{ position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease; z-index:950; }
  .sidebar.open{ transform:translateX(0); }
  .content{ padding:10px 12px 40px; }
  .level-grid{ grid-template-columns:1fr; gap:14px; }
}
.level-card{
  position:relative; background:#fff; border:1px solid #e9d5ff; border-radius:14px; padding:18px;
  box-shadow:0 6px 20px rgba(124,58,237,.06); transition:.2s; cursor:pointer;
}
.level-card:hover{ transform: translateY(-3px); box-shadow:0 10px 28px rgba(124,58,237,.15); }
.level-code{ display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:12px; background:var(--primary-50); color:var(--primary); font-weight:800; font-size:18px; }
.level-name{ margin:8px 0 0; font-weight:800; color:#111827; }
.level-desc{ margin:4px 0 0; color:var(--muted); }
.hamburger{ border:1px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px; display:none; }
@media (max-width:640px){ .hamburger{ display:inline-flex; } }
`}</style>

      <div className="dashboard-container">
        {isSidebarOpen && (
          <div className="backdrop" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h3 style={{ fontWeight: 700, margin: 0, marginBottom: 12 }}>
              Lecturer
            </h3>
          </div>
          {sidebarMenuDosen.map(({ label, icon, to, action, end }) =>
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
                end={end} // <-- penting
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

        {/* Content */}
        <main className="content">
          <div className="content-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                className="hamburger"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <h1 className="page-title">CEFR Modules</h1>
            </div>
          </div>

          {loading ? (
            <div style={{ color: "#64748b" }}>Loading levels…</div>
          ) : (
            <div className="level-grid">
              {levels.map((lv) => {
                const title = stripCode(lv.name || `Level ${lv.code}`, lv.code);
                return (
                  <div
                    key={lv.code}
                    className="level-card"
                    onClick={() => navigate(`/lecture/cefr/${lv.code}`)}
                    role="button"
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div className="level-code">{lv.code}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="level-name">{title}</div>
                        {lv.desc && <div className="level-desc">{lv.desc}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

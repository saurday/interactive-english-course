// src/pages/admin/AdminCefrModules.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  Loader2,
  Search,
  ChevronRight,
} from "lucide-react";

/* ===== API (named imports) ===== */
import { get, ApiError } from "@/config/api";

/* ===== Small UI ===== */
const Pill = ({ children }) => (
  <span
    className="inline-flex items-center border rounded-full border-violet-200 bg-violet-50 text-violet-700"
    style={{
      fontSize: 12,
      fontWeight: 700,
      padding: "6px 12px",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

export default function AdminCefrModules() {
  const navigate = useNavigate();

  /* Sidebar (pakai menu admin agar konsisten dengan screenshot) */
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebar = [
    { label: "Dashboard", to: "/admin", icon: <LayoutDashboard size={18} /> },
    { label: "Manage Users", to: "/admin/users", icon: <Users size={18} /> },
    {
      label: "User Progress",
      to: "/admin/progress",
      icon: <BarChart2 size={18} />,
    },
    {
      label: "CEFR Modules",
      to: "/admin/cefrmodules",
      icon: <BookOpen size={18} />,
    },
    { label: "Settings", to: "/admin/settings", icon: <Settings size={18} /> },
    { label: "Logout", action: "logout", icon: <LogOut size={18} /> },
  ];

  /* Data */
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [resources, setResources] = useState([]);

  /* UI: search & filter */
  const [q, setQ] = useState("");
  const [type, setType] = useState("all"); // all|text|video|file|quiz|assignment|composite
  const [expanded, setExpanded] = useState({}); // {levelKey: boolean}

  /* ===== Styles ===== */
  useEffect(() => {
    document.title = "CEFR Modules";
  }, []);
  const Styles = (
    <style>{`
:root{ --primary:#7c3aed; --primary-600:#6d28d9; --primary-50:#f5f3ff; --ink:#0f172a; --muted:#64748b; --bg:#f8f7ff }
*{ box-sizing:border-box }
body{ font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif }

/* Layout */
.admin-layout{
  display:flex; min-height:100vh;
  background: radial-gradient(1200px 400px at 80% -120px, rgba(124,58,237,.06), transparent 60%), var(--bg);
  overflow-x:hidden;
}
.sidebar{
  width:260px;
  flex:0 0 260px;
  background:#fff; border-right:1px solid #e2e8f0;
  position:sticky; top:0; height:100vh; padding:14px; z-index:40
}
.sidebar h3{margin:0 0 10px; font-weight:800; font-size:18px}
.menu-item{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:#475569; font-weight:600; text-decoration:none; margin-bottom:6px; font-size:14px}
.menu-item:hover{ background:#f3f0ff; color:var(--primary) }
.menu-item.active{ background:#f3f0ff; color:var(--primary) }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; cursor:pointer }

.content{
  flex:1 1 auto; min-width:0;
  padding:20px; max-width:1100px; width:100%; margin:0 auto;
}
.topbar{display:flex; align-items:center; justify-content:space-between; gap:10px}
.brand{display:flex; align-items:center; gap:10px}
.hamburger{display:none; border:1px solid #e2e8f0; border-radius:10px; background:#fff; padding:8px}
.h1{font-size:26px; font-weight:900; color:var(--ink)}
.sub{color:var(--muted); font-size:14px}
.breadcrumb{display:flex; align-items:center; gap:8px; color:#64748b; font-size:13px; margin:6px 0 8px}
.breadcrumb b{color:#0f172a}

.card{background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 6px 18px rgba(0,0,0,.06); overflow:hidden}
.hoverable{transition:transform .18s ease, box-shadow .18s ease}
.hoverable:hover{transform:translateY(-2px); box-shadow:0 14px 28px rgba(124,58,237,.18)}
.input{width:100%; border:1px solid #cbd5e1; border-radius:12px; padding:10px 12px; font:inherit; outline:none; background:#f8fafc}
.input:focus{border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15)}
.chip{border:1px solid #e5e7eb; background:#fff; color:#475569; padding:8px 12px; border-radius:999px; font-size:13px; font-weight:700; cursor:pointer}
.chip.active{background:#f3f0ff; color:var(--primary); border-color:#e9d5ff}
.search{display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:8px 10px; min-width:260px}

.pill-link{
  display:inline-flex; align-items:center; gap:6px;
  padding:6px 12px; border-radius:9999px;
  border:1px solid #c7d2fe; background:#eef2ff;
  color:#6d28d9; font-weight:700; font-size:12px;
  text-decoration:none; white-space:nowrap; cursor:pointer;
}
.pill-link:hover{ background:#f3f0ff; border-color:#e9d5ff; }

.week{ padding:14px; margin-top:12px }
.week-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px }
.week-title{ font-weight:900; font-size:16px; }
.counts{ display:flex; gap:8px; flex-wrap:wrap }
.count-badge{ font-size:12px; font-weight:700; color:#334155; background:#eef2ff; border:1px solid #c7d2fe; padding:4px 8px; border-radius:999px }

/* Item list */
.item{
  display:grid; grid-template-columns:1fr auto auto; gap:12px;
  padding:12px; border:1px solid #e5e7eb; border-radius:12px; margin-bottom:10px;
}
.item-title{ font-weight:800 }
.item-desc{
  font-size:12px; color:#64748b; margin-top:4px; max-width:760px;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}

@media (max-width: 1024px){
  .content{ max-width:920px }
}
@media (max-width: 768px){
  .sidebar{ position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease }
  .sidebar.open{ transform:translateX(0) }
  .hamburger{ display:inline-flex }
  .item{ grid-template-columns:1fr }
  .counts{ width:100% }
}
`}</style>
  );

  /* ===== Load resources (group by level) ===== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: j } = await get("/placement/contents");
        setResources(
          Array.isArray(j?.contents) ? j.contents : Array.isArray(j) ? j : []
        );
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e?.message;
        setErr(msg || "Failed to load modules");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Search + filter */
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return resources
      .filter((r) => (type === "all" ? true : r.type === type))
      .filter((r) =>
        !term
          ? true
          : (r.title || "").toLowerCase().includes(term) ||
            (r.level_code || "").toLowerCase().includes(term)
      );
  }, [resources, q, type]);

  /* Group by LEVEL (bukan week) */
  const groups = useMemo(() => {
    const m = new Map();
    list.forEach((r) => {
      const k = r.level_code || `Level ${r.level_id}`;
      if (!m.has(k))
        m.set(k, { level: k, level_name: r.level_name, items: [] });
      m.get(k).items.push(r);
    });
    return Array.from(m.values())
      .sort((a, b) => (a.level > b.level ? 1 : -1))
      .map((g) => ({
        ...g,
        items: g.items.sort(
          (x, y) => (x.sort_order ?? 0) - (y.sort_order ?? 0)
        ),
      }));
  }, [list]);

  /* actions */
  const handleLogout = () => {
    try {
      localStorage.clear();
    } finally {
      navigate("/");
    }
  };

  return (
    <>
      {Styles}
      <div className="admin-layout">
        {/* backdrop mobile */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.35)",
              zIndex: 30,
            }}
          />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <h3>Admin</h3>
          {sidebar.map(({ label, to, icon, action }) =>
            action === "logout" ? (
              <button key={label} className="menu-item" onClick={handleLogout}>
                {icon} {label}
              </button>
            ) : (
              <NavLink
                key={label}
                to={to}
                end={to === "/admin"}
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
          {/* Topbar */}
          <div className="topbar">
            <div className="brand">
              <button
                className="hamburger"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="h1">CEFR Modules</div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link
              to="/admin"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Dashboard
            </Link>
            <ChevronRight size={14} />
            <b>CEFR Modules</b>
          </div>

          <div className="sub">
            Browse learning materials by week. Search, filter, and open
            resources.
          </div>

          {/* Toolbar */}
          <div
            className="card hoverable"
            style={{ padding: 12, marginTop: 14 }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div className="search" style={{ flex: "1 1 280px" }}>
                <Search size={16} color="#64748b" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title…"
                  className="input"
                  style={{ border: 0, background: "transparent", padding: 0 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "all",
                  "text",
                  "video",
                  "file",
                  "quiz",
                  "assignment",
                  "composite",
                ].map((t) => (
                  <button
                    key={t}
                    className={`chip ${type === t ? "active" : ""}`}
                    onClick={() => setType(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className="card hoverable"
            style={{ padding: 12, marginTop: 14 }}
          >
            {loading ? (
              <div
                style={{
                  padding: 24,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Loader2 className="animate-spin" size={18} /> Loading modules…
              </div>
            ) : err ? (
              <div
                style={{
                  padding: 14,
                  color: "#991b1b",
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  borderRadius: 12,
                }}
              >
                {err}
              </div>
            ) : groups.length === 0 ? (
              <div style={{ padding: 14, color: "#64748b" }}>No contents.</div>
            ) : (
              groups.map(({ level, level_name, items }) => {
                const counts = items.reduce(
                  (acc, r) => ((acc[r.type] = (acc[r.type] || 0) + 1), acc),
                  {}
                );
                const isOpen = expanded[level] ?? true;
                return (
                  <section className="week" key={level}>
                    <div className="week-head">
                      <div className="week-title">
                        {level} {level_name ? `– ${level_name}` : ""}
                      </div>
                      <div className="counts">
                        {[
                          "text",
                          "video",
                          "file",
                          "quiz",
                          "assignment",
                          "composite",
                        ].map((t) => (
                          <span key={t} className="count-badge">
                            {t}: {counts[t] || 0}
                          </span>
                        ))}
                        <button
                          className="chip"
                          onClick={() =>
                            setExpanded((m) => ({ ...m, [level]: !isOpen }))
                          }
                        >
                          {isOpen ? "Collapse" : "Expand"}
                        </button>
                      </div>
                    </div>

                    {isOpen &&
                      items.map((r) => (
                        <div className="item" key={r.id}>
                          <div>
                            <div className="item-title">
                              {r.title || `(untitled #${r.id})`}
                            </div>
                            {!!r.text && (
                              <div className="item-desc">
                                {String(r.text)
                                  .replace(/\s+/g, " ")
                                  .slice(0, 160)}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                            }}
                          >
                            <Pill>{(r.type || "").toUpperCase()}</Pill>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              justifyContent: "flex-end",
                            }}
                          >
                            {(r.type === "video" ||
                              (r.type === "composite" && r.video_url)) &&
                              r.video_url && (
                                <a
                                  className="pill-link"
                                  href={r.video_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open Video
                                </a>
                              )}
                            {(r.type === "file" ||
                              (r.type === "composite" && r.file_url)) &&
                              r.file_url && (
                                <a
                                  className="pill-link"
                                  href={r.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open File
                                </a>
                              )}
                            {(r.type === "text" ||
                              (r.type === "composite" &&
                                !r.video_url &&
                                !r.file_url)) && (
                              <span
                                className="pill-link"
                                style={{ pointerEvents: "none" }}
                              >
                                Text only
                              </span>
                            )}
                            {r.type === "quiz" && r.quiz_id && (
                              <span
                                className="pill-link"
                                style={{ pointerEvents: "none" }}
                              >
                                Quiz #{r.quiz_id}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </section>
                );
              })
            )}
          </div>
        </main>
      </div>
    </>
  );
}

// src/pages/admin/UserProgress.jsx
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
  Download,
  Printer,
  TrendingUp,
  PieChart,
  Target,
} from "lucide-react";

/* ====== Config (pakai api wrapper) ====== */
import api from "@/config/api";

/* Small UI */
const Stat = ({ icon, label, value, sub }) => (
  <div className="card hoverable stat">
    <div className="stat-icon">{icon}</div>
    <div className="stat-body">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub ? <div className="stat-sub">{sub}</div> : null}
    </div>
  </div>
);
const Pill = ({ children }) => (
  <span
    className="inline-flex items-center border rounded-full border-violet-200 bg-violet-50 text-violet-700"
    style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px" }}
  >
    {children}
  </span>
);

export default function UserProgress() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [totalResources, setTotalResources] = useState(0);

  // TAB: students | resources
  const [view, setView] = useState("students");

  // resources state
  const [resources, setResources] = useState([]);
  const [resLoading, setResLoading] = useState(false);
  const [resErr, setResErr] = useState(null);
  const [resQ, setResQ] = useState("");
  const [resType, setResType] = useState("all");

  /* sidebar */
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

  /* data */
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // search & filter
  const [q, setQ] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* ====== Styles ====== */
  useEffect(() => {
    document.title = "User Progress";
  }, []);
  const Styles = (
    <style>{`
:root{ --primary:#7c3aed; --primary-600:#6d28d9; --primary-50:#f5f3ff; --ink:#0f172a; --muted:#64748b; --bg:#f8f7ff }
*{box-sizing:border-box}
body{font-family:'Inter','Poppins',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}

.admin-layout{display:flex; min-height:100vh; background:
  radial-gradient(1200px 400px at 80% -120px, rgba(124,58,237,.06), transparent 60%), var(--bg);}
.sidebar{width:240px; background:#fff; border-right:1px solid #e2e8f0; position:sticky; top:0; height:100vh; padding:14px; z-index:40}
.sidebar h3{margin:0 0 10px; font-weight:800; font-size:18px}
.menu-item{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:#475569; font-weight:600; text-decoration:none; margin-bottom:6px; font-size:14px}
.menu-item:hover{ background:#f3f0ff; color:var(--primary) }
.menu-item.active{ background:#f3f0ff; color:var(--primary) }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; cursor:pointer }

.content{flex:1; padding:20px; max-width:1200px; margin:0 auto; width:100%}
.topbar{display:flex; align-items:center; justify-content:space-between; gap:10px}
.brand{display:flex; align-items:center; gap:10px}
.hamburger{display:none; border:1px solid #e2e8f0; border-radius:10px; background:#fff; padding:8px}
.hamburger:hover{ background:#f8fafc }

.h1{font-size:26px; font-weight:900; color:var(--ink)}
.sub{color:var(--muted); font-size:14px}
.breadcrumb{display:flex; align-items:center; gap:8px; color:#64748b; font-size:13px; margin:6px 0 8px}
.breadcrumb b{color:#0f172a}

.card{background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 6px 18px rgba(0,0,0,.06)}
.hoverable{transition:transform .18s ease, box-shadow .18s ease}
.hoverable:hover{transform:translateY(-2px); box-shadow:0 14px 28px rgba(124,58,237,.18)}
.btn{display:inline-flex; align-items:center; gap:8px; border-radius:10px; padding:10px 14px; font-weight:600; font-size:14px; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:var(--primary)}
.btn-sm{padding:8px 12px; font-size:13px}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary-600)); color:#fff; border-color:transparent; box-shadow:0 10px 24px rgba(124,58,237,.22)}
.input{width:100%; border:1px solid #cbd5e1; border-radius:12px; padding:10px 12px; font:inherit; outline:none; background:#f8fafc}
.input:focus{border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15)}
.select{appearance:none}

/* toolbar */
.toolbar{display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:14px}
.search{display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:8px 10px; min-width:260px}
.filters{display:flex; align-items:center; gap:8px; flex-wrap:wrap}

/* table */
.table-wrap{margin-top:14px; overflow:auto}
.table{width:100%; border-collapse:separate; border-spacing:0 8px}
.tr{background:#fff; border:1px solid #e5e7eb; border-radius:12px}
.th, .td{padding:12px 14px; text-align:left; font-size:14px}
.th{color:#475569; font-weight:700}
.td{color:#0f172a}

/* stat cards */
.stats-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:14px}
.stat{display:flex; gap:12px; padding:14px}
.stat-icon{width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:#f3f0ff; color:var(--primary)}
.stat-value{font-size:22px; font-weight:900; color:#111827}
.stat-label{font-size:12px; color:#6b7280}
.stat-sub{font-size:12px; color:#94a3b8; margin-top:4px}

/* Chips */
.chip{border:1px solid #e5e7eb; background:#fff; color:#475569; padding:8px 12px; border-radius:999px; font-size:13px; font-weight:600; cursor:pointer}
.chip.active{background:#f3f0ff; color:var(--primary); border-color:#e9d5ff}

/* Pagination */
.pager{display:flex; justify-content:flex-end; gap:8px; align-items:center; margin-top:12px}
.badge{font-size:12px; font-weight:600; color:#334155; background:#eef2ff; border:1px solid #c7d2fe; padding:4px 8px; border-radius:999px}

/* === Pill-style link for actions === */
.pill-link{
  display:inline-flex; align-items:center; gap:6px;
  padding:6px 12px; border-radius:9999px;
  border:1px solid #c7d2fe; background:#eef2ff;
  color:#6d28d9; font-weight:700; font-size:12px;
  text-decoration:none; white-space:nowrap; cursor:pointer;
}
.pill-link:hover{ background:#f3f0ff; border-color:#e9d5ff; }

/* Responsive sidebar like dashboard */
@media (max-width: 768px){
  .sidebar{position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease}
  .sidebar.open{transform:translateX(0)}
  .hamburger{display:inline-flex}
  .stats-grid{grid-template-columns:1fr}
}
  /* sembunyikan kolom tertentu di HP */
@media (max-width:640px){
  .hide-sm{ display:none; }
  .table.responsive .td, .table.responsive .th{ font-size:13px; padding:10px 12px; }
}

    `}</style>
  );

  /* ====== load data (pakai api) ====== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: j } = await api.get(`/api/admin/students/progress`);
        setStudents(Array.isArray(j?.students) ? j.students : []);
        setTotalResources(j?.total_resources || 0);
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Failed to load";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchResources = async () => {
    setResLoading(true);
    setResErr(null);
    try {
      const { data: j } = await api.get(`/api/course-resources`);
      const arr = Array.isArray(j?.resources)
        ? j.resources
        : Array.isArray(j)
        ? j
        : [];
      setResources(arr);
      setTotalResources(j?.total ?? arr.length);
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load resources";
      setResErr(msg);
    } finally {
      setResLoading(false);
    }
  };

  // load resources saat pertama kali tab "resources" dibuka
  useEffect(() => {
    if (view === "resources" && resources.length === 0 && !resLoading) {
      fetchResources();
    }
  }, [view]); // eslint-disable-line

  // hanya mahasiswa
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return students.filter((u) =>
      !term
        ? true
        : (u.name || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term)
    );
  }, [students, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* actions */
  const handleLogout = () => {
    try {
      localStorage.clear();
    } finally {
      navigate("/");
    }
  };

  /* render */
  return (
    <>
      {Styles}
      <div className="admin-layout">
        {/* mobile backdrop */}
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
              <div className="h1">User Progress</div>
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
            <b>User Progress</b>
          </div>

          <div className="sub">
            Analytics overview of users. Filter, search, and export.
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search">
              <Search size={16} color="#64748b" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name or email…"
                className="input"
                style={{ border: 0, background: "transparent", padding: 0 }}
              />
            </div>

            <div className="filters">
              <button
                className={`chip ${view === "students" ? "active" : ""}`}
                onClick={() => setView("students")}
              >
                Students
              </button>

              <button
                className={`chip ${view === "resources" ? "active" : ""}`}
                onClick={() => setView("resources")}
                title={`Total resources = ${totalResources}`}
              >
                Resources: {totalResources}
              </button>
            </div>
          </div>

          {err ? (
            <div
              className="card"
              style={{
                padding: 14,
                marginTop: 14,
                color: "#991b1b",
                borderColor: "#fecaca",
                background: "#fef2f2",
              }}
            >
              {err}
            </div>
          ) : null}

          {/* CONTENT SWITCH */}
          {view === "students" ? (
            // ====== TABEL STUDENTS ======
            <div
              className="table-wrap card hoverable"
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
                  <Loader2 className="animate-spin" size={18} /> Loading data…
                </div>
              ) : (
                <>
                  <table className="table">
                    <thead>
                      <tr className="tr">
                        <th className="th">Name</th>
                        <th className="th">Email</th>
                        <th className="th">Role</th>
                        <th className="th">Created</th>
                        <th className="th" style={{ width: 160 }}>
                          Progress
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.length === 0 ? (
                        <tr className="tr">
                          <td
                            className="td"
                            colSpan={5}
                            style={{ color: "#64748b" }}
                          >
                            No students found.
                          </td>
                        </tr>
                      ) : (
                        pageData.map((u) => {
                          const pct = u?.progress?.percent;
                          const noData = pct === null || Number.isNaN(pct);
                          const width = noData
                            ? 0
                            : Math.max(0, Math.min(100, pct));
                          return (
                            <tr className="tr" key={u.id}>
                              <td className="td">{u.name}</td>
                              <td className="td">{u.email}</td>
                              <td className="td">
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                  }}
                                >
                                  <Pill>STUDENT</Pill>
                                </div>
                              </td>
                              <td className="td">{u.created_at || "—"}</td>
                              <td className="td">
                                <div
                                  style={{
                                    position: "relative",
                                    height: 8,
                                    background: "#eef2ff",
                                    borderRadius: 999,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      width: `${width}%`,
                                      background:
                                        "linear-gradient(135deg,var(--primary),var(--primary-600))",
                                    }}
                                  />
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#64748b",
                                    marginTop: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <Target size={12} />{" "}
                                  {noData
                                    ? `0% (no data)`
                                    : `${width}% (${u.progress.done}/${u.progress.total})`}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="pager">
                    <span className="badge">
                      Page {page} / {pageCount} • {filtered.length} users
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Prev
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={page >= pageCount}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            // ====== TABEL RESOURCES ======
            <div
              className="table-wrap card hoverable"
              style={{ padding: 12, marginTop: 14 }}
            >
              {resLoading ? (
                <div
                  style={{
                    padding: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Loader2 className="animate-spin" size={18} /> Loading
                  resources…
                </div>
              ) : resErr ? (
                <div className="err">{resErr}</div>
              ) : (
                <>
                  {/* toolbar kecil khusus resources */}
                  <div className="toolbar" style={{ marginTop: 0 }}>
                    <div className="search">
                      <Search size={16} color="#64748b" />
                      <input
                        value={resQ}
                        onChange={(e) => setResQ(e.target.value)}
                        placeholder="Search title…"
                        className="input"
                        style={{
                          border: 0,
                          background: "transparent",
                          padding: 0,
                        }}
                      />
                    </div>
                    <div className="filters">
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
                          className={`chip ${resType === t ? "active" : ""}`}
                          onClick={() => setResType(t)}
                        >
                          {t[0].toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* filter dan tabel resources */}
                  {(() => {
                    const term = resQ.trim().toLowerCase();
                    const list = resources
                      .filter((r) =>
                        resType === "all" ? true : r.type === resType
                      )
                      .filter((r) =>
                        !term
                          ? true
                          : (r.title || "").toLowerCase().includes(term)
                      );

                    return (
                      <table className="table responsive">
                        <thead>
                          <tr className="tr">
                            <th className="th">Title</th>
                            <th className="th">Type</th>
                            <th className="th">Week</th>
                            {/* kolom Action dilebarkan sedikit */}
                            <th className="th" style={{ minWidth: 220 }}>
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.length === 0 ? (
                            <tr className="tr">
                              <td
                                className="td"
                                colSpan={4}
                                style={{ color: "#64748b" }}
                              >
                                No resources.
                              </td>
                            </tr>
                          ) : (
                            list.map((r) => (
                              <tr className="tr" key={r.id}>
                                <td className="td">
                                  <div style={{ fontWeight: 700 }}>
                                    {r.title || `(untitled #${r.id})`}
                                  </div>
                                  {!!r.text && (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "#64748b",
                                        marginTop: 4,
                                        maxWidth: 560,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                      }}
                                    >
                                      {r.text
                                        .replace(/\s+/g, " ")
                                        .slice(0, 140)}
                                    </div>
                                  )}
                                </td>

                                <td className="td">
                                  <Pill>{r.type.toUpperCase()}</Pill>
                                </td>
                                <td className="td">
                                  Week {r.week_number ?? r.week_id}
                                </td>

                                {/* ACTIONS */}
                                <td className="td">
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {(r.type === "video" ||
                                      (r.type === "composite" &&
                                        r.video_url)) &&
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
                                      <span className="badge">Text only</span>
                                    )}

                                    {r.type === "quiz" && r.quiz_id && (
                                      <span className="badge">
                                        Quiz #{r.quiz_id}
                                      </span>
                                    )}

                                    {r.type === "assignment" &&
                                      r.assignment_id && (
                                        <span className="badge">
                                          Assignment #{r.assignment_id}
                                        </span>
                                      )}

                                    {!(
                                      r.video_url ||
                                      r.file_url ||
                                      r.text ||
                                      r.quiz_id ||
                                      r.assignment_id
                                    ) && <span className="badge">—</span>}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

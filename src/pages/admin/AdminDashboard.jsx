// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  Plus,
  CheckCircle2,
  XCircle,
  Shield,
  UserPlus,
  Mail,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

/* ---------- Config (pakai named imports) ---------- */
import { get, post } from "@/config/api";

/* ---------- Helpers ---------- */
const toRoleLabel = (role) =>
  role === "mahasiswa" ? "STUDENT" : role === "dosen" ? "LECTURE" : "ADMIN";

/* ---------- Tiny UI ---------- */
const Pill = ({ children }) => (
  <span
    className="inline-flex items-center border rounded-full border-violet-200 bg-violet-50 text-violet-700"
    style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px" }}
  >
    {children}
  </span>
);

const StatCard = ({ icon, label, value, hint }) => (
  <div className="card stat-card hoverable">
    <div className="flex items-center gap-3">
      <div className="icon-wrap">{icon}</div>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-slate-600">{label}</div>
        <div className="text-3xl font-extrabold leading-tight text-slate-900">
          {value}
        </div>
        {hint ? (
          <div className="text-[12px] text-slate-500 mt-1">{hint}</div>
        ) : null}
      </div>
    </div>
  </div>
);

/* ---------- Page ---------- */
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [savingUser, setSavingUser] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    lecturers: 0,
    admins: 0,
    weekly: [], // [{label, value}]
    latest: [], // [{id,name,email,role,created_at}]
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "mahasiswa", // sesuai DB
  });

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
    {
      label: "Settings",
      to: "/admin/settings",
      icon: <Settings size={18} />,
    },
    { label: "Logout", action: "logout", icon: <LogOut size={18} /> },
  ];

  /* ----- LOAD DARI DB (menggunakan /api/users) ----- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: usersResp } = await get(`/api/users`);
        const users = Array.isArray(usersResp)
          ? usersResp
          : usersResp?.data ?? [];

        // Hitung total & breakdown role
        const total = users.length;
        const students = users.filter((u) => u.role === "mahasiswa").length;
        const lecturers = users.filter((u) => u.role === "dosen").length;
        const admins = users.filter((u) => u.role === "admin").length;

        // Bucket 7 hari terakhir berdasarkan created_at
        const makeKey = (d) => d.toISOString().slice(0, 10);
        const today = new Date();
        const buckets = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - (6 - i)); // oldest -> newest
          return {
            key: makeKey(d),
            // ✅ gunakan EN agar hari berbahasa Inggris
            label: d.toLocaleDateString("en-US", { weekday: "short" }), // Mon, Tue, ...
            value: 0,
          };
        });

        users.forEach((u) => {
          if (!u.created_at) return;
          const k = makeKey(new Date(u.created_at));
          const b = buckets.find((x) => x.key === k);
          if (b) b.value += 1;
        });

        // Latest users (urut created_at desc, ambil 6)
        const latest = [...users]
          .sort(
            (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
          )
          .slice(0, 6);

        setStats({
          total,
          students,
          lecturers,
          admins,
          weekly: buckets.map(({ label, value }) => ({ label, value })),
          latest,
        });
      } catch (e) {
        setMsg({ type: "error", text: e?.message || "Gagal mengambil data." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxWeekly = useMemo(
    () => Math.max(1, ...stats.weekly.map((d) => Number(d.value) || 0)),
    [stats.weekly]
  );
  // Nice scale untuk sumbu Y (0..niceMax)
  const niceMax = useMemo(() => {
    const m = maxWeekly || 1;
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / pow) * pow; // 5, 10, 20, 50, 100, dst
  }, [maxWeekly]);

  const yTicks = useMemo(() => {
    // 5 tick termasuk 0 & max
    return Array.from({ length: 5 }, (_, i) => Math.round((i * niceMax) / 4));
  }, [niceMax]);

  const totalWeekly = useMemo(
    () => stats.weekly.reduce((a, b) => a + (Number(b.value) || 0), 0),
    [stats.weekly]
  );
  const avgWeekly = useMemo(
    () => (totalWeekly / (stats.weekly.length || 1)).toFixed(1),
    [totalWeekly, stats.weekly.length]
  );
  const totalPeople = Math.max(
    1,
    stats.total || stats.students + stats.lecturers + stats.admins
  );

  const handleLogout = () => {
    try {
      localStorage.clear();
    } finally {
      navigate("/");
    }
  };

  const openAddUser = () => {
    setForm({ name: "", email: "", password: "", role: "mahasiswa" });
    setMsg(null);
    setShowAdd(true);
  };

  /* ----- CREATE USER (POST /api/users) ----- */
  const submitUser = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setMsg({ type: "error", text: "Name, email, dan password wajib diisi." });
      return;
    }
    setSavingUser(true);
    setMsg(null);
    try {
      const { data: j } = await post(`/api/users`, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        role: form.role, // 'mahasiswa' | 'dosen' | 'admin'
      });

      // refresh ringan
      setStats((s) => ({
        ...s,
        total: s.total + 1,
        students: s.students + (form.role === "mahasiswa" ? 1 : 0),
        lecturers: s.lecturers + (form.role === "dosen" ? 1 : 0),
        admins: s.admins + (form.role === "admin" ? 1 : 0),
        latest: [
          {
            id: j?.id || Date.now(),
            name: form.name,
            email: form.email,
            role: form.role,
            created_at: new Date().toISOString(),
          },
          ...s.latest,
        ].slice(0, 6),
      }));

      setMsg({ type: "success", text: "User berhasil ditambahkan." });
      setShowAdd(false);
    } catch (e2) {
      setMsg({ type: "error", text: e2?.message || "Terjadi kesalahan." });
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <>
      <style>{`
:root{
  --primary:#7c3aed; --primary-600:#6d28d9; --primary-50:#f5f3ff;
  --ink:#0f172a; --muted:#64748b; --bg:#f8f7ff;
}
*{box-sizing:border-box}
body{font-family:'Inter','Poppins',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}

/* Layout */
.admin-layout{display:flex; min-height:100vh; background:
  radial-gradient(1200px 400px at 80% -120px, rgba(124,58,237,.06), transparent 60%), var(--bg);}

/* Sidebar */
.sidebar{width:240px; background:#fff; border-right:1px solid #e2e8f0; position:sticky; top:0; height:100vh; padding:14px; z-index:40}
.sidebar h3{margin:0 0 10px; font-weight:800; font-size:18px}
.menu-item{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:#475569; font-weight:600; text-decoration:none; margin-bottom:6px; font-size:14px}
.menu-item:hover{ background:#f3f0ff; color:var(--primary) }
.menu-item.active{ background:#f3f0ff; color:var(--primary) }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; cursor:pointer }

/* Content */
.content{flex:1; padding:20px; max-width:1200px; margin:0 auto; width:100%}
.topbar{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px}
.brand{display:flex; align-items:center; gap:10px}
.brand-title{font-size:26px; font-weight:900; color:var(--ink)}
.subtitle{color:var(--muted); font-size:14px}

/* Card & grid (hoverable) */
.card{background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 6px 18px rgba(0,0,0,.06)}
.stat-card{padding:16px; min-height:96px}
.grid{display:grid; gap:14px}
.grid-4{grid-template-columns:repeat(4,1fr)}
.grid-3{grid-template-columns:repeat(3,1fr)}
.grid-2{grid-template-columns:repeat(2,1fr)}
.hoverable{transition:transform .18s ease, box-shadow .18s ease}
.hoverable:hover{transform:translateY(-4px); box-shadow:0 14px 28px rgba(124,58,237,.18)}

/* Icons */
.icon-wrap{width:40px; height:40px; display:inline-flex; align-items:center; justify-content:center; border-radius:10px; background:var(--primary-50); color:var(--primary)}

/* ===== Chart (responsive, mobile-safe) ===== */
.chart-card-title{font-weight:800; color:#0f172a}
.chart-wrap{position:relative; height:260px; padding:12px 10px 36px 48px; overflow:hidden}
.chart-grid, .chart-bars{position:absolute; left:48px; right:8px}
.chart-grid{top:10px; bottom:40px}
.grid-line{position:absolute; left:0; right:0; height:1px; background:rgba(148,163,184,.28)}
.y-labels{position:absolute; left:0; top:6px; bottom:40px; width:44px; display:flex; flex-direction:column; justify-content:space-between; color:#94a3b8; font-size:12px; text-align:right; padding-right:6px}
.chart-bars{top:10px; bottom:40px; display:flex; align-items:flex-end; justify-content:space-between}
.bar{width:26px; max-width:44px; background:linear-gradient(180deg,var(--primary),#a78bfa); border-radius:6px; box-shadow:0 8px 18px rgba(124,58,237,.22)}
.bar-value{position:absolute; transform:translate(-50%, -8px); font-size:12px; color:#0f172a; font-weight:700; white-space:nowrap}

/* Sumbu-X terpisah (anti overflow) */
.x-labels{position:absolute; left:48px; right:8px; bottom:8px; display:flex; justify-content:space-between; font-size:12px; color:#475569}

/* Mobile tweaks */
@media (max-width: 420px){
  .chart-wrap{height:220px; padding:8px 8px 40px 40px}
  .y-labels{width:36px; font-size:11px}
  .bar{width:18px}
  .bar-value{font-size:11px}
  .x-labels{font-size:11px}
}

/* Role tiles */
.role-tile{position:relative; overflow:hidden; border:1px solid #e9d5ff; border-radius:12px; padding:12px; background:
  radial-gradient(80% 120% at -10% -20%, #ede9fe 0%, transparent 60%), #ffffff; transition:transform .18s ease, box-shadow .18s ease}
.role-tile:hover{transform:translateY(-3px); box-shadow:0 12px 24px rgba(124,58,237,.16)}
.role-title{font-size:12px; color:#475569; font-weight:600}
.role-value{font-size:22px; font-weight:900; color:#111827}
.prog{height:8px; border-radius:999px; background:#efeafe; overflow:hidden; margin-top:8px}
.prog > span{display:block; height:100%; background:linear-gradient(90deg, var(--primary), #a78bfa)}

/* Table */
.table{width:100%; border-collapse:separate; border-spacing:0 8px}
.tr{background:#fff; border:1px solid #e5e7eb; border-radius:12px}
.th, .td{padding:10px 12px; text-align:left; font-size:14px}
.th{color:#475569; font-weight:700}
.td{color:#0f172a}

.cta{padding:16px; display:flex; flex-direction:column; justify-content:space-between; min-height:148px; background:
 linear-gradient(180deg, rgba(124,58,237,.06), transparent 38%), #fff}
 
/* Buttons (lebih kecil) */
.btn{display:inline-flex; align-items:center; gap:8px; border-radius:10px; padding:10px 14px; font-weight:600; font-size:14px; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:var(--primary)}
.btn-sm{padding:8px 12px; font-size:13px; font-weight:600}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary-600)); color:#fff; border-color:transparent; box-shadow:0 10px 24px rgba(124,58,237,.22)}
.btn:hover{filter:saturate(1.02) brightness(.98)}

/* Alerts */
.alert{display:flex; align-items:flex-start; gap:8px; padding:10px 12px; border-radius:12px; border:1px solid}
.alert.success{background:#f0fdf4; border-color:#86efac; color:#166534}
.alert.error{background:#fef2f2; border-color:#fecaca; color:#991b1b}

/* Modal (form lebih rapi) */
.modal{position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:50}
.modal-content{background:#fff; width:min(92vw,720px); border:1px solid #e5e7eb; border-radius:16px; padding:16px}
.form-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:12px}
@media (max-width: 920px){ .form-grid{grid-template-columns:repeat(2,1fr)} }
@media (max-width: 560px){ .form-grid{grid-template-columns:1fr} }
.field{display:flex; flex-direction:column; gap:6px}
.field-label{display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:#334155}
.input{width:100%; border:1px solid #cbd5e1; border-radius:12px; padding:12px 14px; font:inherit; outline:none; background:#f8fafc}
.input:focus{border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15)}
.form-actions{display:flex; justify-content:flex-end; gap:10px; margin-top:8px}

/* Responsive */
.hamburger{display:none; border:1px solid #e2e8f0; border-radius:10px; background:#fff; padding:8px}
.hamburger:hover{ background:#f8fafc }
@media (max-width: 768px){
  .sidebar{position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease}
  .sidebar.open{transform:translateX(0)}
  .hamburger{display:inline-flex}
  .grid-4{grid-template-columns:repeat(2,1fr)}
  .grid-3{grid-template-columns:1fr}
}
      `}</style>

      <div className="admin-layout">
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
          <div className="topbar">
            <div className="brand">
              <button
                className="hamburger"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="brand-title">Dashboard</div>
              <Pill>Admin</Pill>
            </div>

            <button className="btn btn-primary btn-sm" onClick={openAddUser}>
              <UserPlus size={16} /> Add User
            </button>
          </div>

          <div className="subtitle">Overview of users and activity.</div>

          {msg && (
            <div className={`alert ${msg.type}`} style={{ marginTop: 12 }}>
              {msg.type === "success" ? (
                <CheckCircle2 size={18} />
              ) : (
                <XCircle size={18} />
              )}
              <div>{msg.text}</div>
            </div>
          )}

          {/* Overview */}
          <div className="grid grid-4" style={{ marginTop: 14 }}>
            <StatCard
              icon={<Shield size={18} />}
              label="Total Users"
              value={loading ? "…" : stats.total}
            />
            <StatCard
              icon={<Users size={18} />}
              label="Students"
              value={loading ? "…" : stats.students}
            />
            <StatCard
              icon={<Users size={18} />}
              label="Lecturers"
              value={loading ? "…" : stats.lecturers}
            />
            <StatCard
              icon={<Users size={18} />}
              label="Admins"
              value={loading ? "…" : stats.admins}
            />
          </div>

          {/* Chart + Role Breakdown */}
          <div className="grid grid-2" style={{ marginTop: 14 }}>
            {/* Weekly Signups */}
            <div className="card hoverable" style={{ padding: 12 }}>
              <div className="flex items-center justify-between mb-1">
                <div className="chart-card-title">Weekly Signups</div>
                <div className="text-[12px] text-slate-500">last 7 days</div>
              </div>
              <div className="text-[12px] text-slate-600 mb-2">
                New accounts per day • <b>Total</b> {totalWeekly} • <b>Avg</b>{" "}
                {avgWeekly}/day
              </div>

              <div className="chart-wrap">
                {/* Y labels */}
                <div className="y-labels">
                  {yTicks
                    .slice()
                    .reverse()
                    .map((t, i) => (
                      <div key={i}>{t}</div>
                    ))}
                </div>

                {/* Grid lines */}
                <div className="chart-grid">
                  {yTicks.map((_, i) => (
                    <div
                      key={i}
                      className="grid-line"
                      style={{ top: `${(i * 100) / 4}%` }}
                    />
                  ))}
                </div>

                {/* Bars */}
                <div className="chart-bars">
                  {stats.weekly.map((d, i) => {
                    const heightPct = Math.min(
                      100,
                      ((Number(d.value) || 0) / niceMax) * 100
                    );
                    return (
                      <div
                        key={i}
                        style={{
                          position: "relative",
                          flex: 1,
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          className="bar"
                          style={{
                            height: `${heightPct}%`,
                            alignSelf: "flex-end",
                          }}
                        />
                        {/* angka di atas bar */}
                        <div
                          className="bar-value"
                          style={{
                            left: "50%",
                            bottom: `calc(${heightPct}% + 24px)`,
                          }}
                        >
                          {d.value}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X-axis labels (aman di mobile) */}
                <div className="x-labels">
                  {stats.weekly.map((d, i) => (
                    <span key={i}>{d.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Role breakdown */}
            <div className="card hoverable" style={{ padding: 14 }}>
              <div className="chart-card-title">Role Breakdown</div>
              <div className="grid grid-3">
                {[
                  {
                    k: "students",
                    label: "Students",
                    icon: <Users size={16} />,
                  },
                  {
                    k: "lecturers",
                    label: "Lecturers",
                    icon: <Users size={16} />,
                  },
                  { k: "admins", label: "Admins", icon: <Users size={16} /> },
                ].map(({ k, label, icon }) => {
                  const count = stats[k] || 0;
                  const pct = Math.round((count / totalPeople) * 100);
                  return (
                    <div key={k} className="role-tile">
                      <div className="flex items-center gap-2">
                        <div
                          className="icon-wrap"
                          style={{ width: 30, height: 30 }}
                        >
                          {icon}
                        </div>
                        <div className="role-title">{label}</div>
                      </div>
                      <div className="mt-1 role-value">{count}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {pct}% of users
                      </div>
                      <div className="prog">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Latest users */}
          <div
            className="card hoverable"
            style={{ padding: 14, marginTop: 14 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="chart-card-title">Latest Users</div>
              <button
                className="btn btn-sm"
                onClick={() => navigate("/admin/users")}
              >
                Manage Users <ChevronRight size={16} />
              </button>
            </div>

            <table className="table">
              <thead>
                <tr className="tr">
                  <th className="th">Name</th>
                  <th className="th">Email</th>
                  <th className="th">Role</th>
                </tr>
              </thead>
              <tbody>
                {stats.latest.length === 0 ? (
                  <tr className="tr">
                    <td className="td" colSpan={3} style={{ color: "#64748b" }}>
                      No data.
                    </td>
                  </tr>
                ) : (
                  stats.latest.map((u) => (
                    <tr key={u.id} className="tr">
                      <td className="td">{u.name}</td>
                      <td className="td">{u.email}</td>
                      <td className="td">
                        <Pill>{toRoleLabel(u.role)}</Pill>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Quick actions (judul ditebalkan) */}
          <div className="grid grid-3" style={{ marginTop: 14 }}>
            <div className="card hoverable cta">
              <div>
                <div className="chart-card-title">Users</div>
                <div className="text-lg font-extrabold text-slate-900">
                  Manage Users
                </div>
              </div>
              <div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate("/admin/users")}
                >
                  <Users size={16} /> Open Users
                </button>
              </div>
            </div>

            <div className="card hoverable cta">
              <div>
                <div className="chart-card-title">Analytics</div>
                <div className="text-lg font-extrabold text-slate-900">
                  User Progress
                </div>
              </div>
              <div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate("/admin/progress")}
                >
                  <BarChart2 size={16} /> View Progress
                </button>
              </div>
            </div>

            <div className="card hoverable cta">
              <div>
                <div className="chart-card-title">Learning</div>
                <div className="text-lg font-extrabold text-slate-900">
                  CEFR Modules
                </div>
              </div>
              <div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate("/lecture/cefr")}
                >
                  <BookOpen size={16} /> Open Modules
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Add User (rapi) */}
      {showAdd && (
        <div className="modal" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-extrabold text-slate-900">
                Add User
              </div>
              <Pill>Admin</Pill>
            </div>

            <form onSubmit={submitUser}>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">
                    <Shield size={14} /> Name
                  </label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Full name"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <Mail size={14} /> Email
                  </label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="you@example.com"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <KeyRound size={14} /> Password
                  </label>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <div className="field">
                  <label className="field-label">
                    <Users size={14} /> Role
                  </label>
                  <select
                    className="input"
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value }))
                    }
                  >
                    <option value="mahasiswa">Student</option>
                    <option value="dosen">Lecture</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingUser}
                >
                  {savingUser ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

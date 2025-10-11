// src/pages/admin/ManageUsers.jsx
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
  Shield,
  Mail,
  KeyRound,
  Trash2,
  UserCog,
  Loader2,
  Search,
  ChevronRight,
  Download,
  Printer,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

/* ----- Config & helpers ----- */
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () =>
  localStorage.getItem("token") || localStorage.getItem("accessToken") || "";

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
  Accept: "application/json",
  "Content-Type": "application/json",
});

const roleToBadge = (r) =>
  r === "mahasiswa" ? "STUDENT" : r === "dosen" ? "LECTURE" : "ADMIN";

/* ----- Small UI ----- */
const Pill = ({ children }) => (
  <span
    className="inline-flex items-center border rounded-full border-violet-200 bg-violet-50 text-violet-700"
    style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px" }}
  >
    {children}
  </span>
);

export default function ManageUsers() {
  const navigate = useNavigate();

  /* layout / sidebar */
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all"); // all | mahasiswa | dosen | admin

  // modal (add / edit)
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "mahasiswa",
  });
  // optional reset password (untuk edit)
  const [resetPwd, setResetPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* ======= STYLES ======= */
  useEffect(() => {
    document.title = "Manage Users";
  }, []);
  const Styles = (
    <style>{`
:root{ --primary:#7c3aed; --primary-600:#6d28d9; --primary-50:#f5f3ff; --ink:#0f172a; --muted:#64748b; --bg:#f8f7ff }
*{box-sizing:border-box}
body{font-family:'Inter','Poppins',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}

/* Admin layout + sidebar (match dashboard) */
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

/* Headings + breadcrumb */
.h1{font-size:26px; font-weight:900; color:var(--ink)}
.sub{color:var(--muted); font-size:14px}
.breadcrumb{display:flex; align-items:center; gap:8px; color:#64748b; font-size:13px; margin:6px 0 8px}
.breadcrumb b{color:#0f172a}

/* Cards, buttons, inputs */
.card{background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 6px 18px rgba(0,0,0,.06)}
.hoverable{transition:transform .18s ease, box-shadow .18s ease}
.hoverable:hover{transform:translateY(-2px); box-shadow:0 14px 28px rgba(124,58,237,.18)}
.btn{display:inline-flex; align-items:center; gap:8px; border-radius:10px; padding:10px 14px; font-weight:600; font-size:14px; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:var(--primary)}
.btn-sm{padding:8px 12px; font-size:13px}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary-600)); color:#fff; border-color:transparent; box-shadow:0 10px 24px rgba(124,58,237,.22)}
.input{width:100%; border:1px solid #cbd5e1; border-radius:12px; padding:10px 12px; font:inherit; outline:none; background:#f8fafc}
.input:focus{border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15)}
.select{appearance:none}

/* Toolbar */
.toolbar{display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:14px}
.search{display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:8px 10px; min-width:260px}
.filters{display:flex; align-items:center; gap:8px; flex-wrap:wrap}

/* Table */
.table-wrap{margin-top:14px; overflow:auto}
.table{width:100%; border-collapse:separate; border-spacing:0 8px}
.tr{background:#fff; border:1px solid #e5e7eb; border-radius:12px}
.th, .td{padding:12px 14px; text-align:left; font-size:14px}
.th{color:#475569; font-weight:700}
.td{color:#0f172a}
.actions{display:flex; gap:8px; align-items:center}

/* Chips */
.chip{border:1px solid #e5e7eb; background:#fff; color:#475569; padding:8px 12px; border-radius:999px; font-size:13px; font-weight:600; cursor:pointer}
.chip.active{background:#f3f0ff; color:var(--primary); border-color:#e9d5ff}

/* Pagination */
.pager{display:flex; justify-content:flex-end; gap:8px; align-items:center; margin-top:12px}
.pager .btn{min-width:82px}

/* Modal */
.modal{position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:50}
.modal-content{background:#fff; width:min(92vw,760px); border:1px solid #e5e7eb; border-radius:16px; padding:16px}
.form-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:12px}
@media (max-width: 920px){ .form-grid{grid-template-columns:repeat(2,1fr)} }
@media (max-width: 560px){ .form-grid{grid-template-columns:1fr} }
.field{display:flex; flex-direction:column; gap:6px}
.field-label{display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:#334155}
.form-actions{display:flex; justify-content:flex-end; gap:10px; margin-top:8px}
.badge{font-size:12px; font-weight:600; color:#334155; background:#eef2ff; border:1px solid #c7d2fe; padding:4px 8px; border-radius:999px}
.err{margin-top:10px; padding:10px 12px; border-radius:12px; border:1px solid #fecaca; background:#fef2f2; color:#991b1b}

/* Responsive sidebar like dashboard */
@media (max-width: 768px){
  .sidebar{position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease}
  .sidebar.open{transform:translateX(0)}
  .hamburger{display:inline-flex}
}
    `}</style>
  );

  /* ======= DATA ======= */
  const fetchUsers = async (roleFilter = role) => {
    setLoading(true);
    setErr(null);
    try {
      const url =
        roleFilter && roleFilter !== "all"
          ? `${BASE_URL}/api/users?role=${encodeURIComponent(roleFilter)}`
          : `${BASE_URL}/api/users`;
      const r = await fetch(url, { headers: authHeaders() });
      if (!r.ok) throw new Error(`Failed to load users (${r.status})`);
      const j = await r.json();
      setUsers(Array.isArray(j) ? j : []);
    } catch (e) {
      setErr(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers("all");
  }, []);

  // client-side search
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      if (!term) return true;
      return (
        (u.name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term)
      );
    });
  }, [users, q]);

  // pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* ======= ACTIONS ======= */
  const handleLogout = () => {
    try {
      localStorage.clear();
    } finally {
      navigate("/");
    }
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Delete user "${u.name}" ?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`${BASE_URL}/api/users/${u.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || "Failed to delete");
      setUsers((arr) => arr.filter((x) => x.id !== u.id));
    } catch (e) {
      alert(e.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  // CREATE user (admin only) -> POST /api/users
  const createUser = async ({ name, email, password, role }) => {
    const payload = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      role,
    };
    const r = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg =
        j?.message ||
        (j?.errors
          ? Object.values(j.errors).flat().join(", ")
          : `HTTP ${r.status}`);
      throw new Error(msg);
    }
    return j; // data user baru
  };

  // UPDATE user -> PUT /api/users/:id
  const updateUser = async (id, body) => {
    const r = await fetch(`${BASE_URL}/api/users/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg =
        j?.message ||
        (j?.errors
          ? Object.values(j.errors).flat().join(", ")
          : `HTTP ${r.status}`);
      throw new Error(msg);
    }
    return j; // data user ter‐update
  };

  // open add/edit modals
  const openAdd = () => {
    setModalMode("add");
    setEditingId(null);
    setForm({ name: "", email: "", password: "", role: "mahasiswa" });
    setResetPwd(false);
    setCurrentPwd("");
    setNewPwd("");
    setNewPwd2("");
    setShowModal(true);
  };
  const openEdit = (u) => {
    setModalMode("edit");
    setEditingId(u.id);
    setForm({
      name: u.name || "",
      email: u.email || "",
      password: "",
      role: u.role || "mahasiswa",
    });
    setResetPwd(false);
    setCurrentPwd("");
    setNewPwd("");
    setNewPwd2("");
    setShowModal(true);
  };

  // submit (create/update)
  const submitModal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === "add") {
        if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
          throw new Error("Name, email, and password are required.");
        }
        await createUser(form);
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role,
        };

        // (opsional) ganti password saat edit
        if (resetPwd) {
          if (!currentPwd || !newPwd || !newPwd2) {
            throw new Error("Fill all password fields to reset password.");
          }
          if (newPwd !== newPwd2)
            throw new Error("New password confirmation does not match.");
          payload.current_password = currentPwd;
          payload.password = newPwd;
          payload.password_confirmation = newPwd2;
        }

        await updateUser(editingId, payload);
      }

      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "mahasiswa" });
      await fetchUsers(role);
    } catch (err) {
      alert(err.message || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  /* ======= EXPORT ======= */
  const exportCSV = () => {
    const rows = [["Name", "Email", "Role", "Created At"]];
    filtered.forEach((u) =>
      rows.push([
        u.name || "",
        u.email || "",
        roleToBadge(u.role),
        u.created_at || "",
      ])
    );
    const csv = rows
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Print-friendly HTML → user save as PDF
    const w = window.open("", "_blank");
    const html = `
<!doctype html><html><head><meta charset="utf-8">
<title>Users</title>
<style>
  body{font-family:Inter,Arial,sans-serif; padding:16px}
  h2{margin:0 0 8px 0}
  table{width:100%; border-collapse:collapse; font-size:12px}
  th,td{border:1px solid #e5e7eb; padding:8px; text-align:left}
  th{background:#f3f4f6}
</style>
</head><body>
  <h2>Users</h2>
  <table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created At</th></tr></thead>
    <tbody>
      ${filtered
        .map(
          (u) =>
            `<tr><td>${u.name || ""}</td><td>${
              u.email || ""
            }</td><td>${roleToBadge(u.role)}</td><td>${
              u.created_at || ""
            }</td></tr>`
        )
        .join("")}
    </tbody>
  </table>
  <script>window.onload=() => window.print()</script>
</body></html>`;
    w.document.write(html);
    w.document.close();
  };

  /* ======= RENDER ======= */
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
                end={to === "/admin"} // ⬅️ exact match hanya untuk Dashboard
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
              <div className="h1">Manage Users</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-sm"
                onClick={exportCSV}
                title="Export CSV"
              >
                <Download size={16} /> CSV
              </button>
              <button
                className="btn btn-sm"
                onClick={exportPDF}
                title="Print / PDF"
              >
                <Printer size={16} /> PDF
              </button>
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <Plus size={16} /> Add User
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <NavLink
              to="/admin"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Dashboard
            </NavLink>
            <ChevronRight size={14} />
            <b>Manage Users</b>
          </div>

          <div className="sub">
            Create, search, filter, update, and delete users.
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
              {[
                { k: "all", label: "All" },
                { k: "mahasiswa", label: "Students" },
                { k: "dosen", label: "Lecturers" },
                { k: "admin", label: "Admins" },
              ].map((f) => (
                <button
                  key={f.k}
                  className={`chip ${role === f.k ? "active" : ""}`}
                  onClick={() => {
                    setRole(f.k);
                    setPage(1);
                    fetchUsers(f.k);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {err ? <div className="err">{err}</div> : null}

          {/* Table */}
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
                <Loader2 className="animate-spin" size={18} /> Loading users…
              </div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr className="tr">
                      <th className="th">Name</th>
                      <th className="th">Email</th>
                      <th className="th">Role</th>
                      <th className="th" style={{ width: 200 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 ? (
                      <tr className="tr">
                        <td
                          className="td"
                          colSpan={4}
                          style={{ color: "#64748b" }}
                        >
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      pageData.map((u) => (
                        <tr className="tr" key={u.id}>
                          <td className="td">{u.name}</td>
                          <td className="td">{u.email}</td>
                          <td className="td">
                            <Pill>{roleToBadge(u.role)}</Pill>
                          </td>

                          <td className="td">
                            <div className="actions">
                              <button
                                className="btn btn-sm"
                                onClick={() => openEdit(u)}
                                title="Update"
                              >
                                <UserCog size={16} /> Update
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => removeUser(u)}
                                disabled={busy}
                                title="Delete"
                              >
                                <Trash2 size={16} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
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
        </main>
      </div>

      {/* Add / Edit Modal (prefill on edit) */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div className="h1" style={{ fontSize: 18 }}>
                {modalMode === "add" ? "Add User" : "Update User"}
              </div>
              <Pill>Admin</Pill>
            </div>

            <form onSubmit={submitModal}>
              <div className="form-grid">
                <div className="field">
                  <label className="field-label">
                    <Shield size={14} /> Name
                  </label>
                  <input
                    className="input"
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="field">
                  <label className="field-label">
                    <Mail size={14} /> Email
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                {modalMode === "add" ? (
                  <div className="field">
                    <label className="field-label">
                      <KeyRound size={14} /> Password
                    </label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Minimal 6 characters"
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                    />
                  </div>
                ) : (
                  <div className="field">
                    <label className="field-label">
                      <Users size={14} /> Role
                    </label>
                    <select
                      className="input select"
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
                )}

                {modalMode === "add" ? (
                  <div className="field">
                    <label className="field-label">
                      <Users size={14} /> Role
                    </label>
                    <select
                      className="input select"
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
                ) : (
                  <div className="field">
                    <label className="field-label">
                      <KeyRound size={14} /> Password Reset (optional)
                    </label>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input
                        type="checkbox"
                        checked={resetPwd}
                        onChange={(e) => setResetPwd(e.target.checked)}
                      />
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        Enable to change password (requires current password).
                      </span>
                    </div>
                  </div>
                )}

                {/* Optional password reset fields when editing */}
                {modalMode === "edit" && resetPwd && (
                  <>
                    <div className="field">
                      <label className="field-label">Current Password</label>
                      <input
                        className="input"
                        type="password"
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">New Password</label>
                      <input
                        className="input"
                        type="password"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">
                        Confirm New Password
                      </label>
                      <input
                        className="input"
                        type="password"
                        value={newPwd2}
                        onChange={(e) => setNewPwd2(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

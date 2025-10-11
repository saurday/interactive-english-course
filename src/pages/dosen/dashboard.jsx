import React, { useEffect, useState } from "react";
import {
  Home,
  BookOpen,
  Settings,
  LogOut,
  Plus,
  Menu,
  MoreVertical,
  Pencil,
  Trash2,
  AlertTriangle,
  BarChart2,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { get, post, put, del, ApiError } from "@/config/api";

const sidebarMenuDosen = [
  { label: "Dashboard", icon: <Home size={18} />, to: "/lecture" },
  { label: "CEFR Modules", icon: <BookOpen size={18} />, to: "/lecture/cefr" },
  { label: "Reports", icon: <BarChart2 size={18} />, to: "/lecture/reports" },
  { label: "Settings", icon: <Settings size={18} />, to: "/lecture/settings" },
  { label: "Logout", icon: <LogOut size={18} />, action: "logout" },
];

const CACHE_KEY = "classes_cache_dosen";

export default function DosenDashboard() {
  const navigate = useNavigate();

  // ===== STATE =====
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState("create"); // 'create' | 'edit'
  const [formTitle, setFormTitle] = useState("");
  const [editingClass, setEditingClass] = useState(null);
  const [newClassCode, setNewClassCode] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // hamburger (mobile)
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);


  // ===== Sync state + cache =====
  const syncCache = (next) => {
    setClasses(next);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next || []));
    } catch {
      /* ignore */
    }
  };

  // ===== Hydrate dari cache -> refresh dari server =====
  useEffect(() => {
    // 1) tampilkan cache jika ada (biar instan)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setClasses(Array.isArray(parsed) ? parsed : []);
      } catch {
        /* ignore */
      }
    }

    // 2) refresh ke server
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await get("/kelas");
        syncCache(Array.isArray(data) ? data : []);
     } catch (e) {
   setError(e instanceof ApiError ? e.message : e?.message || "Failed to load classes");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Tutup dropdown kebab saat klik di luar / tekan ESC
  useEffect(() => {
    if (!openMenu) return;
    const onDocClick = (e) => {
      const t = e.target;
      const insideMenu = t.closest(".dropdown");
      const onButton = t.closest(".menu-btn");
      if (!insideMenu && !onButton) setOpenMenu(null);
    };
    const onEsc = (e) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("mousedown", onDocClick, true);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick, true);
      document.removeEventListener("keydown", onEsc);
    };
  }, [openMenu]);

  // Kunci scroll body saat modal terbuka
  useEffect(() => {
    const open = showForm || confirmDeleteOpen;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForm, confirmDeleteOpen]);

  const toggleMenu = (id) => setOpenMenu(openMenu === id ? null : id);

  // ===== OPEN MODALS =====
  const openCreate = () => {
    setFormMode("create");
    setFormTitle("");
    setEditingClass(null);
    setShowForm(true);
  };
  const openEdit = (cls) => {
    setFormMode("edit");
    setFormTitle(cls.nama_kelas || "");
    setEditingClass(cls);
    setShowForm(true);
    setOpenMenu(null);
  };

  // ===== SUBMIT CREATE / UPDATE =====
  const submitForm = async () => {
    const title = formTitle.trim();
    if (!title) return;
    try {
      if (formMode === "create") {
        const kelas = await post("/kelas", { nama_kelas: title });
        const next = [...classes, kelas];
        syncCache(next);
        setNewClassCode(kelas.kode_kelas);
      } else {
       const updated = await put(`/kelas/${editingClass.id}`, { nama_kelas: title });
        const next = classes.map((c) =>
          c.id === editingClass.id ? updated : c
        );
        syncCache(next);
      }
      setShowForm(false);
    } catch (err) {
      alert(
        `${formMode === "create" ? "Create" : "Update"} error: ${err.message}`
      );
    }
  };

  // ===== DELETE =====
  const handleDelete = async (id) => {
    try {
      await del(`/kelas/${id}`);
      const next = classes.filter((c) => c.id !== id);
      syncCache(next);
    } catch (err) {
      alert("Error deleting class: " + err.message);
    }
  };

  // ===== LOGOUT =====
  const handleLogout = (e) => {
    e?.preventDefault?.();
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("classes_cache_dosen");
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("resources:") || k.startsWith("comments:"))) {
        keys.push(k);
      }
    }
    keys.forEach((k) => localStorage.removeItem(k));
    localStorage.clear();
    navigate("/");
  };

  return (
    <>
      {/* ====== STYLES (UI versi baru, aman untuk Vite) ====== */}
      <style>{`


/* ====== STYLES (UI versi baru, aman untuk Vite) ====== */
:root{
  --primary:#7c3aed; --primary-50:#f5f3ff; --ink:#1f2937; --muted:#64748b; --bg:#f8f7ff;
}

body{
  font-family:'Inter','Poppins',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
}

.dashboard-container{
  display:flex; min-height:100vh; background:
    radial-gradient(1200px 400px at 80% -100px, rgba(124,58,237,.06), transparent 60%),
    var(--bg);
}

/* ===== Sidebar (samakan dgn Settings) ===== */
.sidebar{
  width:240px; background:#fff; border-right:1px solid #e2e8f0;
  padding:16px; position:sticky; top:0; height:100vh; z-index:950;
}
.sidebar-header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }

/* Reset link style di sidebar (hilangkan underline & warna visited) */

.menu-item{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:#475569; font-weight:600; text-decoration:none; margin-bottom:6px; font-size:14px}
.menu-item:hover{ background:#f3f0ff; color:var(--primary) }
.menu-item.active{ background:#f3f0ff; color:var(--primary) }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; cursor:pointer }


/* ===== Content & Typography (diperkecil) ===== */
.content{ flex:1; padding:24px; max-width:1400px; margin:0 auto; }
.content-header{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
.page-title{
  font-size:24px; font-weight:800; color:var(--ink); position:relative; padding-bottom:8px; margin:0;
}


/* ===== Grid ===== */
.class-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
@media (max-width:1200px){ .class-grid{ grid-template-columns:repeat(2,1fr); } }

/* ===== Card – putih aksen ungu ===== */
.class-card{
  position:relative; background:#fff;
  border:1px solid #e9d5ff; border-radius:14px; padding:18px;
  box-shadow:0 6px 20px rgba(124,58,237,.06);
  transition:transform .2s ease, box-shadow .2s ease; cursor:pointer;
}
.class-card::before{
  content:""; position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:14px 0 0 14px;
  background:linear-gradient(180deg,var(--primary),#a78bfa); opacity:.75;
}
.class-card:hover{ transform:translateY(-4px); box-shadow:0 10px 28px rgba(124,58,237,.15); }
.card-title{ margin:0; font-weight:800; color:#111827; font-size:16px; }
.card-sub{ margin:6px 0 0; color:var(--muted); font-size:13px; }

/* ===== Badge ===== */
.pill{
  display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:999px;
  font-weight:700; font-size:12px;
}
.code-pill{ background:var(--primary-50); color:var(--primary); border:1px solid #e9d5ff; }

/* ===== Buttons ===== */
.btn{
  padding:8px 14px; border-radius:10px; border:1px solid transparent;
  background:linear-gradient(135deg,var(--primary),#6d28d9); color:#fff; font-weight:700; cursor:pointer;
  box-shadow:0 6px 16px rgba(124,58,237,.25);
}
.btn:hover{ filter:saturate(1.05) brightness(.98); }
.btn-ghost{ background:#fff; color:var(--primary); border:1px solid #e9d5ff; }
.btn-ghost:hover{ background:#f6f5ff; }

/* ===== Kebab / Dropdown ===== */
.card-actions{ position:relative; }
.menu-btn{
  padding:6px; border-radius:10px; background:#fff; border:1px solid #e5e7eb;
  box-shadow:0 2px 6px rgba(0,0,0,.08);
}
.dropdown{
  position:absolute; right:0; top:36px; background:#fff; border:1px solid #e5e7eb; border-radius:12px;
  box-shadow:0 16px 30px rgba(0,0,0,.12); width:180px; overflow:hidden;
}
.dropdown button{ border:0; outline:0; background:transparent; width:100%; text-align:left; }
.dropdown-item{
  display:flex; align-items:center; gap:10px; padding:10px 12px; font-size:14px; color:#1f2937; cursor:pointer;
}
.dropdown-item:hover{ background:#f8fafc; }
.dropdown-sep{ height:1px; background:#e5e7eb; margin:0 8px; }
.dropdown-item.danger{ color:#dc2626; } 
.dropdown-item.danger:hover{ background:#fef2f2; }

/* ===== FAB & Visibility (desktop default) ===== */
.fab-add{
  position:fixed; right:18px; bottom:18px;
  background:linear-gradient(135deg,var(--primary),#6d28d9); color:#fff;
  width:52px; height:52px; border-radius:50%;
  display:none; align-items:center; justify-content:center;
  box-shadow:0 10px 26px rgba(124,58,237,.35); z-index:40;
}
.fab-add:hover{ filter:saturate(1.05) brightness(.98); }

.hamburger{
  border:1px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px;
  display:none; align-items:center; justify-content:center;
}
.hamburger:hover{ background:#f8fafc; }

.btn-top{ display:inline-flex; }

/* ===== Modal ===== */
.modal{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1000; }
.modal-content{
  background:#fff; width:min(92vw,480px); border-radius:14px; border:1px solid #e5e7eb;
  box-shadow:0 24px 60px rgba(0,0,0,.20); padding:20px; animation:pop .16s ease-out;
}
@keyframes pop{ from{ transform:scale(.96); opacity:0; } to{ transform:scale(1); opacity:1; } }
.modal-actions{ margin-top:16px; display:flex; justify-content:flex-end; gap:10px; }
.input{ width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; font-size:14px; }

/* ===== Backdrop ===== */
.backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:900; }

/* ===== Empty state ===== */
.empty-state{ text-align:center; margin-top:80px; color:#64748b; }

/* ===== MOBILE ===== */
@media (max-width:640px){
  .sidebar{
    position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%);
    transition:transform .25s ease;
  }
  .sidebar.open{ transform:translateX(0); }

  .content{ padding:10px 12px 84px; }
  .class-grid{ grid-template-columns:1fr; gap:14px; }
  .class-card{ margin-inline:2px; }

  .content-header{ gap:8px; }
  .page-title{ font-size:22px; }

  .hamburger{ display:inline-flex; } /* tampil hanya di mobile */
  .btn-top{ display:none; }          /* tombol “New Class” pindah ke FAB */
  .fab-add{ display:flex; }
}

`}</style>

      <div className="dashboard-container">
        {/* Backdrop (mobile) */}
        {isSidebarOpen && (
          <div className="backdrop" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h3 style={{ fontWeight: 700, margin: 0 }}>Lecturer</h3>
          </div>

          {sidebarMenuDosen.map(({ label, icon, to, action }) =>
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

        {/* ===== CONTENT ===== */}
        <main className="content">
          <div className="content-header">
            {/* kiri: hamburger + judul */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                className="hamburger"
                aria-label="Open menu"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={18} />
              </button>

              <h1 className="page-title" style={{ margin: 0 }}>
                My Class List
              </h1>
            </div>

            {/* kanan: tombol New Class (desktop only) */}
            <button className="btn btn-ghost btn-top" onClick={openCreate}>
              + New Class
            </button>
          </div>

          {/* FAB (mobile only via CSS) */}
          <button
            className="fab-add"
            onClick={openCreate}
            aria-label="Create class"
          >
            <Plus size={22} />
          </button>

          {isLoading ? (
            <div className="empty-state">Loading classes...</div>
          ) : error ? (
            <div className="empty-state" style={{ color: "#E53E3E" }}>
              Error: {error}
            </div>
          ) : classes.length === 0 ? (
            <div className="empty-state">
              <p>No classes available yet</p>
              <button className="btn" onClick={openCreate}>
                Create Class
              </button>
            </div>
          ) : (
            <div className="class-grid">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="class-card"
                  onClick={() => navigate(`/lecture/classes/${cls.id}`)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="card-title">{cls.nama_kelas}</h3>
                      <p className="card-sub">Lecturer: {cls.dosen?.name}</p>
                      <div style={{ marginTop: 6 }}>
                        <span className="pill code-pill">
                          Code: {cls.kode_kelas}
                        </span>
                      </div>
                    </div>

                    {/* actions */}
                    <div
                      className="card-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="menu-btn"
                        aria-label="Actions"
                        onClick={() => toggleMenu(cls.id)}
                      >
                        <MoreVertical size={18} />
                      </button>
                      {openMenu === cls.id && (
                        <div className="dropdown">
                          <button
                            className="dropdown-item"
                            onClick={() => openEdit(cls)}
                          >
                            <Pencil size={18} />
                            Edit
                          </button>
                          <div className="dropdown-sep" />
                          <button
                            className="dropdown-item danger"
                            onClick={() => {
                              setClassToDelete(cls);
                              setConfirmDeleteOpen(true);
                              setOpenMenu(null);
                            }}
                          >
                            <Trash2 size={18} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ===== Modal Create / Edit ===== */}
          {showForm && (
            <div className="modal" onClick={() => setShowForm(false)}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginTop: 0 }}>
                  {formMode === "create" ? "Create Class" : "Edit Class"}
                </h3>
                <input
                  type="text"
                  className="input"
                  placeholder="Class name"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
                <div className="modal-actions">
                  <button
                    className="btn-ghost"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn" onClick={submitForm}>
                    {formMode === "create" ? "Create" : "Update"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {newClassCode && (
            <div style={{ marginTop: 16, color: "#2d3748" }}>
              ✅ New class created with code: <b>{newClassCode}</b>
            </div>
          )}

          {/* ===== Modal Confirm Delete ===== */}
          {confirmDeleteOpen && classToDelete && (
            <div className="modal" onClick={() => setConfirmDeleteOpen(false)}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <h3
                  style={{
                    marginTop: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={18} color="#dc2626" />
                  Delete Class
                </h3>
                <p style={{ marginTop: 8, color: "#334155", lineHeight: 1.5 }}>
                  Are you sure you want to delete this class? This action cannot
                  be undone.
                </p>
                <div className="modal-actions">
                  <button
                    className="btn-ghost"
                    onClick={() => setConfirmDeleteOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn"
                    style={{ background: "#dc2626" }}
                    onClick={async () => {
                      await handleDelete(classToDelete.id);
                      setConfirmDeleteOpen(false);
                      setClassToDelete(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

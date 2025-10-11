// src/pages/lecture/ClassDetail.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Home,
  Folder,
  Settings,
  LogOut,
  ChevronRight,
  Users2,
  BookOpenText,
  PlusCircle,
  Trash2,
  MoreVertical,
  Pencil,
  Menu,
  BarChart2,
  BookOpen,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const sidebarMenuDosen = [
  { label: "Dashboard", icon: <Home size={18} />, to: "/lecture" },
  { label: "CEFR Modules", icon: <BookOpen size={18} />, to: "/lecture/cefr" },
  { label: "Reports", icon: <BarChart2 size={18} />, to: "/lecture/reports" },
  { label: "Settings", icon: <Settings size={18} />, to: "/lecture/settings" },
  { label: "Logout", icon: <LogOut size={18} />, action: "logout" },
];

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [klass, setKlass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const token = localStorage.getItem("token");

  // local store resources
  const [resources, setResources] = useState([]);
  const [showResModal, setShowResModal] = useState(false);

  // menu / edit / delete week
  const [menuOpenWeek, setMenuOpenWeek] = useState(null);
  const [editWeekNo, setEditWeekNo] = useState(null);
  const [deleteWeekNo, setDeleteWeekNo] = useState(null);

  const [students, setStudents] = useState([]);
  const [stuLoading, setStuLoading] = useState(false);
  const [stuErr, setStuErr] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setStuLoading(true);
      setStuErr(null);
      try {
        const list = await fetchClassStudents(id, token);
        setStudents(list);
      } catch (e) {
        setStuErr(e?.message || "Failed to load students");
      } finally {
        setStuLoading(false);
      }
    })();
  }, [id, token]);

  // Tutup week menu saat klik di luar atau tekan ESC
  useEffect(() => {
    if (menuOpenWeek === null) return;

    const close = () => setMenuOpenWeek(null);
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenWeek]);

  // responsive sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ======= FIX: pastikan meta viewport aktif (agar mobile tidak zoom-out) =======
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    // width=device-width membuat media query mobile bekerja sesuai Dashboard
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
    );
  }, []);
  // ============================================================================

  const getWeekIdByNumber = (weekNo) => {
    const first = resources.find(
      (r) => Number(r.week) === Number(weekNo) && r.weekId
    );
    return first?.weekId ?? null;
  };

  const load = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`${BASE_URL}/api/kelas/${id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.status === 404) {
        setErr("Class not found");
        setKlass(null);
        return;
      }
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setKlass(data);
    } catch (e) {
      setErr(e.message || "Failed to load class");
    } finally {
      setLoading(false);
    }
  };

  const resKey = (cid) => `resources:${cid}`;

  async function fetchWeeksForClass(classId, token) {
    try {
      const r = await fetch(`${BASE_URL}/api/kelas/${classId}/weeks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (r.status === 404) return [];
      if (!r.ok) throw new Error(`Failed to fetch weeks (${r.status})`);

      const data = await r.json();
      const weeksArr = Array.isArray(data) ? data : data.weeks || [];

      const items = [];
      weeksArr.forEach((w) => {
        const weekNo = w.week_number ?? w.week ?? null;
        const weekId = w.id ?? w.week_id ?? null;
        if (Array.isArray(w.resources) && w.resources.length) {
          w.resources.forEach((res) => {
            items.push({
              id: res.id,
              week: weekNo ?? res.week_number,
              weekId,
              type: res.type,
              title: res.title,
              text: res.text,
              videoUrl: res.video_url,
              fileUrl: res.file_url,
            });
          });
        } else if (weekNo != null) {
          items.push({
            id: `week-${weekNo}`,
            week: weekNo,
            weekId,
            type: "empty",
          });
        }
      });

      return items;
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async function fetchClassStudents(classId, token) {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    // 1) coba /students
    let r = await fetch(`${BASE_URL}/api/kelas/${classId}/students`, {
      headers,
    });

    // 2) fallback /mahasiswa kalau 404 atau payload tidak berisi data
    if (r.status === 404 || r.status === 405) {
      r = await fetch(`${BASE_URL}/api/kelas/${classId}/mahasiswa`, {
        headers,
      });
    }

    if (!r.ok) throw new Error(`Failed to load students (${r.status})`);

    const j = await r.json();

    // normalisasi berbagai bentuk payload:
    // - {students:[...]}, {mahasiswa:[...]}, atau langsung array
    const raw =
      (Array.isArray(j?.students) && j.students) ||
      (Array.isArray(j?.mahasiswa) && j.mahasiswa) ||
      (Array.isArray(j) && j) ||
      [];

    // beberapa API mengembalikan row join: {mahasiswa:{...}, joined_at:...}
    return raw.map((row, i) => {
      const m = row.mahasiswa || row.student || row.user || row; // fallback ke objek dalam

      return {
        id: m?.id ?? row.id ?? row.mahasiswa_id ?? row.student_id ?? `row-${i}`,
        name: m?.full_name ?? m?.nama_lengkap ?? m?.name ?? m?.nama ?? "-",
        email: m?.email ?? "",
        joinedAt: row.joined_at ?? row.created_at ?? m?.joined_at ?? null,
      };
    });
  }

  // 1) restore dari localStorage
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(resKey(id));
      setResources(raw ? JSON.parse(raw) : []);
    } catch {
      setResources([]);
    }
  }, [id]);

  // 2) header kelas
  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  // 3) weeks/resources dari backend
  useEffect(() => {
    if (!id) return;
    (async () => {
      const items = await fetchWeeksForClass(id, token);
      setResources(items);
      localStorage.setItem(resKey(id), JSON.stringify(items));
    })();
  }, [id, token]);

  // 4) sinkron ke localStorage saat berubah
  useEffect(() => {
    if (!id) return;
    localStorage.setItem(resKey(id), JSON.stringify(resources));
  }, [id, resources]);

  // lock scroll saat sidebar/modal terbuka
  useEffect(() => {
    const open =
      isSidebarOpen ||
      showResModal ||
      editWeekNo !== null ||
      deleteWeekNo !== null;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen, showResModal, editWeekNo, deleteWeekNo]);

  const handleLogout = (e) => {
    e.preventDefault();

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("classes_cache_dosen");

    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("resources:") || k.startsWith("comments:"))) {
        toDelete.push(k);
      }
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
    localStorage.clear();

    navigate("/");
  };

  const renameWeekLocally = (oldNo, newNo) => {
    setResources((prev) => {
      const next = prev.map((r) =>
        Number(r.week) === Number(oldNo) ? { ...r, week: Number(newNo) } : r
      );
      localStorage.setItem(resKey(id), JSON.stringify(next));
      return next;
    });
  };

  const removeWeekLocally = (no) => {
    setResources((prev) => {
      const next = prev.filter((r) => Number(r.week) !== Number(no));
      localStorage.setItem(resKey(id), JSON.stringify(next));
      return next;
    });
  };

  const apiRenameWeek = async (oldNo, newNo) => {
    const weekId = getWeekIdByNumber(oldNo);
    if (!weekId) throw new Error("Week Id not found.");
    const r = await fetch(`${BASE_URL}/api/weeks/${weekId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ week_number: Number(newNo) }),
    });
    if (!r.ok) throw new Error(`Failed to rename week (${r.status})`);
  };

  const apiDeleteWeek = async (no) => {
    const weekId = getWeekIdByNumber(no);
    if (!weekId) throw new Error("Week Id not found.");
    const r = await fetch(`${BASE_URL}/api/weeks/${weekId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`Failed to delete week (${r.status})`);
  };

  return (
    <>
      {/* ====== Styles: samakan feel dengan Dashboard, perbaiki mobile ====== */}
      <style>{`
:root{
  --primary:#7c3aed;
  --primary-700:#6b46c1;
  --primary-50:#f5f3ff;
  --ink:#1f2937;
  --muted:#64748b;
  --bg:#f8f7ff;
}

/* Fix global sizing di mobile */
*,
*::before,
*::after { box-sizing: border-box; }

html, body, #root { width:100%; height:100%; }
body{
  font-family:'Inter','Poppins',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  -webkit-text-size-adjust:100%;
  background:var(--bg);
  color:var(--ink);
  font-size:16px; /* sama seperti Dashboard */
  margin:0;
}

.layout{
  display:flex; min-height:100vh; width:100%;
  background:
    radial-gradient(1200px 400px at 80% -100px, rgba(124,58,237,.06), transparent 60%),
    var(--bg);
  overflow-x:hidden;
}

/* Sidebar (match Dashboard) */
.sidebar{
  width:240px; background:#fff; border-right:1px solid #e5e7eb; padding:16px;
  position:sticky; top:0; height:100vh; z-index:950;
}
.menu-item{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:#475569; font-weight:600; text-decoration:none; margin-bottom:6px; font-size:14px}
.menu-item:hover{ background:#f3f0ff; color:var(--primary) }
.menu-item.active{ background:#f3f0ff; color:var(--primary) }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; cursor:pointer }

/* Backdrop untuk sidebar mobile */
.backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:900; display:none; }
.backdrop.show{ display:block; }

/* Content */
.content{
  flex:1; padding:24px; max-width:1400px; margin:0 auto; width:100%; min-width:0;
}
.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin-bottom:12px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }
.crumb-sep{ opacity:.4; }

/* Cards */
.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; width:100%; }
.page-title{ font-size:28px; font-weight:800; color:var(--ink); margin:0 0 4px; }
.subtitle{ color:var(--muted); font-size:14px; }

/* Tabs & Buttons */
.tabs{ display:flex; gap:8px; margin:12px 0 16px; flex-wrap:wrap; }
.pill{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:999px;
  border:1px solid #e5e7eb; cursor:pointer; font-weight:700; color:#1f2937; background:#fff; }
.pill.active{ background:var(--primary); color:#fff; border-color:var(--primary); }

.btn{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; font-weight:700; cursor:pointer;
  border:1px solid #cbd5e1; background:#fff; }
.btn:hover { background:#f8fafc; }
        .btn-primary { background:#6b46c1; color:#fff; border-color:#6b46c1; }
        .btn-primary:hover { background:#553c9a; }
.btn-top{ display:inline-flex; }             /* desktop button */
@media (max-width:900px){ .btn-top{ display:none; } }

/* Week grid/cards */
.week-grid{ display:grid; gap:16px; grid-template-columns:repeat(4,minmax(220px,1fr)); width:100%; }
@media (max-width:1200px){ .week-grid{ grid-template-columns:repeat(3,minmax(220px,1fr)); } }
@media (max-width:900px){ .week-grid{ grid-template-columns:repeat(2,minmax(200px,1fr)); } }
@media (max-width:640px){ .week-grid{ grid-template-columns:1fr; } }

.week-card{
  position:relative; border-radius:14px; padding:18px; min-height:120px; cursor:pointer; width:100%;
  border:1px solid #e9d5ff; background:#fff; box-shadow:0 6px 20px rgba(124,58,237,.06);
  transition:transform .18s ease, box-shadow .18s ease;
}
.week-card::before{
  content:""; position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:14px 0 0 14px;
  background:linear-gradient(180deg,var(--primary),#a78bfa); opacity:.75;
}
.week-card{ min-width:0; } /* penting agar ellipsis bekerja di flex/grid */
.week-name{
  display:block;
  font-size:16px; font-weight:800; color:#111827;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* Week menu (three dots) */
.week-menu-btn{ position:absolute; top:10px; right:10px; border:0; background:#fff; cursor:pointer; padding:6px;
  border-radius:10px; border:1px solid #e5e7eb; box-shadow:0 2px 6px rgba(0,0,0,.08); }
.week-menu{ position:absolute; top:40px; right:10px; z-index:20; background:#fff; border:1px solid #e5e7eb; border-radius:12px;
  box-shadow:0 16px 30px rgba(0,0,0,.12); min-width:180px; overflow:hidden; }
.week-menu-item{ display:flex; align-items:center; gap:8px; width:100%; padding:10px 12px; border:0; background:#fff; text-align:left; cursor:pointer; }
.week-menu-item:hover{ background:#f8fafc; }

/* Modal (sama seperti page dashboard look) */
.modal{ position:fixed; inset:0; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(0,0,0,.45); z-index:1000; }
.modal-content{ width:100%; max-width:720px; background:#fff; border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,.20); max-height:90vh; display:flex; flex-direction:column; }
.modal-body{ padding:20px; overflow:auto; flex:1 1 auto; }
.modal-footer{ padding:12px 20px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:8px; background:#fff; position:sticky; bottom:0; }
.input,.select,.textarea{ width:97%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }
.input:focus,.select:focus,.textarea:focus{ border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15); }
.textarea{ min-height:110px; resize:vertical; }
.res-row{ border:1px dashed #e5e7eb; border-radius:12px; padding:12px; background:#fafafa; }
.week-input{ width:97%; }

/* Hamburger (match Dashboard) */
.hamburger{
  border:1px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px;
  display:none; align-items:center; justify-content:center;
}
.hamburger:hover{ background:#f8fafc; }

/* FAB New Week — hanya di mobile */
.fab-add-week{
  position:fixed; right:18px; bottom:18px; width:52px; height:52px; border-radius:50%;
  display:none; align-items:center; justify-content:center; cursor:pointer;
  background:linear-gradient(135deg,var(--primary),#6d28d9); color:#fff; border:0;
  box-shadow:0 10px 26px rgba(124,58,237,.35); z-index:800;
}
.fab-add-week:hover{ filter:saturate(1.05) brightness(.98); }
@media (max-width:900px){ .fab-add-week{ display:flex; } }

/* Mobile layout: sidebar slide-in & tighter paddings */
@media (max-width:640px){
  .sidebar{ position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease; }
  .sidebar.open{ transform:translateX(0); }
  .content{ padding:10px 12px 90px; }
  .hamburger{ display:inline-flex; }
  .breadcrumb{ gap:10px; }

  /* efek tekan/aksesibilitas umum */
.btn:active{ transform:translateY(1px); }
.btn[disabled]{ opacity:.6; cursor:not-allowed; }

/* pastikan primary tidak ikut memutih saat hover/active */
.btn.btn-primary:hover,
.btn.btn-primary:active{
  background:linear-gradient(135deg,var(--primary),#6d28d9);
  color:#fff;
  border-color:transparent;
  filter:saturate(1.05) brightness(.98);
}

/* fokus keyboard tetap terlihat */
.btn.btn-primary:focus-visible{
  outline:3px solid rgba(124,58,237,.35);
  outline-offset:2px;
}

.layout{ overflow-x:hidden; }
.content{ min-width:0; }  /* supaya anak-anak grid bisa ellipsis */

/* pastikan judul tidak berada di bawah tombol menu */
.week-card{ min-width:0; position:relative; }
.week-name{
  display:block;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  padding-right:48px;     /* ruang untuk tombol menu + gap */
  min-width:0;
  max-width:100%;
}
.table{
  width:100%;
  border-collapse: collapse;
  border:1px solid #e5e7eb;
  border-radius:12px;
  overflow:hidden;
}
.table thead th{
  background:#f8fafc;
  text-align:left;
  padding:10px 12px;
  font-weight:800;
  border-bottom:1px solid #e5e7eb;
  color:#334155;
}
.table tbody td{
  padding:10px 12px;
  border-top:1px solid #f1f5f9;
}
.table tbody tr:hover{
  background:#fafafa;
}



}
      `}</style>

      <div className="layout">
        {/* Backdrop (mobile) */}
        {isSidebarOpen && (
          <div
            className="backdrop show"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>Lecturer</h3>

          {sidebarMenuDosen.map(({ label, icon, to }) =>
            label === "Logout" ? (
              <button
                key={label}
                type="button"
                className="menu-item"
                onClick={handleLogout}
              >
                {icon}
                {label}
              </button>
            ) : (
              <Link
                key={label}
                to={to}
                className="menu-item"
                onClick={() => setIsSidebarOpen(false)}
              >
                {icon}
                {label}
              </Link>
            )
          )}
        </aside>

        {/* ===== CONTENT ===== */}
        <main className="content">
          {/* Breadcrumb + Hamburger */}
          <div className="breadcrumb">
            <button
              className="hamburger"
              aria-label="Open menu"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>

            <Link to="/lecture">Dashboard</Link>
            <ChevronRight className="crumb-sep" size={16} />
            <span>Class</span>
            <ChevronRight className="crumb-sep" size={16} />
            <span style={{ color: "#111827" }}>{klass?.nama_kelas || "…"}</span>
          </div>

          {loading ? (
            <div className="card">Loading class…</div>
          ) : err ? (
            <div className="card" style={{ color: "#dc2626" }}>
              {err} — <Link to="/lecture">go to dashboard</Link>
            </div>
          ) : !klass ? (
            <div className="card">No data.</div>
          ) : (
            <>
              {/* Header */}
              <div className="card" style={{ marginBottom: 16 }}>
                <h1 className="page-title">{klass.nama_kelas}</h1>
                <div className="subtitle">
                  Lecturer: <b>{klass?.dosen?.name || "-"}</b> &nbsp;•&nbsp;
                  Code: <b>{klass.kode_kelas}</b>
                </div>
              </div>

              {/* Tabs & content */}
              <div className="card">
                <Tabs
                  resources={resources}
                  students={students}
                  stuLoading={stuLoading}
                  stuErr={stuErr}
                  onAddResourceClick={() => setShowResModal(true)}
                  onOpenWeek={(w) =>
                    navigate(`/lecture/classes/${id}/weeks/${w}`)
                  }
                  onOpenMenu={(w) =>
                    setMenuOpenWeek((cur) => (cur === w ? null : w))
                  }
                  menuOpenWeek={menuOpenWeek}
                  onEditWeek={(w) => {
                    setMenuOpenWeek(null);
                    setEditWeekNo(w);
                  }}
                  onDeleteWeek={(w) => {
                    setMenuOpenWeek(null);
                    setDeleteWeekNo(w);
                  }}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* FAB New Week (mobile only) */}
      <button
        className="fab-add-week"
        onClick={() => setShowResModal(true)}
        aria-label="Add new week"
      >
        <PlusCircle size={22} />
      </button>

      {/* ===== Modal Add Resource / Create Week ===== */}
      {showResModal && (
        <CreateWeekModal
          onClose={() => setShowResModal(false)}
          onSave={(items) => {
            setResources((prev) => {
              const next = [...prev, ...items];
              localStorage.setItem(resKey(id), JSON.stringify(next));
              return next;
            });
            setShowResModal(false);
          }}
        />
      )}

      {/* ===== Modal Edit Week ===== */}
      {editWeekNo !== null && (
        <EditWeekModal
          initialWeek={editWeekNo}
          takenWeeks={[...new Set(resources.map((r) => Number(r.week)))]}
          onClose={() => setEditWeekNo(null)}
          onSave={async (newNo) => {
            const oldNo = editWeekNo;
            setEditWeekNo(null);
            const backup = resources;
            renameWeekLocally(oldNo, newNo);
            try {
              await apiRenameWeek(oldNo, newNo);
            } catch (e) {
              setResources(backup);
              localStorage.setItem(resKey(id), JSON.stringify(backup));
              alert(e?.message || "Failed to rename week.");
            }
          }}
        />
      )}

      {/* ===== Modal Delete Week ===== */}
      {deleteWeekNo !== null && (
        <ConfirmDeleteWeek
          week={deleteWeekNo}
          onClose={() => setDeleteWeekNo(null)}
          onConfirm={async () => {
            const w = deleteWeekNo;
            setDeleteWeekNo(null);
            const backup = resources;
            removeWeekLocally(w);
            try {
              await apiDeleteWeek(w);
            } catch (e) {
              setResources(backup);
              localStorage.setItem(resKey(id), JSON.stringify(backup));
              alert(e?.message || "Failed to delete week.");
            }
          }}
        />
      )}
    </>
  );
}

/* ====================== Tabs: Course / Students ====================== */
function Tabs({
  resources,
  students,
  stuLoading,
  stuErr,
  onAddResourceClick,
  onOpenWeek,
  onOpenMenu,
  menuOpenWeek,
  onEditWeek,
  onDeleteWeek,
}) {
  const [tab, setTab] = useState("course");
  const [q, setQ] = useState("");

  const weeks = useMemo(() => {
    const set = new Set(resources.map((r) => Number(r.week)));
    return Array.from(set).sort((a, b) => a - b);
  }, [resources]);

  const filtered = useMemo(() => {
    const needle = (q || "").toLowerCase().trim();
    if (!needle) return students || [];
    return (students || []).filter((s) =>
      [s.name, s.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [students, q]);

  return (
    <>
      <div className="tabs">
        <button
          className={`pill ${tab === "course" ? "active" : ""}`}
          onClick={() => setTab("course")}
        >
          <BookOpenText size={16} /> Course
        </button>
        <button
          className={`pill ${tab === "students" ? "active" : ""}`}
          onClick={() => setTab("students")}
        >
          <Users2 size={16} /> Students
        </button>

        {tab === "course" && (
          <button
            className="btn btn-primary btn-top"
            style={{ marginLeft: "auto" }} // hanya desktop
            onClick={onAddResourceClick}
          >
            <PlusCircle size={16} /> New Week
          </button>
        )}
      </div>

      {/* ========== CONTENT ========== */}

      {tab === "course" ? (
        weeks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 12px" }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              No weeks/resources yet
            </div>
            <div className="muted" style={{ marginBottom: 16 }}>
              Create your first week to start building this course.
            </div>
            <button
              className="btn btn-primary btn-top"
              onClick={onAddResourceClick}
            >
              <PlusCircle size={16} /> Create Week
            </button>
          </div>
        ) : (
          <div className="week-grid">
            {weeks.map((w) => {
              // ambil hanya judul pertama di minggu tsb
              const firstTitle =
                resources
                  .filter((r) => Number(r.week) === Number(w) && r.title)
                  .map((r) => (r.title || "").trim())
                  .find(Boolean) || "";

              const label = firstTitle ? ` - ${firstTitle}` : "";

              return (
                <div
                  key={w}
                  className="week-card"
                  onClick={() => onOpenWeek(w)}
                >
                  {/* title attr buat tooltip teks lengkap saat hover */}
                  <div className="week-name" title={`Week ${w}${label}`}>
                    Week {w}
                    {label}
                  </div>

                  <button
                    type="button"
                    className="week-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMenu(w);
                    }}
                    aria-label="Open week menu"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {menuOpenWeek === w && (
                    <div
                      className="week-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="week-menu-item"
                        onClick={() => onEditWeek(w)}
                      >
                        <Pencil size={16} /> Edit Week Number
                      </button>
                      <button
                        className="week-menu-item"
                        onClick={() => onDeleteWeek(w)}
                      >
                        <Trash2 size={16} /> Delete Week
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        // ========== STUDENTS TAB ==========
        <div>
          {stuErr && (
            <div style={{ color: "#dc2626", marginBottom: 8 }}>{stuErr}</div>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <input
              className="input"
              placeholder="Search name or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <div
              style={{ marginLeft: "auto", color: "#64748b", fontWeight: 600 }}
            >
              Total: {students?.length || 0}
            </div>
          </div>

          {stuLoading ? (
            <div className="muted">Loading students…</div>
          ) : filtered.length === 0 ? (
            <div className="muted">
              There are no students in this class yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    <th
                      style={{
                        width: 48,
                        textAlign: "right",
                        padding: "10px 8px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 8px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Nama
                    </th>

                    <th
                      style={{
                        width: 260,
                        textAlign: "left",
                        padding: "10px 8px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        width: 200,
                        textAlign: "left",
                        padding: "10px 8px",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      Joined at
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => (
                    <tr key={s.id ?? idx}>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "10px 8px",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #f1f5f9",
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {s.name || "-"}
                      </td>

                      <td
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        {s.email || "-"}
                      </td>
                      <td
                        style={{
                          padding: "10px 8px",
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        {s.joinedAt
                          ? new Date(s.joinedAt).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
// ===== Modal Add Resource / Create Week (COMPOSITE) =====
function CreateWeekModal({ onClose, onSave }) {
  const { id: classId } = useParams();
  const token = localStorage.getItem("token");

  const [saving, setSaving] = useState(false);
  const [week, setWeek] = useState("");

  // setiap baris bisa include Text/Video/File sekaligus (composite)
  const [rows, setRows] = useState([
    {
      id: 1,
      title: "",
      includeText: true,
      text: "",
      includeVideo: false,
      videoUrl: "",
      includeFile: false,
      file: null,
      fileUrl: "",
    },
  ]);

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        id: Date.now(),
        title: "",
        includeText: false,
        text: "",
        includeVideo: false,
        videoUrl: "",
        includeFile: false,
        file: null,
        fileUrl: "",
      },
    ]);

  const removeRow = (id) => setRows((r) => r.filter((x) => x.id !== id));
  const updateRow = (id, patch) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // helper bikin 1 composite resource ke /api/weeks/:weekId/resources
  async function createCompositeResource(weekId, row) {
    const fd = new FormData();
    fd.append("type", "composite");
    fd.append("title", row.title || "");
    if (row.includeText) fd.append("text", row.text || "");
    if (row.includeVideo) fd.append("video_url", row.videoUrl || "");
    if (row.includeFile && row.file) fd.append("file", row.file);
    if (row.includeFile) fd.append("file_url", row.fileUrl || "");

    const r = await fetch(`${BASE_URL}/api/weeks/${weekId}/resources`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      body: fd,
    });
    if (!r.ok) throw new Error(`Create resource failed (${r.status})`);
    const j = await r.json();
    const res = j.resource || j;

    return {
      id: res.id,
      week: Number(week),
      weekId,
      type: res.type || "composite",
      title: res.title || row.title || "",
      text: res.text ?? (row.includeText ? row.text : null),
      videoUrl: res.video_url ?? (row.includeVideo ? row.videoUrl : null),
      fileUrl: res.file_url ?? (row.includeFile ? row.fileUrl || null : null),
    };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!week) return;

    // validasi: tiap baris harus memilih minimal 1 include
    const invalid = rows.some(
      (r) => !r.includeText && !r.includeVideo && !r.includeFile
    );
    if (invalid) {
      alert("Minimal pilih salah satu: Text / Video / File pada setiap baris.");
      return;
    }

    try {
      setSaving(true);

      // 1) buat week dulu (tanpa resources)
      const fd = new FormData();
      fd.append("week_number", week);
      const res = await fetch(`${BASE_URL}/api/kelas/${classId}/weeks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(`Create week failed (${res.status})`);
      const json = await res.json();

      const weekId = json?.week?.id ?? json?.id ?? json?.week_id;
      const weekNumber =
        json?.week?.week_number ?? json?.week_number ?? Number(week);

      if (!weekId) throw new Error("Week id tidak ditemukan dari respons.");

      // 2) buat semua composite resources paralel
      const created = await Promise.all(
        rows.map((row) => createCompositeResource(weekId, row))
      );

      // 3) normalisasi & kirim balik ke parent (untuk update state + cache)
      const items = created.map((it) => ({
        ...it,
        week: weekNumber,
        weekId,
      }));
      onSave(items);
    } catch (err) {
      alert("Failed to save: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <h3 style={{ margin: 0, fontWeight: 800, marginBottom: 12 }}>
            Create Week
          </h3>

          <form id="create-week-form" onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{ fontWeight: 700, display: "block", marginBottom: 6 }}
              >
                Week number
              </label>
              <input
                className="input week-input"
                type="number"
                min="1"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {rows.map((r) => (
                <div key={r.id} className="res-row">
                  <label
                    style={{
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Title
                  </label>
                  <input
                    className="input"
                    value={r.title}
                    onChange={(e) => updateRow(r.id, { title: e.target.value })}
                  />

                  <div style={{ height: 8 }} />

                  <label
                    style={{
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Include:
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={r.includeText}
                        onChange={(e) =>
                          updateRow(r.id, { includeText: e.target.checked })
                        }
                      />{" "}
                      Text
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={r.includeVideo}
                        onChange={(e) =>
                          updateRow(r.id, { includeVideo: e.target.checked })
                        }
                      />{" "}
                      Video (URL)
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={r.includeFile}
                        onChange={(e) =>
                          updateRow(r.id, { includeFile: e.target.checked })
                        }
                      />{" "}
                      File (upload/URL)
                    </label>

                    <button
                      type="button"
                      className="btn"
                      onClick={() => removeRow(r.id)}
                      style={{ marginLeft: "auto" }}
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>

                  {r.includeText && (
                    <div style={{ marginTop: 8 }}>
                      <label
                        style={{
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Content
                      </label>
                      <textarea
                        className="textarea"
                        value={r.text}
                        onChange={(e) =>
                          updateRow(r.id, { text: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {r.includeVideo && (
                    <div style={{ marginTop: 8 }}>
                      <label
                        style={{
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Video URL
                      </label>
                      <input
                        className="input"
                        type="url"
                        value={r.videoUrl}
                        onChange={(e) =>
                          updateRow(r.id, { videoUrl: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {r.includeFile && (
                    <div style={{ marginTop: 8 }}>
                      <label
                        style={{
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        File (upload atau URL)
                      </label>
                      <input
                        className="input"
                        type="file"
                        accept=".pdf,.ppt,.pptx,.doc,.docx"
                        onChange={(e) =>
                          updateRow(r.id, { file: e.target.files?.[0] || null })
                        }
                      />
                      <div style={{ height: 8 }} />
                      <input
                        className="input"
                        placeholder="Or File URL"
                        value={r.fileUrl}
                        onChange={(e) =>
                          updateRow(r.id, { fileUrl: e.target.value })
                        }
                      />
                      <div className="cmt-meta" style={{ marginTop: 6 }}>
                        Gunakan salah satu: upload file atau isi URL.
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn" onClick={addRow}>
                <PlusCircle size={16} /> Add another resource
              </button>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-week-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditWeekModal({ initialWeek, takenWeeks = [], onClose, onSave }) {
  const [val, setVal] = useState(initialWeek);
  const [saving, setSaving] = useState(false);

  const exists = (n) =>
    takenWeeks
      .filter((w) => Number(w) !== Number(initialWeek))
      .includes(Number(n));

  const submit = async (e) => {
    e.preventDefault();
    if (!val) return;
    if (exists(val)) {
      alert("Week number already exists.");
      return;
    }
    setSaving(true);
    try {
      await onSave(Number(val));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <h3 style={{ margin: 0, fontWeight: 800, marginBottom: 12 }}>
            Edit Week
          </h3>
          <form id="edit-week-form" onSubmit={submit}>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{ fontWeight: 700, display: "block", marginBottom: 6 }}
              >
                New week number
              </label>
              <input
                className="input week-input"
                type="number"
                min="1"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                required
              />
              <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                Current: {initialWeek}
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="edit-week-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteWeek({ week, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-body">
          <h3 style={{ margin: 0, fontWeight: 800, marginBottom: 12 }}>
            Delete Week
          </h3>
          <p>
            Are you sure you want to delete <b>Week {week}</b>? All materials in
            this week will be removed.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

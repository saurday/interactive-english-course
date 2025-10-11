// src/pages/lecture/Reports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  SettingsIcon,
  LogOut,
  Menu,
  Users2,
  BookOpenCheck,
  BookOpen,
  BarChart2,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const STUDENTS_URL = (cid) => `${BASE_URL}/api/kelas/${cid}/students`;
const REPORT_URL = (cid, sid) =>
  `${BASE_URL}/api/kelas/${cid}/reports?student_id=${sid}`;

/* -------------------- helpers -------------------- */
const getUserId = () => {
  try {
    const u = JSON.parse(localStorage.getItem("userInfo") || "{}");
    return u?.id ?? null;
  } catch (err) {
    console.error("getUserId()", err);
    return null;
  }
};

const headersAuth = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  Accept: "application/json",
});

/** Ambil semua kelas, lalu filter hanya yang dosen_id = user saat ini */
async function fetchLecturerClasses() {
  try {
    const r = await fetch(`${BASE_URL}/api/kelas`, { headers: headersAuth() });
    if (!r.ok) throw new Error(`Failed to fetch classes (${r.status})`);
    const json = await r.json();

    const me = getUserId();
    const raw = Array.isArray(json) ? json : json.data || json.list || [];

    const normalized = raw
      .map((k) => ({
        id: k.id,
        nama_kelas: k.nama_kelas || k.name || "Untitled",
        kode_kelas: k.kode_kelas || k.code || "",
        dosen_id: k.dosen_id ?? k.lecturer_id ?? k.owner_id ?? null,
        dosen: k.dosen || k.lecturer || null,
      }))
      // jika backend belum set dosen_id, biar tetap tampil
      .filter((k) => !k.dosen_id || k.dosen_id === me);

    return normalized;
  } catch (err) {
    console.error("fetchLecturerClasses()", err);
    return [];
  }
}

/** Ambil weeks/resources untuk hitung total materi per kelas (untuk persentase) */
async function fetchWeeksForClass(classId) {
  try {
    const r = await fetch(`${BASE_URL}/api/kelas/${classId}/weeks`, {
      headers: headersAuth(),
    });
    if (!r.ok) {
      if (r.status === 404) return { totalResources: 0 };
      throw new Error(`Failed weeks (${r.status})`);
    }
    const data = await r.json();
    const weeksArr = Array.isArray(data) ? data : data.weeks || [];

    let count = 0;
    weeksArr.forEach((w) => {
      if (Array.isArray(w.resources)) count += w.resources.length;
    });

    return { totalResources: count };
  } catch (err) {
    console.error("fetchWeeksForClass()", err);
    return { totalResources: 0 };
  }
}

/** Ambil mahasiswa dalam kelas */
async function fetchClassStudents(classId) {
  try {
    const r = await fetch(`${BASE_URL}/api/kelas/${classId}/students`, {
      headers: headersAuth(),
    });
    if (!r.ok) throw new Error(`Failed students (${r.status})`);
    const j = await r.json();
    const arr = Array.isArray(j) ? j : j.students || j.data || j.list || [];

    return arr.map((s, i) => {
      const userId =
        s.user_id ?? s.mahasiswa_id ?? s.user?.id ?? s.id ?? `row-${i}`;

      return {
        // gunakan userId ini utk report
        id: userId,
        pivotId: s.id ?? null, // kalau butuh id pivot
        name:
          s.full_name ||
          s.nama_lengkap ||
          s.name ||
          s.user?.name ||
          s.mahasiswa?.name ||
          "-",
        email: s.email || s.user?.email || "",
        joinedAt: s.joined_at || s.pivot?.joined_at || s.created_at || null,
      };
    });
  } catch (err) {
    console.error("fetchClassStudents()", err);
    return [];
  }
}

/** Ambil ringkasan progres/scores 1 mahasiswa dalam kelas */
async function fetchStudentReport(classId, studentId) {
  const h = headersAuth();

  // Kandidat endpoint: /api/kelas/{id}/students/{sid}/report
  try {
    const r1 = await fetch(
      `${BASE_URL}/api/kelas/${classId}/students/${studentId}/report`,
      { headers: h }
    );
    if (r1.ok) {
      const j = await r1.json();

      // --- BACA RESPONS BACKEND MU SAAT INI ---
      if (j?.totals) {
        return {
          completed: Number(j.totals.completed ?? 0),
          total: Number(j.totals.totalResources ?? 0),
          avgScore:
            j.avg_score ??
            j.average_score ??
            (typeof j.score === "number" ? j.score : null),
        };
      }

      // fallback kalau suatu saat respons diubah ke flat
      return {
        completed: Number(j.completed ?? j.total_completed ?? 0),
        total: Number(j.total ?? j.total_resources ?? j.total_items ?? 0),
        avgScore:
          j.avg_score ??
          j.average_score ??
          (typeof j.score === "number" ? j.score : null),
      };
    }
  } catch (err) {
    console.error("report endpoint #1", err);
  }

  // Kandidat endpoint: /api/kelas/{id}/reports?student_id=...
  try {
    const r2 = await fetch(
      `${BASE_URL}/api/kelas/${classId}/reports?student_id=${studentId}`,
      { headers: h }
    );
    if (r2.ok) {
      const j = await r2.json();

      // --- BACA RESPONS BACKEND MU SAAT INI ---
      if (j?.totals) {
        return {
          completed: Number(j.totals.completed ?? 0),
          total: Number(j.totals.totalResources ?? 0),
          avgScore:
            j.avg_score ??
            j.average_score ??
            (typeof j.score === "number" ? j.score : null),
        };
      }

      // fallback bentuk lain
      const data = j.report || j.data || j;
      return {
        completed: Number(data.completed ?? data.total_completed ?? 0),
        total: Number(
          data.total ?? data.total_resources ?? data.total_items ?? 0
        ),
        avgScore:
          data.avg_score ??
          data.average_score ??
          (typeof data.score === "number" ? data.score : null),
      };
    }
  } catch (err) {
    console.error("report endpoint #2", err);
  }

  // Tidak ada data
  return { completed: 0, total: 0, avgScore: null };
}

/* -------------------- page -------------------- */
export default function Reports() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [classes, setClasses] = useState([]);
  const [cLoading, setCLoading] = useState(true);

  const [activeClass, setActiveClass] = useState(null);

  const [students, setStudents] = useState([]);
  const [stuLoading, setStuLoading] = useState(false);

  const [totals, setTotals] = useState({ totalResources: 0 }); // total materi class aktif
  const [reports, setReports] = useState({}); // key: studentId -> {completed,total,avgScore}

  const [query, setQuery] = useState("");

  // Sidebar menu
  const sidebarMenu = [
    { label: "Dashboard", icon: <Home size={18} />, to: "/lecture" },
    {
      label: "CEFR Modules",
      icon: <BookOpen size={18} />,
      to: "/lecture/cefr",
    },
    { label: "Reports", icon: <BarChart2 size={18} />, to: "/lecture/reports" },
    {
      label: "Settings",
      icon: <SettingsIcon size={18} />,
      to: "/lecture/settings",
    },
    { label: "Logout", icon: <LogOut size={18} />, action: "logout" },
  ];
  // meta viewport
  useEffect(() => {
    try {
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
    } catch (err) {
      console.error("viewport meta", err);
    }
  }, []);

  // Load classes milik dosen
  useEffect(() => {
    (async () => {
      setCLoading(true);
      const list = await fetchLecturerClasses();
      setClasses(list);
      setCLoading(false);
      if (list.length) setActiveClass(list[0].id);
    })();
  }, []);

  // Saat kelas aktif berubah: load total resources + students + report per student
  useEffect(() => {
    if (!activeClass) return;
    (async () => {
      setStuLoading(true);
      const [totalInfo, list] = await Promise.all([
        fetchWeeksForClass(activeClass),
        fetchClassStudents(activeClass),
      ]);
      setTotals(totalInfo);
      setStudents(list);
      setStuLoading(false);

      // kosongkan report lama
      setReports({});
      // ambil ringkasan tiap student
      list.forEach(async (s) => {
        const rep = await fetchStudentReport(activeClass, s.id);
        setReports((prev) => ({
          ...prev,
          [s.id]: {
            completed: rep.completed ?? 0,
            total:
              rep.total && rep.total > 0 ? rep.total : totalInfo.totalResources,
            avgScore: typeof rep.avgScore === "number" ? rep.avgScore : null,
          },
        }));
      });
    })();
  }, [activeClass]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.name, s.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [students, query]);

  const handleLogout = (e) => {
    e.preventDefault();
    try {
      localStorage.clear();
    } catch (err) {
      console.error("clear storage", err);
    }
    navigate("/");
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
.menu-item{display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; color:#475569; font-weight:600; text-decoration:none; margin-bottom:6px; font-size:14px}
.menu-item:hover{ background:#f3f0ff; color:var(--primary) }
.menu-item.active{ background:#f3f0ff; color:var(--primary) }
button.menu-item{ background:transparent; border:0; width:100%; text-align:left; cursor:pointer }

.content{ flex:1; padding:24px; max-width:1400px; margin:0 auto; width:100%; }
.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin-bottom:12px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }

.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; width:100%; }
.page-title{ font-size:28px; font-weight:800; margin:0 0 4px; }

.hamburger{
  border:1px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px;
  display:none; align-items:center; justify-content:center;
}
.hamburger:hover{ background:#f8fafc; }

.btn{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; font-weight:700; cursor:pointer;
  border:1px solid #cbd5e1; background:#fff; }
.btn:hover { background:#f8fafc; }
.btn-primary { background:#6b46c1; color:#fff; border-color:#6b46c1; }
.btn-primary:hover { background:#553c9a; }

.pill{
  display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px;
  border:1px solid #e5e7eb; background:#fff; font-weight:700; cursor:pointer;
}

.class-list{
  display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 16px;
}
.class-item{
  padding:8px 12px; border-radius:10px; border:1px solid #e5e7eb; cursor:pointer;
  background:#fff; font-weight:700;
}
.class-item.active{ background:var(--primary); color:#fff; border-color:var(--primary); }

.table-wrap{ overflow:auto; }
table{ width:100%; border-collapse:collapse; font-size:14px; }
th, td{ padding:10px 8px; border-bottom:1px solid #f1f5f9; text-align:left; }
thead th{ background:#fafafa; border-bottom:1px solid #e5e7eb; color:#334155; font-weight:800; }

.search-row{ display:flex; gap:8px; align-items:center; margin-bottom:10px; }
.input{ width:100%; max-width:320px; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }
.input:focus{ border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,58,237,.15); }

@media (max-width:640px){
  .sidebar{ position:fixed; left:0; top:0; bottom:0; transform:translateX(-100%); transition:transform .25s ease; }
  .sidebar.open{ transform:translateX(0); }
  .content{ padding:10px 12px 90px; }
  .hamburger{ display:inline-flex; }
}
      `}</style>

      <div className="layout">
        {/* Sidebar */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>Lecturer</h3>
          {sidebarMenu.map(({ label, icon, to, action }) =>
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
                // hanya Dashboard yang exact
                end={to === "/lecture"}
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
          <div className="breadcrumb">
            <button
              className="hamburger"
              aria-label="Open menu"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <Link to="/lecture">Dashboard</Link>
            <span>›</span>
            <span>Reports</span>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h1
              className="page-title"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <BookOpenCheck size={22} /> Student Reports
            </h1>
            <div style={{ color: "#64748b" }}>
              View student progress and grades, grouped by class.{" "}
            </div>
          </div>

          <div className="card">
            {/* Kelas */}
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Classes</div>
            <div className="class-list">
              {cLoading ? (
                <span className="pill">Loading classes…</span>
              ) : classes.length === 0 ? (
                <span className="pill">No classes</span>
              ) : (
                classes.map((k) => (
                  <button
                    key={k.id}
                    className={`class-item ${
                      activeClass === k.id ? "active" : ""
                    }`}
                    onClick={() => setActiveClass(k.id)}
                  >
                    {k.nama_kelas}
                  </button>
                ))
              )}
            </div>

            {/* Search + total */}
            <div className="search-row">
              <input
                className="input"
                placeholder="Search name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div
                style={{
                  marginLeft: "auto",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                Total students: {students.length}
              </div>
            </div>

            {/* Tabel */}
            {stuLoading ? (
              <div className="pill" style={{ pointerEvents: "none" }}>
                <Users2 size={16} /> Loading students…
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="pill" style={{ pointerEvents: "none" }}>
                There are no students in this class yet
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 48, textAlign: "right" }}>#</th>
                      <th>Nama Lengkap</th>
                      <th style={{ width: 260 }}>Email</th>
                      <th style={{ width: 160 }}>Completed</th>
                      <th style={{ width: 120 }}>Avg. Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => {
                      const rep = reports[s.id] || {};
                      const total =
                        typeof rep.total === "number" && rep.total > 0
                          ? rep.total
                          : totals.totalResources;
                      const comp = rep.completed ?? 0;
                      const pct =
                        total > 0 ? Math.round((comp / total) * 100) : 0;
                      const avg =
                        typeof rep.avgScore === "number" ? rep.avgScore : null;

                      return (
                        <tr key={s.id ?? idx}>
                          <td style={{ textAlign: "right" }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700 }}>{s.name || "-"}</td>
                          <td>{s.email || "-"}</td>
                          <td>
                            {comp}/{total} {total > 0 ? `(${pct}%)` : ""}
                          </td>
                          <td>{avg != null ? Number(avg).toFixed(1) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

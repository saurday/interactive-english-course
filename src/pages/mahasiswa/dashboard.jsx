// src/pages/mahasiswa/dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  Home,
  BookOpenText,
  CalendarCheck2,
  LogOut,
  Settings,
  ChevronRight,
  Plus,
  CheckCircle2,
  GraduationCap,
  Menu, // ⬅️ hamburger
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BASE_URL } from "@/config/api"; // ✅ gunakan config terpusat

const CACHE_KEY = "classes_cache_mhs";
const getUserId = () => {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "{}")?.id || "anon";
  } catch {
    return "anon";
  }
};
const progKey = (classId, uid = getUserId()) => `u:${uid}:progress:${classId}`;

const sidebarMenu = [
  { label: "Dashboard", icon: <Home size={18} />, to: "/student" },
  {
    label: "CEFR Modules",
    icon: <BookOpenText size={18} />,
    to: "/student/cefr",
  },
  { label: "Settings", icon: <Settings size={18} />, to: "/student/settings" },
  { label: "Logout", icon: <LogOut size={18} /> },
];

async function fetchPlacementState(token) {
  const r = await fetch(`${BASE_URL}/placement/state`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Failed to load state (${r.status})`);
  const j = await r.json();
  return {
    latest: j.latest || null,
    can_retake: !!j.can_retake,
    retake_available_at: j.retake_available_at || null,
  };
}

export default function MahasiswaDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";

  const [placement, setPlacement] = useState({ loading: true, taken: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const st = await fetchPlacementState(token);
        if (!alive) return;
        setPlacement({ loading: false, ...st });
      } catch (err) {
        console.error("placement state error:", err);
        if (!alive) return;
        setPlacement({ loading: false, error: true, taken: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  async function startPlacement() {
    const r = await fetch(`${BASE_URL}/placement/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      alert(msg || "You cannot retake the test yet.");
      return;
    }
    const { attempt } = await r.json();
    navigate(`/student/placement-test?aid=${attempt.id}`);
  }

  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [classes, setClasses] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  // Drawer sidebar (mobile)
  const [sideOpen, setSideOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = sideOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [sideOpen]);

  // Join modal
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // -------- utils --------
  const syncCache = (list) => {
    setClasses(list);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(list || []));
    } catch (_err) {
      console.error("Cache sync error:", _err);
    }
  };

  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      setErr(null);
      const res = await fetch(`${BASE_URL}/kelas`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error(`Failed to load classes (${res.status})`);
      const json = await res.json();
      const list = Array.isArray(json) ? json : [];
      syncCache(list);
      if (list.length) {
        setSelectedClass(list[0]);
      } else {
        setSelectedClass(null);
        setWeeks([]);
      }
    } catch (e) {
      setErr(e.message || "Failed to load classes");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeeks = async (classId) => {
    if (!classId) return setWeeks([]);
    try {
      const res = await fetch(`${BASE_URL}/kelas/${classId}/weeks`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.status === 404) {
        setWeeks([]);
        return;
      }
      if (!res.ok) throw new Error(`Failed to load weeks (${res.status})`);

      const data = await res.json();
      const weeksArr = Array.isArray(data) ? data : data.weeks || [];

      // progress lokal
      const uid = getUserId();
      let progressMap = {};
      try {
        const raw = localStorage.getItem(progKey(classId, uid));
        progressMap = raw ? JSON.parse(raw) : {};
      } catch {
        progressMap = {};
      }

      const mapped = weeksArr.map((w) => {
        const resArr = Array.isArray(w.resources) ? w.resources : [];
        const mergedResources = resArr.map((r) => ({
          ...r,
          completed:
            r?.completed === true ||
            r?.progress === 100 ||
            !!progressMap[r?.id],
        }));
        return {
          id: w.id ?? `week-${w.week_number}`,
          week_number: w.week_number ?? w.week ?? 0,
          resources: mergedResources,
        };
      });

      setWeeks(mapped);
    } catch {
      setWeeks([]);
    }
  };

  // -------- effects --------
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) {
        setClasses(cached);
        setSelectedClass(cached[0]);
        setIsLoading(false);
      }
    } catch (_err) {
      console.error("Cache load error:", _err);
    }
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchWeeks(selectedClass?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass?.id]);

  // -------- handlers --------
  const handleLogout = (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userInfo");
      localStorage.removeItem("classes_cache_dosen");
      localStorage.removeItem("classes_cache_mhs");
    } catch {
      /* ignore */
    }
    navigate("/");
  };

  const onJoin = async (e) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    try {
      setJoining(true);
      const res = await fetch(`${BASE_URL}/kelas/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ kode_kelas: code }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Join failed (${res.status})`);
      }
      await fetchClasses();
      setJoinOpen(false);
      setJoinCode("");
    } catch (e) {
      alert(e.message || "Gagal join kelas. Periksa kode/token.");
    } finally {
      setJoining(false);
    }
  };

  // -------- UI helpers --------
  const calcWeekProgress = (w) => {
    const resources = Array.isArray(w.resources) ? w.resources : [];
    if (!resources.length) return 0;
    const done = resources.filter(
      (r) => r.completed === true || r.progress === 100
    ).length;
    return Math.round((done / resources.length) * 100);
  };

  // const hasClass = classes.length > 0;

  return (
    <>
      {/* Fonts */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@400;600;700&display=swap');`}
      </style>

      <style>{`
 :root { 
  --sbw: 240px; 
  --violet:#6b46c1; 
  --violet-700:#553c9a; 
  --primary: var(--violet);
}
body { font-family: Inter, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#fbfbfb; }

/* ====== Layout ====== */
.mhs-dash{
   display:flex;
   min-height:100vh;
   width:100%;
   padding-left: 0 !important;
   margin-left: 0 !important;
}

.mhs-dash .content{
  flex: 1 1 auto;
  width: 100%;
  max-width: none !important;
  margin: 0 !important;
  padding: 20px clamp(12px, 2vw, 24px);
}


 .weeks{
   display:flex;
   flex-wrap:wrap;
   gap:16px;
   justify-content:flex-start;
 }

 .weeks .week-card{
   width:320px;              
   max-width:100%;
   flex:0 0 320px;          
 }
 @media (max-width:980px){
   .weeks .week-card{ flex:1 1 calc(50% - 8px); width:auto; }
 }
 @media (max-width:640px){
   .weeks .week-card{ flex:1 1 100%; }
 }


.sidebar {
  width: var(--sbw);
  background:#fff; border-right:1px solid #e2e8f0;
  padding:16px; position:sticky; top:0; height:100vh;
}
.content{
  flex: 1;
  width: 100%;
  max-width: none;
  margin: 0;
  padding-inline: clamp(14px, 4vw, 28px);
  padding-top: clamp(12px, 2.6vw, 24px);
  padding-bottom: max(clamp(28px, 6vh, 96px), env(safe-area-inset-bottom));
}

.title { font-size: clamp(18px, 2.2vw + 6px, 20px); font-weight:800; color:#1f2937; margin:0 0 12px; }
.muted { color:#64748b; }

/* ====== Sidebar ====== */
.sidebar {
  width: var(--sbw);
  background:#fff;
  border-right:1px solid #e2e8f0;
  padding:16px;
  position:sticky;
  top:0;
  height:100vh;
}

.sidebar h3 { font-weight:800; margin:0 0 12px; }

.menu-item{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-radius:10px;
  color:#475569;
  font-weight:600;
  text-decoration:none;
  margin-bottom:6px;
  font-size:14px;
  cursor:pointer;
  transition: background .15s ease, color .15s ease;
  user-select:none;
}

.menu-item:hover,
.menu-item.active{
  background:#f3f0ff;
  color:var(--primary);
}

button.menu-item{
  background:transparent;
  border:0;
  width:100%;
  text-align:left;
}

/* ====== Mobile top bar ====== */
.mobile-top{ display:none; align-items:center; justify-content:space-between; gap:10px; margin:4px 0 12px; }
.hamburger{
  display:none; border:1px solid #e2e8f0; background:#fff;
  border-radius:10px; padding:8px; align-items:center; justify-content:center;
}

/* ====== Drawer & backdrop (≤1100px) ====== */
.backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:1000; display:none; }
.backdrop.show{ display:block; }

@media (max-width:1100px){
  .sidebar{
    position: fixed; left:0; top:0; bottom:0; height:auto;
    width: 86vw; max-width: 320px; transform: translateX(-100%);
    transition: transform .25s ease; z-index: 1001; overflow:auto;
  }
  .sidebar.open{ transform: translateX(0); }
  .content{
    max-width:100%;
    padding-inline: 12px;
    padding-top: 12px;
    padding-bottom: max(56px, env(safe-area-inset-bottom));
  }
  .mobile-top{ display:flex; }
  .hamburger{ display:inline-flex; }
}

/* ====== Buttons / Inputs ====== */
.btn{
  padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1;
  background:#fff; color:#111827; font-weight:700; cursor:pointer;
}
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); border-color:var(--violet); color:#fff; }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }
.input{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; }

/* ====== Hero card ====== */
.hero{
  background: radial-gradient(1200px 400px at 80% -20%, rgba(255,255,255,.25), transparent 60%), var(--violet);
  color:#fff; border-radius:16px; padding:22px; box-shadow:0 10px 28px rgba(0,0,0,.15);
}
.hero h5{ margin:0 0 8px; font-size: clamp(18px, 1.2vw + 10px, 24px); font-weight:800; }
.hero p{ margin:0 0 10px; opacity:.98; }

/* ====== Weeks grid ====== */
.grid{
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
@media (max-width: 980px){ .grid{ grid-template-columns: repeat(2, minmax(220px,1fr)); } }
@media (max-width: 640px){ .grid{ grid-template-columns: 1fr; } }

.week-card{
  background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px;
  box-shadow:0 2px 8px rgba(0,0,0,.06); cursor:pointer; transition: transform .15s, box-shadow .15s;
}
.week-card:hover{ transform:translateY(-3px); box-shadow:0 8px 18px rgba(0,0,0,.12); }
.progress-wrap{ height:8px; background:#e5e7eb; border-radius:999px; overflow:hidden; }
.progress-bar{ height:100%; background:var(--violet); }

/* ====== Modal ====== */
.modal{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:1050; padding:16px; }
.modal-content{ width:min(92vw,420px); background:#fff; border-radius:12px; border:1px solid #e5e7eb; padding:18px; }
.modal-actions{ margin-top:12px; display:flex; justify-content:flex-end; gap:8px; }
      `}</style>

      {/* backdrop untuk drawer */}
      {sideOpen && (
        <div className="backdrop show" onClick={() => setSideOpen(false)} />
      )}

      <div className="mhs-dash">
        {/* Sidebar */}
        <aside className={`sidebar ${sideOpen ? "open" : ""}`}>
          <h3>LEXENT</h3>

          {sidebarMenu.map(({ label, icon, to }) =>
            label === "Logout" ? (
              <button key={label} className="menu-item" onClick={handleLogout}>
                {icon} {label}
              </button>
            ) : (
              <div
                key={label}
                className={`menu-item ${activeMenu === label ? "active" : ""}`}
                onClick={() => {
                  setActiveMenu(label);
                  setSideOpen(false);
                  if (to) navigate(to);
                }}
              >
                {icon} {label}
              </div>
            )
          )}
        </aside>

        {/* Content */}
        <main className="content">
          {/* mobile top bar */}
          <div className="mobile-top">
            <button
              className="hamburger"
              aria-label="Open menu"
              onClick={() => setSideOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div style={{ fontWeight: 800 }}>Dashboard</div>
            <div />
          </div>

          <div className="title">Dashboard</div>

          <div className="hero" style={{ marginBottom: 16 }}>
            {!placement?.latest ? (
              <>
                <h3>Placement Test</h3>
                <p style={{ maxWidth: 820 }}>
                  The Placement Test is an initial test to measure your English
                  proficiency level based on the CEFR. The results determine the
                  material that best suits your abilities. The test takes 30
                  minutes to complete and can only be taken once.
                </p>
                <button className="btn" onClick={startPlacement}>
                  Test Now
                </button>
              </>
            ) : (
              <>
                <h5>
                  Your level:&nbsp;
                  <b>
                    {placement.latest.level}
                    {placement.latest.level_name
                      ? ` (${placement.latest.level_name
                          .replace(/^[A-C]\d\s*/, "")
                          .trim()})`
                      : ""}
                  </b>
                </h5>

                <p style={{ marginBottom: 12 }}>
                  Score {placement.latest.correct ?? 0}/
                  {placement.latest.total ?? 0}.&nbsp; Tested at{" "}
                  {new Date(placement.latest.tested_at).toLocaleString("id-ID")}
                  .
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 10,
                  }}
                >
                  {placement.latest.level_id ? (
                    <button
                      className="btn"
                      onClick={() => navigate(`/student/cefr`)}
                    >
                      Go to CEFR Modules
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* States */}
          {isLoading ? (
            <div className="muted">Loading…</div>
          ) : err ? (
            <div style={{ color: "#dc2626" }}>{err}</div>
          ) : classes.length === 0 ? (
            <div className="week-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                You are not yet enrolled in a class
              </div>
              <div className="muted" style={{ marginBottom: 12 }}>
                Ask your instructor for the class code, then join using the
                button below.
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setJoinOpen(true)}
              >
                <Plus size={16} /> Join Class
              </button>
            </div>
          ) : (
            <>
              {/* Class header */}
              <div className="week-card" style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <GraduationCap size={20} color="#6b46c1" />
                  <div style={{ fontWeight: 800 }}>
                    {selectedClass?.nama_kelas || "My Class"}
                  </div>
                </div>
                <div className="muted">
                  Code: <b>{selectedClass?.kode_kelas}</b> &nbsp;•&nbsp;
                  Lecturer: <b>{selectedClass?.dosen?.name || "-"}</b>
                </div>
              </div>

              {/* Weeks grid */}
              {weeks.length === 0 ? (
                <div className="muted">
                  There is no material for this class yet.
                </div>
              ) : (
                <div className="weeks">
                  {" "}
                  {weeks
                    .slice()
                    .sort((a, b) => (a.week_number || 0) - (b.week_number || 0))
                    .map((w, idx) => {
                      const pct = calcWeekProgress(w);
                      return (
                        <div
                          key={w.id || idx}
                          className="week-card"
                          onClick={() =>
                            navigate(
                              `/student/classes/${selectedClass.id}/weeks/${w.week_number}`
                            )
                          }
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 10,
                            }}
                          >
                            <div style={{ fontWeight: 800 }}>
                              Week {w.week_number}
                            </div>
                            {pct === 100 ? (
                              <CheckCircle2 size={18} color="#16a34a" />
                            ) : null}
                          </div>
                          <div className="muted" style={{ marginBottom: 10 }}>
                            {Array.isArray(w.resources)
                              ? w.resources.length
                              : 0}{" "}
                            materials
                          </div>
                          <div className="progress-wrap">
                            <div
                              className="progress-bar"
                              style={{ width: `${pct}%` }}
                              aria-label={`Progress ${pct}%`}
                            />
                          </div>
                          <div
                            className="muted"
                            style={{
                              marginTop: 8,
                              fontSize: 12,
                              textAlign: "right",
                            }}
                          >
                            {pct}% completed
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}

          {/* Join Modal */}
          {joinOpen && (
            <div className="modal" onClick={() => setJoinOpen(false)}>
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                  Join the Class
                </h3>
                <div className="muted" style={{ marginBottom: 8 }}>
                  Enter your instructor's class code.
                </div>
                <form onSubmit={onJoin}>
                  <input
                    className="input"
                    placeholder="Example: ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setJoinOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={joining}
                    >
                      {joining ? "Joining..." : "Join"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

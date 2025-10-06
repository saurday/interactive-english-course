// src/pages/mahasiswa/CefrModules.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, CheckCircle2 } from "lucide-react";

const BASE_URL = "https://laravel-interactive-english-course-production.up.railway.app";

/* ---------- API ---------- */
async function fetchPlacementState(token) {
  const r = await fetch(`${BASE_URL}/api/placement/state`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Failed to load state (${r.status})`);
  return r.json();
}

/* ---------- helpers ---------- */
const LEVEL_MAP = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Proficiency",
};
const toTitle = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());

function deriveLevelLabel(latest) {
  const score = Number(latest?.score);
  const max = Number(latest?.max_score);
  if (score && max && score === max) return "Proficiency";

  const ln = (latest?.level_name || "").toString();
  const stripped = ln.replace(/^[A-C]\d\s*/i, "").trim();
  if (stripped) return toTitle(stripped);

  const code = (latest?.level || "").toUpperCase();
  if (LEVEL_MAP[code]) return LEVEL_MAP[code];

  return "Beginner";
}

export default function CefrModules() {
  const token = localStorage.getItem("token") || "";
  const navigate = useNavigate();
  const [placement, setPlacement] = useState({ loading: true, modules: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const st = await fetchPlacementState(token);
        if (!alive) return;
        setPlacement({ loading: false, ...st });
      } catch {
        if (!alive) return;
        setPlacement({ loading: false, error: true });
      }
    })();
    return () => (alive = false);
  }, [token]);

  const startPlacement = async () => {
    try {
      const r = await fetch(`${BASE_URL}/api/placement/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        alert(msg || "You cannot take the test right now.");
        return;
      }
      const { attempt } = await r.json();
      navigate(`/student/placement-test?aid=${attempt.id}`);
    } catch {
      alert("Unable to start the test right now.");
    }
  };

  const latest = placement.latest || null;
  const modules = Array.isArray(placement.modules) ? placement.modules : [];
  const levelLabel = latest ? deriveLevelLabel(latest) : null;

  /* ---------- styles ---------- */
  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
:root { --violet:#6b46c1; --violet-700:#553c9a; }
body { background:#fbfbfb; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }

/* layout */
.wrap{
  display:grid;
  grid-template-columns: clamp(260px, 22vw, 360px) 1fr;
  gap: clamp(12px, 2vw, 24px);
  width:100%;
  max-width:100%;
  padding: 12px clamp(12px, 2vw, 24px);
}
.panel{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; }
.left{ padding:12px; }
.right{ padding:18px; min-height:60vh; }

/* breadcrumb */
.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin:12px 0 6px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }

/* buttons */
.btn{ padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; font-weight:700; cursor:pointer; }
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); color:#fff; border-color:var(--violet); }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }

/* hero (kanan, match dashboard) */

.hero{
  background: radial-gradient(1200px 400px at 80% -20%, rgba(255,255,255,.25), transparent 60%), var(--violet);
  color:#fff; border-radius:18px; padding:22px; box-shadow: 0 10px 24px rgba(107,70,193,.20);
}
.hero h2{ margin: 0 0 6px; font-weight: 800; font-size: clamp(18px, 2vw + 6px, 24px); }
.hero p{ margin: 8px 0 14px; opacity: .95; line-height: 1.6; }

/* titles & text */
.h-left{ font-weight:800; margin-bottom:10px; }
.title{ font-size: clamp(22px, 2vw + 6px, 34px); font-weight:800; margin:0 0 10px; }
.subtle{ color:#64748b; }

/* modules list (sidebar) */
.step-list{ display:flex; flex-direction:column; gap:6px; }
.step{
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:700;
  transition: background-color .15s ease, transform .12s ease, box-shadow .12s ease, border-color .15s ease;
  border:1px solid transparent;
}
.step:hover{ background:#eef2ff; border-color:#e9d5ff; box-shadow:0 2px 12px rgba(107,70,193,.10); transform: translateX(2px); }
.idx{ width:22px; text-align:right; opacity:.6; }
.badge-done{ display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#16a34a; }

/* grid cards (kanan) */
.grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; }
.card h3{ margin:0 0 6px; font-weight:800; font-size:18px; }
.badge{ display:inline-block; font-size:12px; padding:3px 8px; border-radius:999px; background:#f1f5f9; border:1px solid #e5e7eb; color:#475569; }

/* empty state (statis) */
.empty{
  border:1px dashed #e5e7eb; border-radius:12px; padding:20px;
  display:flex; align-items:center; justify-content:space-between; gap:12px;
}
.empty p{ margin:0; color:#64748b }

/* skeleton */
@keyframes shimmer { 100% { transform: translateX(100%); } }
.skel{ background:#eef2f7; border-radius:12px; position:relative; overflow:hidden; }
.skel.shimmer::after{ content:""; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent); animation: shimmer 1.2s infinite; }
.skel-line{ height:14px; margin:10px 0; }
.skel-title{ height:32px; width:60%; margin:10px 0 14px; }

@media (max-width:1100px){ .wrap{ grid-template-columns: 1fr; padding:10px 12px; } }
`;

  return (
    <>
      <style>{styles}</style>

      <div className="wrap">
        {/* LEFT: daftar modules / info text */}
        <aside className="panel left">
          <div className="h-left">
            {latest ? `Modules ${levelLabel}` : "Placement Test"}
          </div>

          {placement.loading ? (
            <>
              <div className="skel skel-title shimmer" />
              <div className="skel skel-line shimmer" />
              <div className="skel skel-line shimmer" style={{ width: "80%" }} />
            </>
          ) : placement.error ? (
            <div className="empty">
              <p>Failed to load placement state.</p>
              <button className="btn" onClick={() => window.location.reload()}>Refresh</button>
            </div>
          ) : !latest ? (
            // NOTE: hanya teks di kiri (tanpa tombol)
            <div className="empty"><p>You need to complete the placement test to access modules.</p></div>
          ) : modules.length === 0 ? (
            <div className="empty"><p>No modules yet for your level.</p></div>
          ) : (
            <div className="step-list">
              {modules.map((m, i) => {
                const completed = !!(m.completed || m.progress === 100);
                const open = () => {
                  if (m?.url) return navigate(m.url);
                  if (m?.to) return navigate(m.to);
                  if (m?.id) return navigate(`/student/cefr/modules/${m.id}`);
                };
                return (
                  <div key={m.id ?? i} className="step" onClick={open}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="idx">{i + 1}.</span>
                      <span>{m.title || `Module ${i + 1}`}</span>
                    </div>
                    {completed && (
                      <span className="badge-done">
                        <CheckCircle2 size={16} /> Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* RIGHT: hero (belum test) / grid modul / empty-state */}
        <section className="panel right">
          <div className="breadcrumb">
            <Link to="/student">Dashboard</Link>
            <ChevronRight size={16} />
            <span>CEFR Modules</span>
          </div>

          {placement.loading ? (
            <>
              <div className="skel skel-title shimmer" />
              <div className="skel skel-line shimmer" />
              <div className="skel skel-line shimmer" style={{ width: "85%" }} />
              <div className="skel skel-line shimmer" style={{ width: "70%" }} />
            </>
          ) : placement.error ? (
            <div className="empty">
              <p>Something went wrong while loading modules.</p>
              <button className="btn" onClick={() => window.location.reload()}>Try again</button>
            </div>
          ) : !latest ? (
            // === KARTU UNGU di panel KANAN, seperti dashboard ===
            <div className="hero">
              <h2>Placement Test</h2>
              <p>
                The Placement Test is an initial test to measure your English proficiency
                level based on the CEFR. The results determine the material that best suits
                your abilities. The test takes 30 minutes to complete and can only be taken once.
              </p>
              <button className="btn" style={{ background:"#fff" }} onClick={startPlacement}>
                Test Now
              </button>
            </div>
          ) : modules.length === 0 ? (
            <div className="empty">
              <p>No CEFR-aligned content yet for your level.</p>
              <span className="badge">Level {latest.level}</span>
            </div>
          ) : (
            <>
              <h1 className="title" style={{ marginTop: 4 }}>
                Modules for Level {latest.level}
              </h1>
              <div className="grid">
                {modules.map((m) => {
                  const completed = !!(m.completed || m.progress === 100);
                  const open = () => {
                    if (m?.url) return navigate(m.url);
                    if (m?.to) return navigate(m.to);
                    if (m?.id) return navigate(`/student/cefr/modules/${m.id}`);
                  };
                  return (
                    <div key={m.id ?? m.slug ?? m.title} className="card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <h3>{m.title || "Untitled Module"}</h3>
                        <span className="badge">{m.level || latest.level}</span>
                      </div>
                      {m.description && (
                        <div className="subtle" style={{ marginBottom: 10, lineHeight: 1.6 }}>
                          {m.description}
                        </div>
                      )}
                      {typeof m.progress === "number" && (
                        <div className="subtle" style={{ marginBottom: 10 }}>
                          Progress: <b>{Math.round(m.progress)}%</b>
                        </div>
                      )}
                      {completed && (
                        <div className="subtle" style={{ marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <CheckCircle2 size={16} color="#16a34a" /> Completed
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" onClick={open}>Open</button>
                        {m.supplement_url && (
                          <a className="btn" href={m.supplement_url} target="_blank" rel="noreferrer">
                            Materials
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

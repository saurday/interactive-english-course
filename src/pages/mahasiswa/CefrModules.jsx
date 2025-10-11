import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, CheckCircle2 } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ================= API ================= */
async function fetchPlacementState(token) {
  const r = await fetch(`${BASE_URL}/api/placement/state`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Failed to load state (${r.status})`);
  return r.json();
}
async function fetchLevelByCode(code, token) {
  const r = await fetch(`${BASE_URL}/api/cefr-levels/by-code/${code}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Level ${code} not found`);
  const j = await r.json();
  return j.level || j.data || j;
}
async function fetchCefrResources(levelId, token) {
  const r = await fetch(`${BASE_URL}/api/cefr-levels/${levelId}/resources`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) return [];
  const j = await r.json();
  const arr = Array.isArray(j) ? j : j.resources || j.data || [];
  return arr.map((k) => ({
    id: k.id,
    title: k.title || "",
    text: k.text ?? null,
    videoUrl: k.video_url ?? k.videoUrl ?? null,
    fileUrl: k.file_url ?? k.fileUrl ?? null,
  }));
}

/* ================= helpers ================= */
const LEVEL_LABEL = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Proficiency",
};
const getUserId = () => {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "{}")?.id || "anon";
  } catch {
    return "anon";
  }
};
const progKey = (levelId, uid = getUserId()) => `cefr:progress:l${levelId}:u${uid}`;
const readProgress = (levelId) => {
  try {
    return JSON.parse(localStorage.getItem(progKey(levelId)) || "{}");
  } catch {
    return {};
  }
};
const writeProgress = (levelId, map) => {
  try {
    localStorage.setItem(progKey(levelId), JSON.stringify(map || {}));
  } catch {
    /* ignore */
  }
};

function toYouTubeEmbed(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/embed/")) return raw;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1])
        return `https://www.youtube.com/embed/${parts[1]}`;
    }
  } catch {
    /* ignore */
  }
  return raw;
}
const buildEmbedUrl = (url) =>
  !url ? "" : url.includes("youtu") ? toYouTubeEmbed(url) : url;

function prepareEmbedSrc(rawUrl) {
  const url = String(rawUrl || "");
  if (!url) return { type: "none", src: "", open: "" };

  if (url.includes("docs.google.com/presentation")) {
    let src = url;
    if (/(\/edit|\/present)/.test(src)) {
      src = src.replace(
        /\/(edit|present).*$/,
        "/embed?start=false&loop=false&delayms=3000"
      );
    }
    if (/\/pub(\?|$)/.test(src)) {
      src = src.replace(/\/pub(\?|$)/, "/embed?");
      if (!src.includes("?")) src += "start=false&loop=false&delayms=3000";
    }
    return { type: "iframe", src, open: url };
  }
  if (url.includes("docs.google.com/document")) {
    const src = url.replace(/\/edit.*$/, "/pub?embedded=true");
    return { type: "iframe", src, open: url };
  }
  if (url.includes("docs.google.com/spreadsheets")) {
    const src = url.replace(/\/edit.*$/, "/pubhtml?widget=true&headers=false");
    return { type: "iframe", src, open: url };
  }
  if (url.includes("docs.google.com/forms")) {
    const src = url.replace(/\/viewform.*$/, "/viewform?embedded=true");
    return { type: "iframe", src, open: url };
  }
  if (url.includes("drive.google.com")) {
    const src = url.replace(/\/view(\?.*)?$/, "/preview");
    return { type: "iframe", src, open: url };
  }

  const clean = url.split("#")[0];
  const path = clean.split("?")[0];
  const ext = (path.split(".").pop() || "").toLowerCase();

  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext))
    return { type: "image", src: url, open: url };
  if (["mp4", "webm", "ogg", "m3u8"].includes(ext))
    return { type: "video", src: url, open: url };
  if (["mp3", "wav", "oga", "ogg"].includes(ext))
    return { type: "audio", src: url, open: url };
  if (ext === "pdf") return { type: "iframe", src: url, open: url };
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext)) {
    const office = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      url
    )}`;
    return { type: "iframe", src: office, open: url };
  }
  return { type: "iframe", src: url, open: url };
}
function FileViewer({ url, title = "File" }) {
  const { type, src, open } = useMemo(() => prepareEmbedSrc(url), [url]);
  if (!url) return null;
  if (type === "image")
    return <img src={src} alt={title} style={{ maxWidth: "100%", borderRadius: 12 }} />;
  if (type === "video")
    return <video src={src} controls style={{ width: "100%", borderRadius: 12 }} />;
  if (type === "audio") return <audio src={src} controls style={{ width: "100%" }} />;
  if (type === "iframe")
    return (
      <div>
        <iframe
          title={title}
          src={src}
          style={{ width: "100%", height: "70vh", border: 0, borderRadius: 12 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <div style={{ marginTop: 8 }}>
          <a className="btn" href={open || src} target="_blank" rel="noreferrer">
            Open original
          </a>
        </div>
      </div>
    );
  return null;
}

/* ================= Page ================= */
export default function CefrModules() {
  const token = localStorage.getItem("token") || "";
  const navigate = useNavigate();

  const [placement, setPlacement] = useState({ loading: true });
  const [levelInfo, setLevelInfo] = useState(null);
  const [levelId, setLevelId] = useState(null);
  const [resources, setResources] = useState([]);
  const [loadingRes, setLoadingRes] = useState(false);

  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState({}); // { [resourceId]: true }

  // placement
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

  // level + resources
  useEffect(() => {
    const latest = placement?.latest;
    const code = (latest?.level || "").toUpperCase();
    if (!code) return;

    let alive = true;
    (async () => {
      try {
        setLoadingRes(true);
        const info = await fetchLevelByCode(code, token);
        if (!alive) return;
        const id = info?.id || latest?.level_id;
        setLevelInfo(info || { code });
        setLevelId(id);

        const items = await fetchCefrResources(id, token);
        if (!alive) return;
        setResources(items);
        setActive(0);

        // load local progress
        setProgress(readProgress(id));
      } catch (e) {
        console.error("cefr fetch error:", e);
      } finally {
        if (alive) setLoadingRes(false);
      }
    })();
    return () => (alive = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement?.latest, token]);

  // toggle complete (localStorage)
  const current = resources[active] || null;
  const isDone = current ? !!progress[current.id] : false;
  const toggleDone = () => {
    if (!current || !levelId) return;
    const next = { ...(progress || {}) };
    if (next[current.id]) delete next[current.id];
    else next[current.id] = true;
    setProgress(next);
    writeProgress(levelId, next);
  };

  const latest = placement.latest || null;
  const levelCode = (latest?.level || levelInfo?.code || "").toUpperCase();
  const levelLabel = LEVEL_LABEL[levelCode] || "Level";

  /* ================= Styles ================= */
  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
:root { --violet:#6b46c1; --violet-700:#553c9a; }
body { background:#fbfbfb; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }

/* layout */
.wrap{ display:grid; grid-template-columns: clamp(260px, 22vw, 360px) 1fr; gap: clamp(12px, 2vw, 24px); width:100%; max-width:100%; padding: 12px clamp(12px, 2vw, 24px); }
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

/* hero */
.hero{ background: radial-gradient(1200px 400px at 80% -20%, rgba(255,255,255,.25), transparent 60%), var(--violet); color:#fff; border-radius:18px; padding:22px; box-shadow: 0 10px 24px rgba(107,70,193,.20); }
.hero h2{ margin: 0 0 6px; font-weight: 800; font-size: clamp(18px, 2vw + 6px, 24px); }
.hero p{ margin: 8px 0 14px; opacity: .95; line-height: 1.6; }

/* titles & text */
.title{ font-size: clamp(24px, 2vw + 8px, 34px); font-weight:800; margin:0 0 10px; }
.subtle{ color:#64748b; }

/* steps (left) */
.step-list{ display:flex; flex-direction:column; gap:6px; }
.step{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:700; transition:.15s; border:1px solid transparent; }
.step:hover{ background:#eef2ff; border-color:#e9d5ff; box-shadow:0 2px 12px rgba(107,70,193,.10); transform: translateX(2px); }
.step.active{ background:#f1f5f9; }
.idx{ width:22px; text-align:right; opacity:.6; }
.badge-done{ display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#16a34a; }

/* skeleton */
@keyframes shimmer { 100% { transform: translateX(100%); } }
.skel{ background:#eef2f7; border-radius:12px; position:relative; overflow:hidden; }
.skel.shimmer::after{ content:""; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent); animation: shimmer 1.2s infinite; }
.skel-line{ height:14px; margin:10px 0; }
.skel-title{ height:32px; width:60%; margin:10px 0 14px; }

@media (max-width:1100px){ .wrap{ grid-template-columns: 1fr; padding:10px 12px; } }
`;

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

  return (
    <>
      <style>{styles}</style>

      <div className="wrap">
        {/* LEFT */}
        <aside className="panel left">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            {latest ? `Modules ${levelLabel}` : "Placement Test"}
          </div>

          {placement.loading ? (
            <>
              <div className="skel skel-title shimmer" />
              <div className="skel skel-line shimmer" />
              <div className="skel skel-line shimmer" style={{ width: "80%" }} />
            </>
          ) : !latest ? (
            <div className="hero" style={{ padding: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 4, color: "#fff" }}>Start Test</div>
              <button className="btn" style={{ background: "#fff" }} onClick={startPlacement}>
                Test Now
              </button>
            </div>
          ) : loadingRes ? (
            <>
              <div className="skel skel-line shimmer" />
              <div className="skel skel-line shimmer" />
              <div className="skel skel-line shimmer" />
            </>
          ) : resources.length === 0 ? (
            <div className="subtle">No modules yet for your level.</div>
          ) : (
            <div className="step-list">
              {resources.map((m, i) => {
                const done = !!progress[m.id];
                return (
                  <div
                    key={m.id ?? i}
                    className={`step ${i === active ? "active" : ""}`}
                    onClick={() => setActive(i)}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className="idx">{i + 1}.</span>
                      <span>{m.title || `Material ${i + 1}`}</span>
                    </div>
                    {done && (
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

        {/* RIGHT (Viewer ala Week Detail) */}
        <section className="panel right">
          <div className="breadcrumb">
            <Link to="/student">Dashboard</Link>
            <ChevronRight size={16} />
            <span>CEFR Modules</span>
          </div>

          {placement.loading || loadingRes ? (
            <>
              <div className="skel skel-title shimmer" />
              <div className="skel skel-line shimmer" />
              <div className="skel skel-line shimmer" style={{ width: "85%" }} />
            </>
          ) : !latest ? (
            <div className="hero">
              <h2>Placement Test</h2>
              <p>
                The Placement Test measures your English level (CEFR) and unlocks suitable
                modules. It takes ~30 minutes and is taken once.
              </p>
              <button className="btn" style={{ background: "#fff" }} onClick={startPlacement}>
                Test Now
              </button>
            </div>
          ) : resources.length === 0 ? (
            <div className="subtle">No CEFR-aligned content yet for your level.</div>
          ) : !current ? (
            <div className="subtle">Select a material from the left.</div>
          ) : (
            <div>
              <h1 className="title">{`${active + 1}. ${current.title || "Material"}`}</h1>

              {/* TEXT */}
              {current.text && (
                <section
                  style={{
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    marginBottom: 16,
                  }}
                >
                  {current.text}
                </section>
              )}

              {/* VIDEO */}
              {current.videoUrl && (
                <section style={{ margin: "16px 0" }}>
                  <div style={{ aspectRatio: "16 / 9", width: "100%" }}>
                    <iframe
                      title={current.title || "Video"}
                      src={buildEmbedUrl(current.videoUrl)}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: 0,
                        borderRadius: 12,
                      }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </section>
              )}

              {/* FILE */}
              {current.fileUrl && (
                <section style={{ marginTop: 16 }}>
                  <FileViewer url={current.fileUrl} title={current.title || "File"} />
                </section>
              )}

              {/* Controls (Prev/Next + Complete) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  marginTop: 22,
                }}
              >
                <button
                  className="btn"
                  disabled={active === 0}
                  onClick={() => setActive((i) => Math.max(0, i - 1))}
                >
                  Previous
                </button>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={`btn ${isDone ? "" : "btn-primary"}`}
                    onClick={toggleDone}
                    title="Toggle complete (local)"
                  >
                    {isDone ? "Marked as Complete" : "Mark as Complete"}
                  </button>
                  <button
                    className="btn"
                    disabled={active === resources.length - 1}
                    onClick={() =>
                      setActive((i) => Math.min(resources.length - 1, i + 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

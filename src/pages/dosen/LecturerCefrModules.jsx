// src/pages/lecture/CefrModules.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronRight,
  MoreVertical,
  PlusCircle,
  Menu,
  X,
  Save,
} from "lucide-react";
import { get, post, del } from "@/config/api"; // ← gunakan wrapper API (axios) satu pintu
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function absolutize(u) {
  const s = String(u || "");
  if (!s) return "";
  // jika sudah absolut, biarkan
  if (/^https?:\/\//i.test(s)) return s;
  // jika relatif, tempelkan ke API_BASE
  const base = API_BASE || "";
  return base + (s.startsWith("/") ? "" : "/") + s;
}

/* ================== Little utils ================== */
const resKey = (levelKey) => `cefr:${levelKey}:resources`;
const isNum = (v) => /^\d+$/.test(String(v || ""));

/* ===== build/embed helpers ===== */
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
    // ignore
  }
  return raw;
}
const buildEmbedUrl = (url) =>
  !url ? "" : url.includes("youtu") ? toYouTubeEmbed(url) : url;

function prepareEmbedSrc(rawUrl) {
  const url = absolutize(rawUrl);
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
  if (url.includes("docs.google.com/document"))
    return {
      type: "iframe",
      src: url.replace(/\/edit.*$/, "/pub?embedded=true"),
      open: url,
    };
  if (url.includes("docs.google.com/spreadsheets"))
    return {
      type: "iframe",
      src: url.replace(/\/edit.*$/, "/pubhtml?widget=true&headers=false"),
      open: url,
    };
  if (url.includes("docs.google.com/forms"))
    return {
      type: "iframe",
      src: url.replace(/\/viewform.*$/, "/viewform?embedded=true"),
      open: url,
    };
  if (url.includes("drive.google.com"))
    return {
      type: "iframe",
      src: url.replace(/\/view(\?.*)?$/, "/preview"),
      open: url,
    };

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
  const { type, src, open } = React.useMemo(() => prepareEmbedSrc(url), [url]);
  if (!url) return <div className="muted">No file URL.</div>;
  if (type === "image")
    return (
      <img
        src={src}
        alt={title}
        style={{ maxWidth: "100%", borderRadius: 12 }}
      />
    );
  if (type === "video")
    return (
      <video src={src} controls style={{ width: "100%", borderRadius: 12 }} />
    );
  if (type === "audio")
    return <audio src={src} controls style={{ width: "100%" }} />;
  if (type === "iframe")
    return (
      <div>
        <iframe
          title={title}
          src={src}
          style={{ width: "100%", height: "70vh", border: 0, borderRadius: 12 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
          allowFullScreen
          className="file-frame"
        />
        <div style={{ marginTop: 8 }}>
          <a
            className="btn"
            href={open || src}
            target="_blank"
            rel="noreferrer"
          >
            Open original
          </a>
        </div>
      </div>
    );
  return (
    <div>
      <div className="muted" style={{ marginBottom: 8 }}>
        File cannot be embedded. Try download:
      </div>
      <a className="btn" href={url} rel="noreferrer" target="_blank">
        Download
      </a>
    </div>
  );
}

/* ================== Normalizer ================== */
function normalizeResource(r) {
  const k = r?.resource || r || {};
  return {
    id: k.id,
    type: k.type || "composite",
    title: k.title || "",
    text: k.text ?? null,
    videoUrl: k.video_url ?? k.videoUrl ?? null,
    fileUrl: k.file_url ?? k.fileUrl ?? null,
  };
}

/* ================== API (via wrapper) ================== */
// 1) Header level
async function fetchLevelHeader(levelKey) {
  const path = isNum(levelKey)
    ? `cefr-levels/${levelKey}`
    : `cefr-levels/by-code/${encodeURIComponent(levelKey)}`;

  const j = await get(path);
  return j.level || j.data || j; // fleksibel mengikuti backend
}

// 2) Daftar resources untuk level
async function fetchCefrResources(levelId) {
  const j = await get(`cefr-levels/${levelId}/resources`);
  const arr = Array.isArray(j) ? j : j.resources || j.data || [];
  return (arr || []).map(normalizeResource);
}

// 3) Create / Update / Delete
async function createCefrResource(levelId, payload) {
  const fd = new FormData();
  fd.append("type", "composite");
  fd.append("title", payload.title || "");
  if (payload.includeText) fd.append("text", payload.text || "");
  if (payload.includeVideo) fd.append("video_url", payload.videoUrl || "");
  if (payload.includeFile && payload.file) fd.append("file", payload.file);
  if (payload.includeFile && payload.fileUrl)
    fd.append("file_url", payload.fileUrl);

  // gunakan wrapper post (axios). Jangan set Content-Type secara manual agar FormData terdeteksi.
  const res = await post(`cefr-levels/${levelId}/resources`, fd);
  return normalizeResource(res);
}

async function updateResource(resourceId, payload) {
  const fd = new FormData();
  fd.append("_method", "PUT");
  fd.append("type", "composite");
  fd.append("title", payload.title || "");
  fd.append("text", payload.includeText ? payload.text || "" : "");
  fd.append("video_url", payload.includeVideo ? payload.videoUrl || "" : "");
  if (payload.includeFile && payload.file) fd.append("file", payload.file);
  if (payload.includeFile) fd.append("file_url", payload.fileUrl || "");

  const res = await post(`cefr-resources/${resourceId}`, fd);
  return normalizeResource(res);
}

async function deleteResource(resourceId) {
  await del(`cefr-resources/${resourceId}`);
  return true;
}

/* ================== Edit Material Modal ================== */
function EditMaterialModal({ open, data, onClose, onSave }) {
  const safe = React.useMemo(
    () =>
      data ?? {
        id: null,
        type: "composite",
        title: "",
        includeText: false,
        includeVideo: false,
        includeFile: false,
        text: "",
        videoUrl: "",
        fileUrl: "",
      },
    [data]
  );
  const [form, setForm] = useState(safe);
  const [localFile, setLocalFile] = useState(null);
  useEffect(() => setForm(safe), [safe]);

  if (!open) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width: "100%", maxWidth: 720, padding: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 800 }}>
            {form?.id ? "Update Material" : "Add Material"}
          </div>
          <button className="inline-btn" onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>

        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
            Title
          </label>
          <input
            className="input"
            value={form.title ?? ""}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
            Include:
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.includeText}
              onChange={(e) => set({ includeText: e.target.checked })}
            />{" "}
            Text
          </label>
          <label style={{ marginLeft: 10 }}>
            <input
              type="checkbox"
              checked={form.includeVideo}
              onChange={(e) => set({ includeVideo: e.target.checked })}
            />{" "}
            Video (URL)
          </label>
          <label style={{ marginLeft: 10 }}>
            <input
              type="checkbox"
              checked={form.includeFile}
              onChange={(e) => set({ includeFile: e.target.checked })}
            />{" "}
            File (upload/URL)
          </label>
        </div>

        {form.includeText && (
          <div style={{ marginTop: 10 }}>
            <label
              style={{ fontWeight: 700, display: "block", marginBottom: 6 }}
            >
              Content
            </label>
            <textarea
              className="textarea"
              value={form.text || ""}
              onChange={(e) => set({ text: e.target.value })}
            />
          </div>
        )}

        {form.includeVideo && (
          <div style={{ marginTop: 10 }}>
            <label
              style={{ fontWeight: 700, display: "block", marginBottom: 6 }}
            >
              Video URL
            </label>
            <input
              className="input"
              value={form.videoUrl || ""}
              onChange={(e) => set({ videoUrl: e.target.value })}
            />
          </div>
        )}

        {form.includeFile && (
          <div style={{ marginTop: 10 }}>
            <label
              style={{ fontWeight: 700, display: "block", marginBottom: 6 }}
            >
              File (upload or URL)
            </label>
            <input
              className="input"
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              onChange={(e) => setLocalFile(e.target.files?.[0] || null)}
            />
            <div style={{ height: 8 }} />
            <input
              className="input"
              placeholder="Or File URL"
              value={form.fileUrl || ""}
              onChange={(e) => set({ fileUrl: e.target.value })}
            />
            <div className="cmt-meta" style={{ marginTop: 6 }}>
              Use either upload or URL.
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 14,
          }}
        >
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({ ...form, file: localFile || null })}
          >
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================== Main Page ================== */
export default function LecturerCefrModules() {
  const { level } = useParams(); // e.g. "A1" atau "3"
  const role = localStorage.getItem("role") || "dosen";

  const [levelInfo, setLevelInfo] = useState(null);
  const [levelId, setLevelId] = useState(null);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  // menus & modal
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);

  // drawer (mobile)
  const [sideOpen, setSideOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = sideOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [sideOpen]);

  useEffect(() => {
    const onDoc = (e) => {
      if (addRef.current && !addRef.current.contains(e.target))
        setAddOpen(false);
      if (actionsRef.current && !actionsRef.current.contains(e.target))
        setActionsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // load level + resources (with cache)
  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Header
      let info = null;
      try {
        info = await fetchLevelHeader(level);
        setLevelInfo(info);
        setLevelId(info?.id || (isNum(level) ? Number(level) : null));
      } catch (e) {
        console.error(e);
        setLevelInfo(null);
        setLevelId(isNum(level) ? Number(level) : null);
      }

      // 2) tampilkan cache dulu (jika ada)
      try {
        const raw = localStorage.getItem(resKey(level));
        const cached = raw ? JSON.parse(raw) : [];
        if (Array.isArray(cached) && cached.length) {
          setItems(cached);
          setActive(0);
        }
      } catch {
        // ignore
      }

      // 3) fetch fresh dari server (butuh levelId valid)
      try {
        const vids = info?.id || (isNum(level) ? Number(level) : null);
        if (!vids) throw new Error("Level id missing");
        const fresh = await fetchCefrResources(vids);
        setItems(fresh);
        localStorage.setItem(resKey(level), JSON.stringify(fresh));
        setActive(0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [level]);

  const current = items[active] || null;

  function openAdd(target = null) {
    const base = {
      id: target?.id ?? null,
      type: "composite",
      title: target?.title || "",
      text: target?.text || "",
      videoUrl: target?.videoUrl || "",
      fileUrl: target?.fileUrl || "",
      includeText: !!target?.text,
      includeVideo: !!target?.videoUrl,
      includeFile: !!target?.fileUrl,
    };
    setEditing(base);
    setShowEdit(true);
    setAddOpen(false);
    setSideOpen(false);
  }

  async function saveMaterial(updated) {
    if (!updated.includeText && !updated.includeVideo && !updated.includeFile) {
      alert("Pilih minimal satu: Text, Video, atau File.");
      return;
    }
    try {
      let saved;
      if (updated.id) {
        saved = await updateResource(updated.id, updated);
      } else {
        if (!levelId) throw new Error("Missing level id");
        saved = await createCefrResource(levelId, updated);
      }

      const existed = items.some((p) => p.id === saved.id);
      setItems((prev) => {
        const next = existed
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved];
        localStorage.setItem(resKey(level), JSON.stringify(next));
        return next;
      });

      setShowEdit(false);
      setActive(existed ? active : items.length);
    } catch (e) {
      alert(e.message || "Failed to save");
    }
  }

  async function handleDelete() {
    if (!current?.id) return;
    if (!confirm("Delete this material?")) return;
    try {
      await deleteResource(current.id);
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== current.id);
        localStorage.setItem(resKey(level), JSON.stringify(next));
        return next;
      });
      setActive((i) => Math.max(0, i - 1));
    } catch (e) {
      alert(e.message || "Failed to delete");
    }
  }

  /* ================== Styles (compact) ================== */
  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
:root { --violet:#6b46c1; --violet-700:#553c9a; }
body { background:#fbfbfb; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }

.wrap{ display:grid; grid-template-columns: clamp(260px, 22vw, 360px) 1fr; gap: clamp(12px,2vw,24px); width:100%; max-width:100%; padding: 12px clamp(12px, 2vw, 24px); }
.panel{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; }
.left{ padding:12px; }
.right{ padding:18px; min-height:60vh; }

.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin:12px 0 6px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }

.btn, .inline-btn{ padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; font-weight:700; cursor:pointer; }
.btn:hover, .inline-btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); color:#fff; border-color:var(--violet); }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }

.left-top{ display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.step-list{ display:flex; flex-direction:column; gap:6px; }
.step{ display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:600; transition:.15s; border:1px solid transparent; }
.step:hover{ background:#eef2ff; border-color:#e9d5ff; box-shadow:0 2px 12px rgba(107,70,193,.10); transform: translateX(2px); }
.step.active{ background:#f1f5f9; }
.idx{ width:22px; text-align:right; opacity:.6; }

.title{ font-size: clamp(22px, 2vw + 6px, 34px); font-weight:800; margin:0 0 10px; }
.muted,.cmt-meta{ color:#64748b; }
.viewer{ margin-top:8px; }

.actions-menu{ position:relative; }
.actions-menu .dropdown{ position:absolute; right:0; top:42px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 10px 24px rgba(0,0,0,.08); min-width:220px; padding:6px; z-index:30; }
.actions-menu .dropdown button{ font-weight:600; font-size:14.5px; color:#0f172a; background:#fff; border:0; width:100%; text-align:left; padding:10px 12px; border-radius:10px; cursor:pointer; }
.actions-menu .dropdown button:hover{ background:#f1f5f9; }

.input,.textarea{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }
.textarea{ min-height:90px; resize:vertical; }

.mobile-top{ display:none; align-items:center; gap:10px; margin:4px 0 10px; }
.hamburger{ display:none; border:1px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px; }
.backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:1000; display:none; }
.backdrop.show{ display:block; }

@media (max-width:1100px){
  .wrap{ grid-template-columns: 1fr; padding:10px 12px; }
  .left{ position: fixed; left:0; top:0; bottom:0; width: 86vw; max-width: 360px; transform: translateX(-100%); transition: transform .25s ease; z-index: 1001; overflow: auto; }
  .left.open{ transform: translateX(0); }
  .mobile-top{ display:flex; }
  .hamburger{ display:inline-flex; }
}
`;

  return (
    <>
      <style>{styles}</style>

      {sideOpen && (
        <div className="backdrop show" onClick={() => setSideOpen(false)} />
      )}

      <div className="wrap">
        {/* LEFT */}
        <aside className={`panel left ${sideOpen ? "open" : ""}`}>
          <div className="left-top">
            <div style={{ fontWeight: 800 }}>
              Modules {levelInfo?.code || String(level).toUpperCase()}
            </div>

            {role === "dosen" && (
              <div className="actions-menu" ref={addRef}>
                <button
                  className="inline-btn btn-primary"
                  onClick={() => setAddOpen((s) => !s)}
                  title="Add"
                >
                  <PlusCircle size={16} />
                </button>
                {addOpen && (
                  <div className="dropdown">
                    <button onClick={() => openAdd(null)}>Add Material</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="step-list">
            {loading ? (
              <>
                <div className="skel shimmer" style={{ height: 44 }} />
                <div className="skel shimmer" style={{ height: 44 }} />
                <div className="skel shimmer" style={{ height: 44 }} />
              </>
            ) : items.length === 0 ? (
              <div className="muted">No content yet.</div>
            ) : (
              items.map((it, i) => (
                <div
                  key={it.id}
                  className={`step ${i === active ? "active" : ""}`}
                  onClick={() => {
                    setActive(i);
                    setSideOpen(false);
                  }}
                >
                  <span className="idx">{i + 1}.</span>
                  <span>{it.title || `Material ${i + 1}`}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT */}
        <section className="panel right">
          <div className="mobile-top">
            <button
              className="hamburger"
              aria-label="Open sidebar"
              onClick={() => setSideOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div style={{ fontWeight: 800 }}>
              CEFR {levelInfo?.code || String(level).toUpperCase()}
            </div>
          </div>

          <div className="breadcrumb">
            <Link to="/lecture">Dashboard</Link>
            <ChevronRight size={16} />
            <span>CEFR Modules</span>
            <ChevronRight size={16} />
            <span>
              {levelInfo?.name ||
                levelInfo?.code ||
                String(level).toUpperCase()}
            </span>
          </div>

          {role === "dosen" && items.length > 0 && (
            <div
              className="toolbar"
              style={{ display: "flex", justifyContent: "flex-end" }}
            >
              <div className="actions-menu" ref={actionsRef}>
                <button
                  className="inline-btn"
                  onClick={() => setActionsOpen((s) => !s)}
                  title="Actions"
                >
                  <MoreVertical size={18} />
                </button>
                {actionsOpen && (
                  <div className="dropdown">
                    <button onClick={() => openAdd(current)}>Edit</button>
                    <button onClick={handleDelete} style={{ color: "#b91c1c" }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="viewer">
              <div className="skel skel-title shimmer" />
              <div className="skel skel-line shimmer" />
              <div
                className="skel skel-line shimmer"
                style={{ width: "90%" }}
              />
              <div
                className="skel skel-iframe shimmer"
                style={{ marginTop: 14 }}
              />
            </div>
          ) : !current ? (
            <div className="muted">No content found for this level.</div>
          ) : (
            <div className="viewer">
              <h1 className="title">{`${active + 1}. ${
                current.title || "Material"
              }`}</h1>

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

              {current.fileUrl && (
                <section style={{ marginTop: 16 }}>
                  <FileViewer
                    url={current.fileUrl}
                    title={current.title || "File"}
                  />
                </section>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
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
                <button
                  className="btn"
                  disabled={active === items.length - 1}
                  onClick={() =>
                    setActive((i) => Math.min(items.length - 1, i + 1))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      <EditMaterialModal
        open={showEdit}
        data={editing}
        onClose={() => setShowEdit(false)}
        onSave={saveMaterial}
      />
    </>
  );
}

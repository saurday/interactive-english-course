import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  Save as SaveIcon,
  Upload,
  Hash,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ---------- Toast sederhana ---------- */
function Toast({ open, text }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          background: "#111827",
          color: "#fff",
          padding: "12px 16px",
          borderRadius: 10,
          boxShadow: "0 12px 30px rgba(0,0,0,.25)",
          fontWeight: 700,
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function AssignmentBuilder() {
  const { id: classId, week, assignmentId } = useParams();
  const isEdit = Boolean(assignmentId);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    title: "",
    instructions: "",
    due_date: "",
    max_score: 100,
    allow_file: true,
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, text: "" });
  const showToast = (text) => {
    setToast({ open: true, text });
    setTimeout(() => setToast({ open: false, text: "" }), 1300);
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // === LOAD DATA KALAU MODE EDIT ===
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/assignments/${assignmentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!r.ok) throw new Error(`Load assignment failed (${r.status})`);
        const { assignment } = await r.json();
        setForm({
          title: assignment.title || "",
          instructions: assignment.instructions || "",
          // untuk input type="datetime-local"
          due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : "",
          max_score: assignment.max_score ?? 100,
          allow_file: !!assignment.allow_file,
        });
      } catch (e) {
        console.error(e);
        showToast(e.message || "Failed to load");
      }
    })();
  }, [isEdit, assignmentId, token]);

  async function getWeekIdByNumber(classId, weekNumber, token) {
    const r = await fetch(`${BASE_URL}/api/kelas/${classId}/weeks`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`Load weeks failed (${r.status})`);
    const list = await r.json();
    const w = (Array.isArray(list) ? list : list.weeks || []).find(
      (x) => Number(x.week_number ?? x.week) === Number(weekNumber)
    );
    return w?.id || null;
  }

  const save = async () => {
    if (!form.title.trim()) return showToast("Title is required");

    try {
      setSaving(true);

      // 0) pastikan kita punya week_id
      const weekId = await getWeekIdByNumber(classId, week, token);
      if (!weekId) throw new Error("Week not found");

      // 1) buat assignment
      const ra = await fetch(`${BASE_URL}/api/assignments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          instructions: form.instructions,
          due_date: form.due_date || null,
          max_score: Number(form.max_score) || 100,
          allow_file: !!form.allow_file,
          kelas_id: classId,
        }),
      });
      if (!ra.ok) throw new Error(`Create assignment failed (${ra.status})`);
      const aJson = await ra.json();
      const assignmentId = (aJson.assignment || aJson).id;

      // 2) tempel ke week sebagai course resource (type: assignment)
      const fd = new FormData();
      fd.append("type", "assignment");
      fd.append("title", form.title);
      fd.append("assignment_id", assignmentId);

      const rr = await fetch(`${BASE_URL}/api/weeks/${weekId}/resources`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: fd,
      });
      if (!rr.ok) throw new Error(`Create resource failed (${rr.status})`);

      showToast("Assignment saved!");
      navigate(`/lecture/classes/${classId}/weeks/${week}`);
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to save assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&display=swap');
:root { --violet:#6b46c1; --violet-700:#553c9a; }
.as-root{ font-family: Inter, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#fbfbfb; }

.wrap{
  display:grid;
  grid-template-columns: clamp(240px,20vw,320px) 1fr;
  gap: clamp(12px,2vw,24px);
  width:100%; max-width:95%;
  margin:0; padding: 12px clamp(12px,2vw,24px);
}
@media (max-width:1100px){ .wrap{ grid-template-columns: 1fr; max-width:100%; padding:10px 12px; } }

.panel{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; }
.left{ padding:12px; }
.right{ padding:18px; min-height:60vh; }

.title{ font-size: clamp(22px, 2vw + 6px, 34px); font-weight:800; margin:0 0 10px; }
.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin:6px 0 14px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }

.btn{ padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; font-weight:700; cursor:pointer; }
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); color:#fff; border-color:var(--violet); }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }

.input,.textarea{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }
.textarea{ min-height:110px; resize:vertical; }

.meta-grid{ display:grid; gap:10px; }
.form-row{
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
}
.field{ display:grid; gap:6px; min-width:220px; }
.field label{ font-weight:700; font-size:14px; color:#0f172a; }
.with-icon{ display:flex; align-items:center; gap:8px; }
.with-icon .input{ flex:1; }

.side-title{ font-weight:800; }
.side-kv{ display:flex; justify-content:space-between; gap:8px; font-size:14px; }
.side-kv .k{ color:#64748b; }
.side-actions{ display:grid; gap:8px; margin-top:10px; }

.bottom-actions{
  display:flex; justify-content:flex-end; gap:8px; margin-top:12px;
}
@media (max-width:640px){
  .bottom-actions{
    position: sticky; bottom: 0;
    background: linear-gradient(180deg, transparent, #fff 45%);
    padding-top: 10px; padding-bottom: 10px;
  }
}
      `}</style>

      <div className="as-root">
        <div className="wrap">
          {/* ===== Sidebar (info & tips) ===== */}
          <aside className="panel left">
            <div className="side-title">
              {isEdit ? "Edit Assignment" : "Create Assignment"}
            </div>{" "}
            <div className="side-kv">
              <span className="k">Class</span>
              <span>#{classId}</span>
            </div>
            <div className="side-kv">
              <span className="k">Week</span>
              <span>{week}</span>
            </div>
            <hr
              style={{
                border: "none",
                borderTop: "1px solid #eef2f7",
                margin: "10px 0",
              }}
            />
            <div className="side-title" style={{ fontSize: 14 }}>
              Tips
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              <li>
                Isi <b>Due date</b> jika tugas punya tenggat.
              </li>
              <li>
                <b>Max score</b> default 100, bisa diubah.
              </li>
              <li>
                Aktifkan <b>Allow file upload</b> jika siswa harus unggah
                berkas.
              </li>
            </ul>
          </aside>

          {/* ===== Main ===== */}
          <section className="panel right">
            {/* Breadcrumbs */}
            <div className="breadcrumb">
              <Link to="/lecture">Dashboard</Link>
              <ChevronRight size={16} />
              <Link to={`/lecture/classes/${classId}`}>Class</Link>
              <ChevronRight size={16} />
              <Link to={`/lecture/classes/${classId}/weeks/${week}`}>
                Week {week}
              </Link>
              <ChevronRight size={16} />
              <span>
                {isEdit ? "Edit Assignment" : "Create Assignment"}
              </span>{" "}
            </div>

            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <h1 className="title" style={{ marginBottom: 4 }}>
                {isEdit ? "Edit Assignment" : "Create Assignment"} —{" "}
                <span style={{ color: "#64748b", fontWeight: 700 }}>
                  Week {week}
                </span>
              </h1>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  to={`/lecture/classes/${classId}/weeks/${week}`}
                  className="btn"
                  style={{ textDecoration: "none" }}
                >
                  <ChevronLeft size={16} /> Back to week
                </Link>
              </div>
            </div>

            {/* Form */}
            <div className="panel" style={{ padding: 16, marginTop: 10 }}>
              <div className="meta-grid">
                <div className="field">
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    className="input"
                    placeholder="Assignment title"
                    value={form.title}
                    onChange={(e) => set({ title: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="ins">Instructions</label>
                  <textarea
                    id="ins"
                    className="textarea"
                    placeholder="Write instructions for students..."
                    value={form.instructions}
                    onChange={(e) => set({ instructions: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div
                    className="field"
                    style={{ minWidth: 240, flex: "1 1 240px" }}
                  >
                    <label>Due date</label>
                    <div className="with-icon">
                      <Clock size={16} />
                      <input
                        className="input"
                        type="datetime-local"
                        value={form.due_date}
                        onChange={(e) => set({ due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="field" style={{ minWidth: 180 }}>
                    <label>Max score</label>
                    <div className="with-icon">
                      <Hash size={16} />
                      <input
                        className="input"
                        type="number"
                        min={1}
                        placeholder="Max score"
                        value={form.max_score}
                        onChange={(e) => set({ max_score: e.target.value })}
                      />
                    </div>
                  </div>

                  <label className="field" style={{ minWidth: 200 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      Submission
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.allow_file}
                        onChange={(e) => set({ allow_file: e.target.checked })}
                      />
                      <Upload size={16} />
                      Allow file upload
                    </span>
                  </label>
                </div>
              </div>

              <div className="bottom-actions">
                <button className="btn" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? (
                    "Saving…"
                  ) : (
                    <>
                      <SaveIcon size={16} /> Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Overlay saving */}
      {saving && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.25)",
            display: "grid",
            placeItems: "center",
            zIndex: 9998,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "10px 14px",
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            Saving…
          </div>
        </div>
      )}

      <Toast open={toast.open} text={toast.text} />
    </>
  );
}

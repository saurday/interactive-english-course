// src/pages/dosen/QuizBuilder.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Save as SaveIcon,
  PlusCircle,
  Trash2,
  Clock,
  Shuffle,
} from "lucide-react";

const BASE_URL = "http://localhost:8000";

// Toast sederhana
function Toast({ open, text }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", zIndex: 9999, pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto", background: "#111827", color: "white", padding: "12px 16px", borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,.25)" }}>
        {text}
      </div>
    </div>
  );
}

export default function QuizBuilder() {
  const { id: classId, week, quizId } = useParams(); // ⬅️ quizId optional
  const isEdit = !!quizId;
  const [sp] = useSearchParams();
  const weekId = sp.get("wid") || week;
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const defaultType = sp.get("type") === "short" ? "short" : "mcq";

  const [meta, setMeta] = useState({
    title: "",
    instructions: "",
    time_limit: 0,
    shuffle: true,
  });

  // Struktur state pertanyaan — saat edit, kita simpan id question & id option jika ada
  const [questions, setQuestions] = useState([
    defaultType === "mcq"
      ? { id: null, type: "mcq", prompt: "", options: ["", "", "", ""], answer: 0, __optionIds: [null, null, null, null] }
      : { id: null, type: "short", prompt: "", answers: "" },
  ]);

  const addMcq = () =>
    setQuestions((q) => [
      ...q,
      { id: null, type: "mcq", prompt: "", options: ["", "", "", ""], answer: 0, __optionIds: [null, null, null, null] },
    ]);
  const addShort = () =>
    setQuestions((q) => [...q, { id: null, type: "short", prompt: "", answers: "" }]);

  const updateQ = (idx, patch) =>
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  const removeQ = (idx) => setQuestions((qs) => qs.filter((_, i) => i !== idx));

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, text: "" });
  const showToast = (text) => {
    setToast({ open: true, text });
    setTimeout(() => setToast({ open: false, text: "" }), 1400);
  };

  /* ======================== EDIT MODE: preload data ======================== */
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`Load quiz failed (${r.status})`);
        const json = await r.json();
        const q = json.data || json.quiz || json;

        // meta
        setMeta({
          title: q.title ?? "",
          instructions: q.instructions ?? "",
          time_limit: Number(q.time_limit ?? 0),
          shuffle: !!(q.shuffle ?? true),
        });

        // questions → map ke bentuk builder
        const qs = (q.questions ?? []).map((qq) => {
          const t = String(qq.type || "").toUpperCase();
          const prompt = qq.question_text ?? qq.text ?? "";
          if (t === "SHORT_ANSWER") {
            const ans = Array.isArray(qq.answers) ? qq.answers.join(", ") : String(qq.answers || "");
            return { id: qq.id, type: "short", prompt, answers: ans };
          }
          // multiple choice
          const opts = (qq.options ?? []).map((op) => op.option_text ?? op.text ?? "");
          const ids  = (qq.options ?? []).map((op) => op.id ?? null);
          let correctIdx = (qq.options ?? []).findIndex((op) => !!op.is_correct);
          if (correctIdx < 0) correctIdx = 0;
          return { id: qq.id, type: "mcq", prompt, options: opts, answer: correctIdx, __optionIds: ids };
        });

        setQuestions(qs.length ? qs : []);
      } catch (e) {
        console.error(e);
        showToast(e.message || "Failed to load quiz");
      }
    })();
  }, [isEdit, quizId, token]);

  /* ======================== SAVE (create or update) ======================== */
  async function save() {
    if (!meta.title.trim()) return showToast("Title is required");
    if (questions.length === 0) return showToast("Add at least 1 question");

    try {
      setSaving(true);

      if (!isEdit) {
        // ========== CREATE ==========
        const payload = {
          title: meta.title.trim(),
          instructions: meta.instructions || "",
          time_limit: Number(meta.time_limit) || 0,
          shuffle: !!meta.shuffle,
          week_id: Number(week),
          class_id: Number(classId),
          items: questions.map((q) =>
            q.type === "mcq"
              ? {
                  type: "mcq",
                  prompt: q.prompt || "",
                  options: q.options.map(String),
                  answer: Number(q.answer) || 0,
                }
              : {
                  type: "short",
                  prompt: q.prompt || "",
                  answers: String(q.answers || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }
          ),
        };

        const r1 = await fetch(`${BASE_URL}/api/quizzes`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!r1.ok) throw new Error(`Create quiz failed (${r1.status}) ${await r1.text().catch(() => "")}`);
        const quizJson = await r1.json();
        const createdQuiz = quizJson.quiz || quizJson;
        const newQuizId = createdQuiz.id;

        // Buat CourseResource (type: quiz)
        const fd = new FormData();
        fd.append("type", "quiz");
        fd.append("title", meta.title || "");
        fd.append("quiz_id", String(newQuizId));

        const r2 = await fetch(`${BASE_URL}/api/weeks/${weekId}/resources`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          body: fd,
        });
        if (!r2.ok) throw new Error(`Create resource failed (${r2.status}) ${await r2.text().catch(() => "")}`);

        // Cache ringan supaya sidebar WeekDetail langsung update (opsional)
        try {
          const key = `resources:${classId}`;
          const raw = localStorage.getItem(key);
          const all = raw ? JSON.parse(raw) : [];
          const resource = (await r2.json()).resource || {};
          const newItem = {
            id: resource.id,
            week: Number(week),
            weekId: Number(resource.week_id || weekId),
            type: "quiz",
            title: meta.title || `Quiz ${questions.length}`,
            quiz_id: newQuizId,
            quiz: {
              id: newQuizId,
              title: meta.title,
              instructions: meta.instructions,
              time_limit: Number(meta.time_limit) || 0,
              shuffle: !!meta.shuffle,
              items: payload.items,
            },
          };
          const rest = (Array.isArray(all) ? all : []).filter((x) => Number(x.id) !== Number(newItem.id));
          localStorage.setItem(key, JSON.stringify([...rest, newItem]));
       } catch {
        /* ignore */
      }

        showToast("Quiz created");
      } else {
        // ========== UPDATE ==========
        // payload versi update (pakai 'questions' + is_correct)
        const payload = {
          title: meta.title.trim(),
          instructions: meta.instructions || "",
          time_limit: Number(meta.time_limit) || 0,
          shuffle: !!meta.shuffle,
          questions: questions.map((q) =>
            q.type === "mcq"
              ? {
                  id: q.id ?? undefined,
                  type: "multiple_choice",
                  question_text: q.prompt || "",
                  options: q.options.map((text, idx) => ({
                    id: Array.isArray(q.__optionIds) ? q.__optionIds[idx] ?? undefined : undefined,
                    option_text: String(text),
                    is_correct: Number(q.answer) === idx,
                  })),
                }
              : {
                  id: q.id ?? undefined,
                  type: "short_answer",
                  question_text: q.prompt || "",
                  answers: String(q.answers || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }
          ),
        };

        const r = await fetch(`${BASE_URL}/api/quizzes/${quizId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`Update failed (${r.status}) ${await r.text().catch(() => "")}`);

        // segarkan cache lokal (opsional)
        try {
          const key = `resources:${classId}`;
          const raw = localStorage.getItem(key);
          const all = raw ? JSON.parse(raw) : [];
          const next = (Array.isArray(all) ? all : []).map((it) =>
            it.type === "quiz" && (Number(it.quiz_id) === Number(quizId) || Number(it.quizId) === Number(quizId))
              ? {
                  ...it,
                  title: meta.title || it.title,
                  quiz: {
                    id: Number(quizId),
                    title: meta.title,
                    instructions: meta.instructions,
                    time_limit: Number(meta.time_limit) || 0,
                    shuffle: !!meta.shuffle,
                    // simpan bentuk "items" sederhana agar viewer bisa render cepat
                    items: questions.map((q) =>
                      q.type === "mcq"
                        ? { type: "mcq", prompt: q.prompt, options: q.options, answer: Number(q.answer) || 0 }
                        : {
                            type: "short",
                            prompt: q.prompt,
                            answers: String(q.answers || "")
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }
                    ),
                  },
                }
              : it
          );
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
        /* ignore */
      }

        showToast("Quiz updated");
      }

      // kembali ke halaman week
      navigate(`/lecture/classes/${classId}/weeks/${week}`);
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{css}</style>

      <div className="qb-root">
        <div className="wrap">
          {/* ===== Sidebar ===== */}
          <aside className="panel left">
            <div className="side-box">
              <div className="side-title">{isEdit ? "Edit Quiz" : "Create Quiz"}</div>
              <div className="side-kv"><span className="k">Class</span><span>#{classId}</span></div>
              <div className="side-kv"><span className="k">Week</span><span>{week}</span></div>

              <hr style={{ border: "none", borderTop: "1px solid #eef2f7" }} />
              <div className="side-title" style={{ fontSize: 14 }}>Tips</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#64748b", lineHeight: 1.6 }}>
                <li>Centang <b>Shuffle questions</b> untuk acak urutan soal.</li>
                <li>Short-answer: pisahkan beberapa jawaban dengan koma.</li>
                <li>Set <b>Time limit</b> ke 0 untuk tanpa batas waktu.</li>
              </ul>
            </div>
          </aside>

          {/* ===== Main ===== */}
          <section className="panel right">
            {/* Breadcrumbs */}
            <div className="breadcrumb">
              <Link to="/lecture">Dashboard</Link>
              <ChevronRight size={16} />
              <Link to={`/lecture/classes/${classId}`}>Class</Link>
              <ChevronRight size={16} />
              <Link to={`/lecture/classes/${classId}/weeks/${week}`}>Week {week}</Link>
              <ChevronRight size={16} />
              <span>{isEdit ? "Edit Quiz" : "Create Quiz"}</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h1 className="title" style={{ marginBottom: 4 }}>
                {isEdit ? "Edit Quiz" : "Create Quiz"} —{" "}
                <span style={{ color: "#64748b", fontWeight: 700 }}>Week {week}</span>
              </h1>
              <div style={{ display: "flex", gap: 8 }}>
                <Link to={`/lecture/classes/${classId}/weeks/${week}`} className="btn" style={{ textDecoration: "none" }}>
                  <ChevronLeft size={16} /> Back to week
                </Link>
              </div>
            </div>

            {/* Meta panel */}
            <div className="panel" style={{ padding: 16, marginTop: 10 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <input className="input" placeholder="Quiz title" value={meta.title}
                  onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} />
                <textarea className="textarea" placeholder="Instructions" value={meta.instructions}
                  onChange={(e) => setMeta((m) => ({ ...m, instructions: e.target.value }))} />
                <div className="meta-row">
                  <div className="meta-item">
                    <Clock size={16} />
                    <input className="input" type="number" min={0} placeholder="Time limit (minutes, 0 = no limit)"
                      value={meta.time_limit}
                      onChange={(e) => setMeta((m) => ({ ...m, time_limit: e.target.value }))} style={{ width: 260 }} />
                  </div>
                  <label className="meta-item">
                    <Shuffle size={16} />
                    <input type="checkbox" checked={meta.shuffle}
                      onChange={(e) => setMeta((m) => ({ ...m, shuffle: e.target.checked }))} />
                    Shuffle questions
                  </label>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="panel" style={{ padding: 16, marginTop: 12 }}>
              <ol style={{ margin: 0, paddingLeft: 22 }}>
                {questions.map((q, i) => (
                  <li key={i} style={{ marginBottom: 12 }}>
                    <div className="q-card">
                      <div className="q-head">
                        <span className="q-badge">{q.type === "mcq" ? "Multiple choice" : "Short answer"}</span>
                        <button className="q-del" onClick={() => removeQ(i)}>
                          <Trash2 size={16} /> Remove
                        </button>
                      </div>

                      <input className="input" placeholder={`Q${i + 1} prompt`} value={q.prompt}
                        onChange={(e) => updateQ(i, { prompt: e.target.value })} />

                      {q.type === "mcq" ? (
                        <div style={{ marginTop: 6 }}>
                          {q.options.map((opt, j) => (
                            <div key={j} className="opt-row">
                              <input type="radio" name={`ans-${i}`} checked={Number(q.answer) === j}
                                onChange={() => updateQ(i, { answer: j })} />
                              <input className="input" placeholder={`Option ${String.fromCharCode(65 + j)}`}
                                value={opt}
                                onChange={(e) => {
                                  const next = [...q.options];
                                  next[j] = e.target.value;
                                  const ids = Array.isArray(q.__optionIds) ? [...q.__optionIds] : [];
                                  updateQ(i, { options: next, __optionIds: ids });
                                }} />
                            </div>
                          ))}
                          {/* tombol tambah opsi (opsional) */}
                          <div style={{ marginTop: 8 }}>
                            <button
                              className="btn small"
                              onClick={() => {
                                const next = [...q.options, ""];
                                const ids = Array.isArray(q.__optionIds) ? [...q.__optionIds, null] : [null];
                                updateQ(i, { options: next, __optionIds: ids });
                              }}
                            >
                              <PlusCircle size={16} /> Add option
                            </button>
                          </div>
                        </div>
                      ) : (
                        <input className="input" style={{ marginTop: 8 }}
                          placeholder="Acceptable answers (comma-separated)"
                          value={q.answers}
                          onChange={(e) => updateQ(i, { answers: e.target.value })} />
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              <div className="bottom-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-primary" onClick={addMcq}>
                    <PlusCircle size={16} /> Add MCQ
                  </button>
                  <button className="btn" onClick={addShort}>
                    <PlusCircle size={16} /> Add Short-answer
                  </button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => navigate(-1)}>Cancel</button>
                  <button className="btn btn-primary" onClick={save} disabled={saving}>
                    <SaveIcon size={16} /> {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>

              {saving && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", display: "grid", placeItems: "center", zIndex: 9998 }}>
                  <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 10, fontWeight: 700 }}>Saving quiz…</div>
                </div>
              )}
              <Toast open={toast.open} text={toast.text} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&display=swap');
:root { --violet:#6b46c1; --violet-700:#553c9a; }
.qb-root{ font-family: Inter, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#fbfbfb; }

.wrap{
  display:grid;
  grid-template-columns: clamp(240px,20vw,320px) 1fr;
  gap: clamp(12px,2vw,24px);
  width:100%;
  max-width:95%;
  margin:0;
  padding: 12px clamp(12px,2vw,24px);
}
@media (max-width:1100px){ .wrap{ grid-template-columns: 1fr; max-width:100%; padding:10px 12px; } }

.panel{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; }
.left{ padding:12px; }
.right{ padding:18px; min-height:60vh; }

.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin:6px 0 14px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }

.title{ font-size: clamp(22px, 2vw + 6px, 34px); font-weight:800; margin:0 0 10px; }
.btn{ padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; font-weight:700; cursor:pointer; }
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); color:#fff; border-color:var(--violet); }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }
.small{ padding:8px 12px; }

.input,.textarea{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }
.textarea{ min-height:90px; resize:vertical; }

.meta-row{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:10px; }
.meta-item{ display:flex; align-items:center; gap:8px; }
.meta-item .input{ width:220px; }
@media (max-width:900px){ .meta-row{ flex-direction:column; align-items:stretch; } .meta-item .input, .meta-row .input{ width:100%; } }

.q-card{ border:1px solid #e5e7eb; border-radius:12px; padding:14px; background:#fff; }
.q-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; flex-wrap:wrap; }
.q-badge{ font-size:12px; font-weight:700; padding:4px 8px; border-radius:999px; background:#eef2ff; color:#4338ca; }
.q-del{ border:1px solid #e5e7eb; background:#fff; padding:8px 10px; border-radius:10px; cursor:pointer; }
.q-del:hover{ background:#f8fafc; }
.opt-row{ display:flex; align-items:center; gap:8px; margin-top:8px; }
.opt-row .input{ flex:1; min-width:0; }

.side-title{ font-weight:800; }
.side-box{ display:grid; gap:8px; }
.side-kv{ display:flex; justify-content:space-between; gap:8px; font-size:14px; }
.side-kv .k{ color:#64748b; }
.side-kv span{ word-break:break-word; }

@media (max-width:640px){
  ol{ padding-left:18px; }
  .bottom-actions{ position: sticky; bottom: 0; background: linear-gradient(180deg, transparent, #fff 45%); padding-top: 6px; }
}
`;

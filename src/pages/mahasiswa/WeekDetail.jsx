// src/pages/mahasiswa/WeekDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronRight, CheckCircle2, Lock, Loader2, Menu } from "lucide-react";

const BASE_URL = "https://laravel-interactive-english-course-production.up.railway.app";

// ===== helper: attempt terakhir quiz =====
async function fetchLatestAttempt(quizId, token) {
  const r = await fetch(
    `${BASE_URL}/api/quizzes/${quizId}/attempts/me-latest`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }
  );
  if (!r.ok) return null;
  const { attempt } = await r.json();
  return attempt;
}

const resKey = (classId) => `resources:${classId}`;
const getUserId = () => {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "{}")?.id || "anon";
  } catch {
    return "anon";
  }
};
const progKey = (classId, uid = getUserId()) => `u:${uid}:progress:${classId}`;

// kunci urutan step
const ENFORCE_SEQUENTIAL = true;

// helper bool aman untuk 1 / "1" / true
const toBool = (v) => v === true || v === 1 || v === "1";

/* -------------------- Helpers & API -------------------- */
function capitalize(s) {
  return (s || "").charAt(0).toUpperCase() + (s || "").slice(1);
}

// Ambil semua resources satu kelas lalu diringkas ke array flat {id, week, ...}
async function fetchWeeksForClass(classId, token) {
  try {
    const r = await fetch(`${BASE_URL}/api/kelas/${classId}/weeks`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (r.status === 404) return [];
    if (!r.ok) throw new Error(`Failed to fetch weeks (${r.status})`);
    const data = await r.json();
    const weeksArr = Array.isArray(data) ? data : data.weeks || [];

    const items = [];
    weeksArr.forEach((w) => {
      const weekNo = w.week_number ?? w.week ?? null;

      if (Array.isArray(w.resources) && w.resources.length) {
        w.resources.forEach((res) => {
          const base = {
            id: res.id,
            week: weekNo ?? res.week_number,
            type: res.type,
            title: res.title,
            text: res.text,
            videoUrl: res.video_url,
            fileUrl: res.file_url,
            quizId: res.quiz_id ?? res.quiz?.id ?? null,
            quiz_id: res.quiz_id ?? res.quiz?.id ?? null,
            completed: !!(
              res.completed === true ||
              res.completed === 1 ||
              (typeof res.completed_count === "number" &&
                res.completed_count > 0) ||
              res.progress === 100
            ),
          };

          if (res.type === "assignment") {
            items.push({
              ...base,
              assignment_id: res.assignment_id ?? res.assignment?.id ?? null,

              instructions:
                res.assignment?.instructions ?? res.instructions ?? null,
              dueDate: res.assignment?.due_date ?? res.due_date ?? null,
              maxScore: res.assignment?.max_score ?? res.max_score ?? 100,
              allowFile: toBool(
                res.assignment && res.assignment.allow_file !== undefined
                  ? res.assignment.allow_file
                  : res.allow_file ?? true
              ),
            });
          } else {
            items.push(base);
          }
        });
      }
    });
    return items;
  } catch (err) {
    console.error("fetchWeeksForClass error:", err);
    return [];
  }
}

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
      if (parts[0] === "shorts" && parts[1]) {
        return `https://www.youtube.com/embed/${parts[1]}`;
      }
    }
  } catch (e) {
    console.warn("Invalid YouTube URL:", raw, e);
  }
}
function buildEmbedUrl(url) {
  if (!url) return "";
  if (url.includes("youtu")) return toYouTubeEmbed(url);
  return url;
}

// ======= Comments API =======
async function fetchCommentsAPI(resourceId, token) {
  const res = await fetch(
    `${BASE_URL}/api/course-resources/${resourceId}/comments`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }
  );
  if (!res.ok) throw new Error(`Load comments failed (${res.status})`);
  const json = await res.json();
  return json.comments || [];
}
async function createCommentAPI(resourceId, text, parentId, token) {
  const res = await fetch(
    `${BASE_URL}/api/course-resources/${resourceId}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ text, parent_id: parentId || null }),
    }
  );
  if (!res.ok) throw new Error(`Post comment failed (${res.status})`);
  const { comment } = await res.json();
  return comment;
}
async function updateCommentAPI(commentId, text, token) {
  const res = await fetch(`${BASE_URL}/api/comments/${commentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`Update comment failed (${res.status})`);
  const { comment } = await res.json();
  return comment;
}
async function deleteCommentAPI(commentId, token) {
  const res = await fetch(`${BASE_URL}/api/comments/${commentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Delete comment failed (${res.status})`);
}

/* === Progress API (opsional) === */
async function setCompleteAPI(resourceId, completed, token) {
  const endpoint = `${BASE_URL}/api/course-resources/${resourceId}/complete`;
  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ completed: !!completed }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ===== Assignment APIs (student) =====
// ===== Assignment APIs (student) =====
async function fetchMySubmissionAPI(assignmentId, token) {
  const r = await fetch(
    `${BASE_URL}/api/assignments/${assignmentId}/submissions/me`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }
  );
  if (!r.ok) return null;

  const json = await r.json();

  // Ambil field submission bila ada, kalau tidak pakai root
  const raw = Object.prototype.hasOwnProperty.call(json, "submission")
    ? json.submission
    : json;

  // Jika kosong (null/undefined) atau object tanpa jejak data, kembalikan null
  if (
    !raw ||
    typeof raw !== "object" ||
    (!raw.id &&
      !raw.submitted_at &&
      !raw.created_at &&
      !raw.file_url &&
      !(raw.text && String(raw.text).trim().length))
  ) {
    return null;
  }

  return raw;
}

// Create or update submission (server bebas implement: create-or-replace)
async function submitAssignmentAPI(assignmentId, { text, file }, token) {
  const fd = new FormData();
  fd.append("text", text || "");
  if (file) fd.append("file", file);
  const r = await fetch(
    `${BASE_URL}/api/assignments/${assignmentId}/submissions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      body: fd,
    }
  );
  if (!r.ok) {
    const msg = await r.text().catch(() => "");
    throw new Error(`Submit failed (${r.status}) ${msg}`);
  }
  const json = await r.json();
  return json.submission || json;
}

async function fetchAssignmentAPI(assignmentId, token) {
  const r = await fetch(`${BASE_URL}/api/assignments/${assignmentId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.assignment || j;
}

/* -------------------- Page -------------------- */
export default function StudentWeekDetail() {
  const params = useParams();
  const classId = params.id;
  const wk = params.weekNumber || params.weekId || params.week || params.number;
  const token = localStorage.getItem("token");

  const [lastAttempt, setLastAttempt] = useState(null);
  const [klass, setKlass] = useState(null);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  // drawer sidebar (mobile)
  const [sideOpen, setSideOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = sideOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [sideOpen]);

  // discussion
  const [comments, setComments] = useState([]);
  const [cLoading, setCLoading] = useState(false);
  const [newText, setNewText] = useState("");

  // progress map dari localStorage: { [resourceId]: true }
  const [progressMap, setProgressMap] = useState({});

  const navigate = useNavigate();

  const isUnlocked = (idx) => {
    if (!ENFORCE_SEQUENTIAL) return true;
    for (let i = 0; i < idx; i++) {
      if (!steps[i]?.completed) return false;
    }
    return true;
  };

  // Assignment states
  const [assignForm, setAssignForm] = useState({ text: "", file: null });
  const [mySubmission, setMySubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const hasSubmission = useMemo(() => {
    const s = mySubmission;
    if (!s || typeof s !== "object") return false;
    return !!(
      s.id ||
      s.submitted_at ||
      s.created_at ||
      s.file_url ||
      (typeof s.text === "string" && s.text.trim().length > 0)
    );
  }, [mySubmission]);

  // toast/HUD sederhana
  const [hud, setHud] = useState({ show: false, text: "" });

  function showHud(text, duration = 1500) {
    setHud({ show: true, text });
    if (duration > 0) {
      setTimeout(() => setHud((s) => ({ ...s, show: false })), duration);
    }
  }

  /* --------- derived data --------- */
  const steps = useMemo(
    () =>
      items.map((it, i) => ({
        idx: i,
        title: it.title || `${capitalize(it.type)} ${i + 1}`,
        type: it.type,
        completed: !!(it.completed || progressMap[it.id]),
      })),
    [items, progressMap]
  );
  const current = items[active];

  // load submission saat resource assignment aktif
  useEffect(() => {
    (async () => {
      if (current?.type !== "assignment" || !current?.assignment_id) {
        setMySubmission(null);
        setAssignForm({ text: "", file: null });
        return;
      }
      const sub = await fetchMySubmissionAPI(
        current.assignment_id,
        token
      ).catch(() => null);
      setMySubmission(sub);
      setAssignForm({ text: sub?.text || "", file: null }); // prefill text kalau ada
    })();
  }, [current?.id, current?.assignment_id, current?.type, token]);

  // Hydrate detail assignment kalau data dari /weeks masih kosong
  useEffect(() => {
    (async () => {
      if (current?.type !== "assignment" || !current?.assignment_id) return;

      const missing =
        !current.instructions ||
        current.dueDate == null ||
        typeof current.allowFile !== "boolean";

      if (!missing) return;

      const detail = await fetchAssignmentAPI(
        current.assignment_id,
        token
      ).catch(() => null);
      if (!detail) return;

      setItems((prev) =>
        prev.map((it) =>
          it.id !== current.id
            ? it
            : {
                ...it,
                instructions: detail.instructions ?? it.instructions,
                dueDate: detail.due_date ?? it.dueDate,
                maxScore: detail.max_score ?? it.maxScore,
                allowFile: toBool(
                  detail.allow_file !== undefined
                    ? detail.allow_file
                    : it.allowFile
                ),
              }
        )
      );
    })();
  }, [current?.id, current?.type, current?.assignment_id, token]);

  const onSubmitAssignment = async () => {
    if (!current?.assignment_id) return;
    try {
      setSubmitting(true);
      showHud("Processing…", 0); // tampil terus sampai selesai

      const saved = await submitAssignmentAPI(
        current.assignment_id,
        { text: assignForm.text, file: assignForm.file },
        token
      );

      setMySubmission(saved); // setelah ini tombol Submit akan disabled
      setAssignForm((f) => ({ ...f, file: null })); // bersihkan input file
      showHud("Submission saved"); // auto hilang dlm 1.5 detik
    } catch (e) {
      showHud(e?.message || "Submit failed"); // error juga pakai HUD
    } finally {
      setSubmitting(false);
    }
  };

  /* --------- load header + resources --------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // header kelas
        try {
          const r = await fetch(`${BASE_URL}/api/kelas/${classId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });
          if (r.ok) setKlass(await r.json());
        } catch (err) {
          console.error("load class header failed:", err);
        }

        // progress local
        try {
          const raw = localStorage.getItem(progKey(classId));
          setProgressMap(raw ? JSON.parse(raw) : {});
        } catch {
          setProgressMap({});
        }

        // cache local resource
        let weekItems = [];
        try {
          const raw = localStorage.getItem(resKey(classId));
          const all = raw ? JSON.parse(raw) : [];
          weekItems = (Array.isArray(all) ? all : []).filter(
            (x) => Number(x.week) === Number(wk)
          );
        } catch (e) {
          console.error("Failed to parse local resource cache:", e);
        }

        if (weekItems.length === 0) {
          const allItems = await fetchWeeksForClass(classId, token);
          localStorage.setItem(resKey(classId), JSON.stringify(allItems));
          weekItems = allItems.filter((x) => Number(x.week) === Number(wk));
        }

        setItems(weekItems);
        const firstUnfinished = weekItems.findIndex(
          (it) => !(it.completed || progressMap[it.id])
        );
        setActive(firstUnfinished >= 0 ? firstUnfinished : 0);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, wk, token]);

  useEffect(() => {
    (async () => {
      if (current?.type !== "quiz") {
        setLastAttempt(null);
        return;
      }
      const qid = current.quizId ?? current.quiz_id;
      if (!qid) return;
      const a = await fetchLatestAttempt(qid, token).catch(() => null);
      setLastAttempt(a);
    })();
  }, [current?.id, token]);

  /* --------- load comments saat resource aktif berganti --------- */
  useEffect(() => {
    (async () => {
      if (!current?.id) {
        setComments([]);
        return;
      }
      try {
        setCLoading(true);
        const list = await fetchCommentsAPI(current.id, token);
        setComments(list);
      } catch (e) {
        console.error(e);
        setComments([]);
      } finally {
        setCLoading(false);
      }
    })();
  }, [current?.id, token]);

  /* --------- persist resources ke cache saat berubah --------- */
  useEffect(() => {
    if (!classId || items.length === 0) return;
    try {
      const raw = localStorage.getItem(resKey(classId));
      const all = raw ? JSON.parse(raw) : [];
      const rest = all.filter((x) => Number(x.week) !== Number(wk));
      localStorage.setItem(
        resKey(classId),
        JSON.stringify([...rest, ...items])
      );
    } catch (e) {
      console.error("localStorage.setItem failed:", e);
    }
  }, [classId, wk, items]);

  /* --------- discussion ops --------- */
  const addComment = async () => {
    const txt = newText.trim();
    if (!txt || !current?.id) return;
    try {
      const saved = await createCommentAPI(current.id, txt, null, token);
      setComments((prev) => [...prev, saved]);
      setNewText("");
    } catch (e) {
      alert(e.message);
    }
  };
  const updateComment = async (id, text, parentId = null) => {
    try {
      const saved = await updateCommentAPI(id, text, token);
      if (!parentId) {
        setComments((list) => list.map((c) => (c.id === id ? saved : c)));
      } else {
        setComments((list) =>
          list.map((c) =>
            c.id !== parentId
              ? c
              : {
                  ...c,
                  replies: c.replies.map((r) => (r.id === id ? saved : r)),
                }
          )
        );
      }
    } catch (e) {
      alert(e.message);
    }
  };
  const deleteComment = async (id, parentId = null) => {
    try {
      await deleteCommentAPI(id, token);
      if (!parentId) {
        setComments((list) => list.filter((c) => c.id !== id));
      } else {
        setComments((list) =>
          list.map((c) =>
            c.id !== parentId
              ? c
              : { ...c, replies: c.replies.filter((r) => r.id !== id) }
          )
        );
      }
    } catch (e) {
      alert(e.message);
    }
  };
  const addReply = async (parentId, text) => {
    const t = (text || "").trim();
    if (!t || !current?.id) return;
    try {
      const saved = await createCommentAPI(current.id, t, parentId, token);
      setComments((list) =>
        list.map((c) =>
          c.id !== parentId ? c : { ...c, replies: [...c.replies, saved] }
        )
      );
    } catch (e) {
      alert(e.message);
    }
  };

  /* --------- mark complete --------- */
  const toggleComplete = async (resId) => {
    const currently = !!(
      progressMap[resId] || items.find((x) => x.id === resId)?.completed
    );
    const nextVal = !currently;

    const ok = await setCompleteAPI(resId, nextVal, token);
    if (!ok)
      console.warn("complete() via API gagal/diabaikan, pakai cache lokal");

    setProgressMap((prev) => {
      const updated = { ...prev, [resId]: nextVal };
      try {
        localStorage.setItem(progKey(classId), JSON.stringify(updated));
      } catch (e) {
        console.error("localStorage.setItem failed:", e);
      }
      return updated;
    });

    setItems((prev) =>
      prev.map((it) => (it.id === resId ? { ...it, completed: nextVal } : it))
    );
  };

  const cachedScore = (() => {
    try {
      if (!current?.quizId && !current?.quiz_id) return null;
      const raw = localStorage.getItem(
        `quiz-score:${current.quizId ?? current.quiz_id}`
      );
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  /* -------------------- Styles -------------------- */
  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&display=swap');

:root { --violet:#6b46c1; --violet-700:#553c9a; }
body { background:#fbfbfb; font-family: Inter, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }

/* layout desktop */
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

/* step list */
.step-list{ display:flex; flex-direction:column; gap:6px; }
.step{
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:600;
  transition: background-color .15s ease, transform .12s ease, box-shadow .12s ease, border-color .15s ease;
  border:1px solid transparent;
}
.step:hover{ background:#eef2ff; border-color:#e9d5ff; box-shadow:0 2px 12px rgba(107,70,193,.10); transform: translateX(2px); }
.step.active{ background:#f1f5f9; }
.step.locked{ cursor:not-allowed; }
.step.locked:hover{ background:transparent; border-color:transparent; box-shadow:none; transform:none; }
.idx{ width:22px; text-align:right; opacity:.6; }

.badge-done{ display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#16a34a; }
.lock{ display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#64748b; }

.title{ font-size: clamp(22px, 2vw + 6px, 34px); font-weight:800; margin:0 0 10px; }
.btn{ padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; font-weight:700; cursor:pointer; }
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); color:#fff; border-color:var(--violet); }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }
.viewer iframe{ width:100%; height: clamp(380px, 45vw, 640px); border:0; border-radius:12px; }
.controls{ display:flex; justify-content:space-between; align-items:center; gap:8px; margin:18px 0; }
@media (max-width:700px){
  .controls{ flex-wrap:wrap; }
  .controls > *{ flex:1 1 45%; }
}

/* comments */
.cmt-box{ margin-top:28px; }
.cmt-item{ border-top:1px solid #eef2f7; padding:16px 0; }
.cmt-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; font-weight:700; }
.cmt-meta{ font-size:12px; color:#64748b; }
.cmt-body{ margin-top:6px; line-height:1.7; }
.cmt-replies{ margin-top:10px; padding-left:12px; border-left:2px solid #eef2f7; }
.input,.textarea{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }
.textarea{ min-height:90px; resize:vertical; }

/* skeleton */
@keyframes shimmer { 100% { transform: translateX(100%); } }
.skel{ background:#eef2f7; border-radius:12px; position:relative; overflow:hidden; }
.skel.shimmer::after{
  content:""; position:absolute; inset:0; transform:translateX(-100%);
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent);
  animation: shimmer 1.2s infinite;
}
.skel-line{ height:14px; margin:10px 0; }
.skel-title{ height:32px; width:60%; margin:10px 0 14px; }
.skel-iframe{ height: clamp(280px, 45vw, 560px); border-radius:12px; }

/* mobile top bar + drawer */
.mobile-top{ display:none; align-items:center; gap:10px; margin:4px 0 10px; }
.hamburger{
  display:none; border:1px solid #e2e8f0; background:#fff;
  border-radius:10px; padding:8px; align-items:center; justify-content:center;
}
.backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:1000; display:none; }
.backdrop.show{ display:block; }

@media (max-width:1100px){
  .wrap{ grid-template-columns: 1fr; max-width:100%; padding:10px 12px; }
  .left{
    position: fixed; left:0; top:0; bottom:0;
    width: 86vw; max-width: 360px;
    transform: translateX(-100%);
    transition: transform .25s ease;
    z-index: 1001;
    overflow: hidden; display:flex; flex-direction:column;
  }
  .left.open{ transform: translateX(0); }
  .step-list{ flex:1 1 auto; overflow:auto; -webkit-overflow-scrolling:touch; }
  .mobile-top{ display:flex; }
  .hamburger{ display:inline-flex; }
}

/* spinner util */
.spin{ animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* HUD / Toast kecil */
.hud-pill{
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #111827; /* slate-900 */
  color: #fff;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.18);
  z-index: 2000;
  opacity: .98;
}

/* state disabled khusus tombol */
.btn:disabled,
.btn.disabled {
  background: #e5e7eb;    /* abu muda */
  color: #94a3b8;         /* slate-400 */
  border-color: #e5e7eb;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-primary:disabled,
.btn-primary.disabled {
  background: #cbd5e1;    /* slate-300 */
  color: #64748b;         /* slate-500 */
  border-color: #cbd5e1;
}

.btn:disabled:hover,
.btn-primary:disabled:hover {
  background: inherit;    /* jangan berubah saat hover */
}
`;

  /* -------------------- UI -------------------- */
  return (
    <>
      <style>{styles}</style>

      {/* backdrop drawer */}
      {sideOpen && (
        <div className="backdrop show" onClick={() => setSideOpen(false)} />
      )}

      <div className="wrap">
        {/* Left: steps / drawer */}
        <aside className={`panel left ${sideOpen ? "open" : ""}`}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              Week {wk} — {klass?.nama_kelas || ""}
            </div>
          </div>

          <div className="step-list">
            {loading ? (
              <>
                <div className="skel shimmer" style={{ height: 44 }} />
                <div className="skel shimmer" style={{ height: 44 }} />
                <div className="skel shimmer" style={{ height: 44 }} />
                <div className="skel shimmer" style={{ height: 44 }} />
              </>
            ) : steps.length === 0 ? (
              <div style={{ opacity: 0.6 }}>No content yet.</div>
            ) : (
              steps.map((s) => {
                const locked = !isUnlocked(s.idx);
                return (
                  <div
                    key={s.idx}
                    className={`step ${s.idx === active ? "active" : ""} ${
                      locked ? "locked" : ""
                    }`}
                    onClick={() => {
                      if (!locked) {
                        setActive(s.idx);
                        setSideOpen(false);
                      }
                    }}
                    title={
                      locked ? "Selesaikan step sebelumnya lebih dulu" : ""
                    }
                    tabIndex={0}
                    role="button"
                  >
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span className="idx">{s.idx + 1}.</span>
                      <span>{s.title}</span>
                    </div>
                    {s.completed ? (
                      <span className="badge-done">
                        <CheckCircle2 size={16} /> Done
                      </span>
                    ) : locked ? (
                      <span className="lock">
                        <Lock size={14} /> Locked
                      </span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: viewer */}
        <section className="panel right">
          {/* HUD / toast kecil */}
          {hud.show && <div className="hud-pill"> {hud.text} </div>}

          {/* mobile top bar */}
          <div className="mobile-top">
            <button
              className="hamburger"
              aria-label="Open sidebar"
              onClick={() => setSideOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div style={{ fontWeight: 800 }}>
              Week {wk}
              {klass?.nama_kelas ? ` — ${klass.nama_kelas}` : ""}
            </div>
          </div>

          <div className="breadcrumb">
            <Link to="/student">Dashboard</Link>
            <ChevronRight size={16} />
            <span>Week {wk}</span>
          </div>

          {loading ? (
            <div className="viewer">
              <div className="skel skel-title shimmer" />
              <div className="skel skel-line shimmer" />
              <div
                className="skel skel-line shimmer"
                style={{ width: "90%" }}
              />
              <div
                className="skel skel-line shimmer"
                style={{ width: "80%" }}
              />
              <div
                className="skel skel-iframe shimmer"
                style={{ marginTop: 14 }}
              />
            </div>
          ) : current ? (
            <div className="viewer">
              <h1 className="title">
                {`Step ${active + 1}: `}
                {current.title || capitalize(current.type)}
              </h1>

              {current.type === "text" && (
                <div style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {current.text}
                </div>
              )}

              {current.type === "video" && (
                <div>
                  {current.videoUrl && (
                    <div style={{ marginBottom: 8, opacity: 0.7 }}>
                      {current.videoUrl}
                    </div>
                  )}
                  <div style={{ aspectRatio: "16 / 9", width: "100%" }}>
                    <iframe
                      title={current.title || "Video"}
                      src={buildEmbedUrl(current.videoUrl)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {current.type === "file" && (
                <div>
                  <a
                    className="btn"
                    href={current.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open / Download file
                  </a>
                </div>
              )}

              {current.type === "quiz" && (
                <div>
                  <p className="cmt-meta">Quiz: {current.title}</p>

                  {(lastAttempt?.status === "submitted" || cachedScore) && (
                    <div className="cmt-meta" style={{ marginBottom: 6 }}>
                      Last score:{" "}
                      <b>
                        {Number(lastAttempt?.score ?? cachedScore?.score ?? 0)}
                      </b>
                    </div>
                  )}

                  <button
                    className={`btn btn-primary ${
                      lastAttempt?.status === "submitted" ? "disabled" : ""
                    }`}
                    disabled={lastAttempt?.status === "submitted"}
                    onClick={async () => {
                      if (lastAttempt?.status === "submitted") return;
                      const token = localStorage.getItem("token");
                      const classId = params.id;
                      const wk =
                        params.weekNumber ||
                        params.weekId ||
                        params.week ||
                        params.number;

                      let quizId =
                        current.quizId ??
                        current.quiz_id ??
                        current?.quiz?.id ??
                        null;

                      if (!quizId) {
                        try {
                          const ref = await fetch(
                            `${BASE_URL}/api/kelas/${classId}/weeks`,
                            {
                              headers: {
                                Authorization: `Bearer ${token}`,
                                Accept: "application/json",
                              },
                            }
                          );
                          if (ref.ok) {
                            const weeks = await ref.json();
                            const found = (weeks || [])
                              .flatMap((w) => w.resources || [])
                              .find((r) => r.id === current.id);
                            quizId = found?.quiz_id ?? found?.quiz?.id ?? null;
                          }
                        } catch (e) {
                          console.error("Refetch weeks failed:", e);
                        }
                        if (!quizId) {
                          showHud("Quiz ID not found");
                          return;
                        }
                      }

                      const r = await fetch(
                        `${BASE_URL}/api/quizzes/${quizId}/attempts/start`,
                        {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/json",
                          },
                        }
                      );
                      if (!r.ok) {
                        const msg = await r.text().catch(() => "");
                        showHud(`Failed to start: ${r.status} ${msg}`);
                        return;
                      }

                      const attempt = await r.json();
                      navigate(
                        `/student/classes/${classId}/weeks/${wk}/quiz/${quizId}/attempt?aid=${attempt.id}`
                      );
                    }}
                  >
                    Start Quiz
                  </button>

                  {lastAttempt?.status === "submitted" && (
                    <button
                      className="btn"
                      style={{ marginLeft: 8 }}
                      onClick={() =>
                        navigate(
                          `/student/classes/${params.id}/weeks/${wk}/quiz/${
                            current.quizId ?? current.quiz_id
                          }/review?aid=${lastAttempt.id}`
                        )
                      }
                    >
                      View Review
                    </button>
                  )}
                </div>
              )}

              {current.type === "assignment" && (
                <div style={{ lineHeight: 1.7 }}>
                  <div className="cmt-meta" style={{ marginBottom: 8 }}>
                    {current.dueDate
                      ? `Due: ${new Date(current.dueDate).toLocaleString()}`
                      : "No due date"}
                    {" • "}Max score: {current.maxScore ?? 100}
                    {" • "}
                    {current.allowFile ? "File upload enabled" : "Text only"}
                  </div>

                  {current.instructions && (
                    <section
                      style={{ whiteSpace: "pre-wrap", marginBottom: 14 }}
                    >
                      {current.instructions}
                    </section>
                  )}

                  {/* Status submission (jika pernah submit) */}
                  {hasSubmission ? (
                    <div
                      className="cmt-meta"
                      style={{
                        marginBottom: 10,
                        padding: "8px 10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        background: "#f8fafc",
                      }}
                    >
                      Submitted at:{" "}
                      <b>
                        {mySubmission.submitted_at
                          ? new Date(mySubmission.submitted_at).toLocaleString()
                          : "-"}
                      </b>
                      {typeof mySubmission.score === "number" && (
                        <>
                          {" "}
                          • Score: <b>{mySubmission.score}</b>
                        </>
                      )}
                      {mySubmission.file_url && (
                        <>
                          {" "}
                          • File:{" "}
                          <a
                            href={mySubmission.file_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            download
                          </a>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="cmt-meta" style={{ marginBottom: 10 }}>
                      You haven’t submitted this assignment yet.
                    </div>
                  )}

                  {/* Form submit */}
                  <div
                    className="panel"
                    style={{
                      padding: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ marginBottom: 10 }}>
                      <label
                        style={{
                          fontWeight: 700,
                          display: "block",
                          marginBottom: 6,
                        }}
                      >
                        Your answer (text)
                      </label>
                      <textarea
                        className="textarea"
                        value={assignForm.text}
                        onChange={(e) =>
                          setAssignForm((f) => ({ ...f, text: e.target.value }))
                        }
                        placeholder="Write your answer..."
                      />
                    </div>

                    {current.allowFile && (
                      <div style={{ marginBottom: 10 }}>
                        <label
                          style={{
                            fontWeight: 700,
                            display: "block",
                            marginBottom: 6,
                          }}
                        >
                          Upload file (optional)
                        </label>
                        <input
                          className="input"
                          type="file"
                          onChange={(e) =>
                            setAssignForm((f) => ({
                              ...f,
                              file: e.target.files?.[0] || null,
                            }))
                          }
                        />
                        <div className="cmt-meta" style={{ marginTop: 6 }}>
                          You can submit text and/or a file.
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-primary"
                        disabled={submitting || hasSubmission} // <-- pakai hasSubmission
                        title={
                          hasSubmission
                            ? "You already submitted. Use Re-submit to update."
                            : ""
                        }
                        onClick={onSubmitAssignment}
                      >
                        {submitting ? "Submitting…" : "Submit"}
                      </button>

                      {hasSubmission && (
                        <button
                          className="btn"
                          type="button"
                          disabled={submitting}
                          onClick={onSubmitAssignment}
                          title="Re-submit (replace previous)"
                        >
                          {submitting ? "Submitting…" : "Re-submit"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="controls">
                <button
                  className="btn"
                  disabled={active === 0}
                  onClick={() => setActive((i) => Math.max(0, i - 1))}
                >
                  Previous
                </button>

                <button
                  className={`btn ${
                    steps[active]?.completed ? "" : "btn-primary"
                  }`}
                  onClick={() => toggleComplete(current.id)}
                  title="Tandai materi ini selesai"
                >
                  {steps[active]?.completed ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <CheckCircle2 size={16} /> Marked as Complete
                    </span>
                  ) : (
                    "Mark as Complete"
                  )}
                </button>

                {active === items.length - 1 ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!steps[active]?.completed) toggleComplete(current.id);
                      navigate("/student");
                    }}
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    className="btn"
                    disabled={!isUnlocked(active + 1)}
                    onClick={() =>
                      setActive((i) => Math.min(items.length - 1, i + 1))
                    }
                    title={
                      !isUnlocked(active + 1) ? "Selesaikan step ini dulu" : ""
                    }
                  >
                    Next
                  </button>
                )}
              </div>

              {/* Discussion */}
              <Discussion
                comments={comments}
                cLoading={cLoading}
                addComment={addComment}
                updateComment={updateComment}
                deleteComment={deleteComment}
                addReply={addReply}
                newText={newText}
                setNewText={setNewText}
              />
            </div>
          ) : (
            <div>No content found for this week.</div>
          )}
        </section>
      </div>
    </>
  );
}

/* ---------------- Discussion UI ---------------- */
function Discussion({
  comments,
  cLoading,
  addComment,
  updateComment,
  deleteComment,
  addReply,
  newText,
  setNewText,
}) {
  return (
    <div className="cmt-box">
      <h3 style={{ margin: "22px 0 10px", fontWeight: 800 }}>Discussion</h3>

      <div style={{ marginBottom: 10 }}>
        <textarea
          className="textarea"
          placeholder="Add a comment…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}
        >
          <button className="btn btn-primary" onClick={addComment}>
            Post
          </button>
        </div>
      </div>

      <div>
        {cLoading ? (
          <div
            className="cmt-meta"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Loader2 size={16} className="spin" /> Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <div className="cmt-meta">No comments yet.</div>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              data={c}
              onEdit={(text) => updateComment(c.id, text)}
              onDelete={() => deleteComment(c.id)}
              onReply={(text) => addReply(c.id, text)}
              updateReply={(rid, text) => updateComment(rid, text, c.id)}
              deleteReply={(rid) => deleteComment(rid, c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  data,
  onEdit,
  onDelete,
  onReply,
  updateReply,
  deleteReply,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  const saveEdit = () => {
    const t = (draft || "").trim();
    if (!t) return;
    onEdit(t);
    setEditing(false);
  };

  return (
    <div className="cmt-item">
      <div className="cmt-head">
        <div>
          {data.author}{" "}
          {data.role === "dosen" && (
            <span className="cmt-meta">• Lecturer</span>
          )}
          <div className="cmt-meta">
            {new Date(data.createdAt).toLocaleString()}
            {typeof data.score === "number" && (
              <span style={{ marginLeft: 8 }}>• Score: {data.score}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {data.own && !editing && (
            <>
              <button className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn" onClick={onDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="cmt-body">{data.text}</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <textarea
            className="textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={saveEdit}>
              Save
            </button>
            <button
              className="btn"
              onClick={() => {
                setEditing(false);
                setDraft(data.text);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn" onClick={() => setReplying((s) => !s)}>
          {replying ? "Cancel reply" : "Reply"}
        </button>
      </div>

      {replying && (
        <div style={{ marginTop: 8 }}>
          <textarea
            className="textarea"
            placeholder="Write a reply…"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                const t = (replyText || "").trim();
                if (!t) return;
                onReply(t);
                setReplying(false);
                setReplyText("");
              }}
            >
              Post reply
            </button>
            <button
              className="btn"
              onClick={() => {
                setReplying(false);
                setReplyText("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {data.replies?.length > 0 && (
        <div className="cmt-replies">
          {data.replies.map((r) => (
            <ReplyItem
              key={r.id}
              data={r}
              onEdit={(text) => updateReply(r.id, text)}
              onDelete={() => deleteReply(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyItem({ data, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const saveEdit = () => {
    const t = (draft || "").trim();
    if (!t) return;
    onEdit(t);
    setEditing(false);
  };
  return (
    <div className="cmt-item" style={{ borderTop: "none", paddingTop: 10 }}>
      <div className="cmt-head">
        <div>
          {data.author}{" "}
          {data.role === "dosen" && (
            <span className="cmt-meta">• Lecturer</span>
          )}
          <div className="cmt-meta">
            {new Date(data.createdAt).toLocaleString()}
            {typeof data.score === "number" && (
              <span style={{ marginLeft: 8 }}>• Score: {data.score}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {data.own && !editing && (
            <>
              <button className="btn" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn" onClick={onDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <div className="cmt-body">{data.text}</div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <textarea
            className="textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={saveEdit}>
              Save
            </button>
            <button
              className="btn"
              onClick={() => {
                setEditing(false);
                setDraft(data.text);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

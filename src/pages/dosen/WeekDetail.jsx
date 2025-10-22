// src/pages/lecture/WeekDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  MoreVertical,
  PlusCircle,
  Save,
  X,
  Menu,
} from "lucide-react";

/* ================== Constants & Keys ================== */
import { get, post, put, del } from "@/config/api";

const resKey = (classId) => `resources:${classId}`;
const cmtKey = (classId, week) => `comments:${classId}:${week}`;

/* ================== Helpers / Normalizers ================== */
const capitalize = (s) =>
  (s || "").charAt(0).toUpperCase() + (s || "").slice(1);

function normalizeResource(json, weekFallback) {
  const r = json.resource || json;
  const type = r.type;

  const base = {
    id: r.id,
    week: r.week_number ?? r.week?.week_number ?? weekFallback,
    weekId: r.week_id ?? r.week?.id ?? null,
    type,
    title: r.title || r.quiz?.title || null,
    quizId: r.quiz_id ?? r.quizId ?? r.quiz?.id ?? null,
    quiz: r.quiz ?? null,
  };

  if (type === "assignment") {
    return {
      ...base,
      assignmentId:
        r.assignment_id ?? r.assignmentId ?? r.assignment?.id ?? null,
      assignment: r.assignment ?? null,
      instructions: r.assignment?.instructions ?? r.instructions ?? null,
      dueDate: r.assignment?.due_date ?? r.due_date ?? null,
      maxScore: r.assignment?.max_score ?? r.max_score ?? 100,
      allowFile: !!(r.assignment?.allow_file ?? r.allow_file ?? true),
    };
  }

  if (type === "composite") {
    return {
      ...base,
      text: r.text ?? null,
      videoUrl: r.video_url ?? r.videoUrl ?? null,
      fileUrl: r.file_url ?? r.fileUrl ?? null,
      file: r.file ?? null,
    };
  }
  if (type === "text")
    return { ...base, text: r.text ?? null, videoUrl: null, fileUrl: null };
  if (type === "video")
    return {
      ...base,
      text: null,
      videoUrl: r.video_url ?? r.videoUrl ?? null,
      fileUrl: null,
    };
  if (type === "file")
    return {
      ...base,
      text: null,
      videoUrl: null,
      fileUrl: r.file_url ?? r.fileUrl ?? null,
    };
  return base;
}

// === helper: bangun detail quiz dari cache WeekDetail ===
function quizFromCache(current) {
  if (!current?.quiz || !Array.isArray(current.quiz.items)) return null;

  const title =
    current.quiz.title ||
    (current.title || "").replace(/^Quiz\s*—\s*/i, "") ||
    "Quiz";

  const questions = current.quiz.items.map((q, idx) => {
    if (q.type === "mcq") {
      return {
        id: `mcq-${idx}`,
        type: "multiple_choice",
        text: q.prompt || "",
        options: (q.options || []).map((t, i) => ({
          id: `opt-${idx}-${i}`,
          text: String(t),
          isCorrect: Number(q.answer) === i,
        })),
      };
    }
    return {
      id: `short-${idx}`,
      type: "short_answer",
      text: q.prompt || "",
      options: [],
      answers: Array.isArray(q.answers)
        ? q.answers
        : String(q.answers || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    };
  });

  return { id: current.quiz?.id || current.quizId || null, title, questions };
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
  } catch {
    /* ignore */
  }
  return raw;
}
const buildEmbedUrl = (url) =>
  !url ? "" : url.includes("youtu") ? toYouTubeEmbed(url) : url;

// Normalisasi URL & tentukan cara tampilkan
function prepareEmbedSrc(rawUrl) {
  const url = String(rawUrl || "");
  if (!url) return { type: "none", src: "", open: "" };

  // --- Google Slides ---
  if (url.includes("docs.google.com/presentation")) {
    let src = url;

    // Bila masih /edit atau /present -> ubah ke /embed
    if (/(\/edit|\/present)/.test(src)) {
      src = src.replace(
        /\/(edit|present).*$/,
        "/embed?start=false&loop=false&delayms=3000"
      );
    }

    // Bila /pub? => biarkan, atau konversi ke /embed? (keduanya valid)
    if (/\/pub(\?|$)/.test(src)) {
      // opsi: gunakan embed supaya konsisten
      src = src.replace(/\/pub(\?|$)/, "/embed?");
      if (!src.includes("?")) src += "start=false&loop=false&delayms=3000";
    }

    return { type: "iframe", src, open: url };
  }

  // --- Google Docs ---
  if (url.includes("docs.google.com/document")) {
    // /edit -> /pub?embedded=true (perlu Publish to the web)
    const src = url.replace(/\/edit.*$/, "/pub?embedded=true");
    return { type: "iframe", src, open: url };
  }

  // --- Google Sheets ---
  if (url.includes("docs.google.com/spreadsheets")) {
    // /edit -> /pubhtml?widget=true&headers=false
    const src = url.replace(/\/edit.*$/, "/pubhtml?widget=true&headers=false");
    return { type: "iframe", src, open: url };
  }

  // --- Google Forms ---
  if (url.includes("docs.google.com/forms")) {
    const src = url.replace(/\/viewform.*$/, "/viewform?embedded=true");
    return { type: "iframe", src, open: url };
  }

  // --- Google Drive file viewer ---
  if (url.includes("drive.google.com")) {
    // /view -> /preview untuk video/pdf/images; share harus Anyone with link (Viewer)
    const src = url.replace(/\/view(\?.*)?$/, "/preview");
    return { type: "iframe", src, open: url };
  }

  // --- Ekstensi file langsung ---
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

  // --- Situs umum ---
  // Banyak situs mengizinkan embed, sebagian menolak (akan muncul refused to connect).
  // Kita tetap coba tampilkan, dan sediakan tombol "Open original".
  return { type: "iframe", src: url, open: url };
}

function FileViewer({ url, title = "File" }) {
  const { type, src, open } = React.useMemo(() => prepareEmbedSrc(url), [url]);

  if (!url) return <div className="muted">No file URL.</div>;

  if (type === "image") {
    return (
      <img
        src={src}
        alt={title}
        style={{ maxWidth: "100%", borderRadius: 12 }}
      />
    );
  }
  if (type === "video") {
    return (
      <video src={src} controls style={{ width: "100%", borderRadius: 12 }} />
    );
  }
  if (type === "audio") {
    return <audio src={src} controls style={{ width: "100%" }} />;
  }
  if (type === "iframe") {
    return (
      <div>
        <iframe
          title={title}
          src={src}
          className="file-frame"
          style={{ width: "100%", height: "70vh", border: 0, borderRadius: 12 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
          allowFullScreen
        />
        <div style={{ marginTop: 8 }}>
          <a
            href={open || src}
            target="_blank"
            rel="noreferrer"
            className="btn"
            title="Open original"
          >
            Open original
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="muted" style={{ marginBottom: 8 }}>
        File tidak bisa di-embed. Coba unduh:
      </div>
      <a className="btn" href={url} rel="noreferrer" target="_blank">
        Download
      </a>
    </div>
  );
}

/* ================== Data Fetchers ================== */

const fetchWeeksForClass = async (classId) => {
  try {
    const data = await get(`kelas/${classId}/weeks`);
    const weeksArr = Array.isArray(data) ? data : data.weeks || data.data || [];

    const items = [];
    (weeksArr || []).forEach((w) => {
      const weekNo = w.week_number ?? w.week ?? null;
      if (Array.isArray(w.resources) && w.resources.length) {
        w.resources.forEach((res) => {
          items.push(
            normalizeResource(
              {
                id: res.id,
                type: res.type,
                title: res.title,
                text: res.text,
                video_url: res.video_url,
                file_url: res.file_url,
                quiz_id: res.quiz_id,
                assignment_id: res.assignment_id,
                assignment: res.assignment,
                week_number: weekNo ?? res.week_number,
                week_id: res.week_id ?? w.id,
              },
              weekNo
            )
          );
        });
      } else if (weekNo != null) {
        items.push({ id: `week-${weekNo}`, week: weekNo, type: "empty" });
      }
    });

    return items;
  } catch (err) {
    if (err?.response?.status === 404) return [];
    console.error("fetchWeeksForClass error:", err);
    return [];
  }
};

async function fetchQuizDetail(quizId) {
  const json = await get(`quizzes/${quizId}`);
  const q = json.data || json.quiz || json;
  return {
    id: q.id,
    title: q.title,
    instructions: q.instructions ?? null,
    timeLimit: Number(q.time_limit ?? 0),
    shuffle: Boolean(q.shuffle ?? true),
    questions: (q.questions ?? []).map((qq) => ({
      id: qq.id,
      type: (qq.type || "").toUpperCase(),
      text: qq.question_text ?? qq.text ?? "",
      options: (qq.options ?? []).map((op) => ({
        id: op.id,
        text: op.option_text ?? op.text ?? "",
        isCorrect: Boolean(op.is_correct),
      })),
      answers: Array.isArray(qq.answers) ? qq.answers : [],
    })),
  };
}

/* ================== APIs (Resource & Comments) ================== */

async function createResourceAPI(classId, weekOrId, payload) {
  const weekParam = payload.weekId ?? weekOrId;
  const fd = new FormData();
  fd.append("type", "composite");
  fd.append("title", payload.title || "");
  if (payload.includeText) fd.append("text", payload.text || "");
  if (payload.includeVideo) fd.append("video_url", payload.videoUrl || "");
  if (payload.includeFile && payload.file) fd.append("file", payload.file);
  if (payload.includeFile && payload.fileUrl)
    fd.append("file_url", payload.fileUrl);

  return await post(`weeks/${weekParam}/resources`, fd);
}

async function updateResourceAPI(resourceId, payload) {
  const fd = new FormData();
  fd.append("_method", "PUT");
  fd.append("type", "composite");
  fd.append("title", payload.title || "");
  fd.append("text", payload.includeText ? payload.text || "" : "");
  fd.append("video_url", payload.includeVideo ? payload.videoUrl || "" : "");
  if (payload.includeFile && payload.file) fd.append("file", payload.file);
  if (payload.includeFile) fd.append("file_url", payload.fileUrl || "");

  return await post(`course-resources/${resourceId}`, fd);
}

async function deleteResourceAPI(id) {
  await del(`course-resources/${id}`);
}

async function fetchCommentsAPI(resourceId) {
  const json = await get(`course-resources/${resourceId}/comments`);
  return json?.comments || json?.data || json || [];
}

async function createCommentAPI(resourceId, text, parentId) {
  const json = await post(`course-resources/${resourceId}/comments`, {
    text,
    parent_id: parentId || null,
  });
  return json.comment || json.data || json;
}

async function updateCommentAPI(commentId, text) {
  const json = await put(`comments/${commentId}`, { text });
  return json.comment || json.data || json;
}

async function deleteCommentAPI(commentId) {
  await del(`comments/${commentId}`);
}

async function scoreCommentAPI(commentId, score) {
  const json = await put(`comments/${commentId}/score`, { score });
  return json.comment || json.data || json;
}

/* ================== Edit Material Modal ================== */
function EditMaterialModal({ open, data, onClose, onSave }) {
  const safe = React.useMemo(
    () =>
      data ?? {
        id: null,
        week: null,
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

  useEffect(() => {
    setForm(safe);
  }, [safe]);

  if (!open) return null;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{ width: "100%", maxWidth: 700, padding: 18 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
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

        {/* body */}
        {/* body */}
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

        <div>
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
          <div>
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
          <div>
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
          <div>
            <label
              style={{ fontWeight: 700, display: "block", marginBottom: 6 }}
            >
              File (upload atau URL)
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
              Gunakan salah satu: upload file atau isi URL.
            </div>
          </div>
        )}

        {/* footer */}
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

/* ================== Discussion Components ================== */
function Discussion({
  comments,
  cLoading,
  addComment,
  updateComment,
  deleteComment,
  addReply,
  newText,
  setNewText,
  isLecturer,
  onScore,
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
          <div className="cmt-meta">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div className="muted">No comments yet.</div>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              data={c}
              onEdit={(text) => updateComment(c.id, text)}
              onDelete={() => deleteComment(c.id)}
              onReply={(text) => addReply(c.id, text)}
              isLecturer={isLecturer}
              onScore={onScore}
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
  isLecturer,
  onScore,
  updateReply,
  deleteReply,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  const [scoring, setScoring] = useState(false);
  const [scoreDraft, setScoreDraft] = useState(
    typeof data.score === "number" ? String(data.score) : ""
  );

  const saveEdit = () => {
    const t = (draft || "").trim();
    if (!t) return;
    onEdit(t);
    setEditing(false);
  };

  const postReply = () => {
    const t = (replyText || "").trim();
    if (!t) return;
    onReply(t);
    setReplying(false);
    setReplyText("");
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
        <div className="manage">
          <button className="inline-btn" onClick={() => setMenuOpen((s) => !s)}>
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
              <button
                onClick={() => {
                  setEditing(true);
                  setMenuOpen(false);
                }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
              >
                Delete
              </button>
              {isLecturer && (
                <button
                  onClick={() => {
                    setScoring(true);
                    setScoreDraft(
                      typeof data.score === "number" ? String(data.score) : ""
                    );
                    setMenuOpen(false);
                  }}
                >
                  Give Score
                </button>
              )}
            </div>
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
          <div className="cmt-actions">
            <button className="btn mark" onClick={saveEdit}>
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

      {isLecturer && scoring && (
        <div
          className="score-box"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
          }}
        >
          <label className="cmt-meta" htmlFor={`score-${data.id}`}>
            Score (1–100):
          </label>
          <input
            id={`score-${data.id}`}
            className="input"
            type="number"
            min={1}
            max={100}
            step={1}
            value={scoreDraft}
            onChange={(e) =>
              setScoreDraft(e.target.value.replace(/[^\d]/g, ""))
            }
            style={{ width: 110 }}
            placeholder="e.g. 85"
          />
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              const n = parseInt(scoreDraft, 10);
              if (!Number.isInteger(n) || n < 1 || n > 100) {
                alert("Score must be an integer between 1 and 100.");
                return;
              }
              onScore(data.id, n);
              setScoring(false);
            }}
          >
            Save
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setScoring(false);
              setScoreDraft(
                typeof data.score === "number" ? String(data.score) : ""
              );
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="cmt-actions">
        <button className="inline-btn" onClick={() => setReplying((s) => !s)}>
          Reply
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
          <div className="cmt-actions">
            <button className="btn mark" onClick={postReply}>
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
              isLecturer={isLecturer}
              onScore={(value) => onScore(r.id, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyItem({ data, onEdit, onDelete, isLecturer, onScore }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);

  const [scoring, setScoring] = useState(false);
  const [scoreDraft, setScoreDraft] = useState(
    typeof data.score === "number" ? String(data.score) : ""
  );

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
        <div className="manage">
          <button className="inline-btn" onClick={() => setMenuOpen((s) => !s)}>
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
              <button
                onClick={() => {
                  setEditing(true);
                  setMenuOpen(false);
                }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
              >
                Delete
              </button>
              {isLecturer && (
                <button
                  onClick={() => {
                    setScoring(true);
                    setScoreDraft(
                      typeof data.score === "number" ? String(data.score) : ""
                    );
                    setMenuOpen(false);
                  }}
                >
                  Give Score
                </button>
              )}
            </div>
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
          <div className="cmt-actions">
            <button className="btn mark" onClick={saveEdit}>
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

      {isLecturer && scoring && (
        <div
          className="score-box"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
          }}
        >
          <label className="cmt-meta" htmlFor={`score-reply-${data.id}`}>
            Score (1–100):
          </label>
          <input
            id={`score-reply-${data.id}`}
            className="input"
            type="number"
            min={1}
            max={100}
            step={1}
            value={scoreDraft}
            onChange={(e) =>
              setScoreDraft(e.target.value.replace(/[^\d]/g, ""))
            }
            style={{ width: 110 }}
            placeholder="e.g. 85"
          />
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              const n = parseInt(scoreDraft, 10);
              if (!Number.isInteger(n) || n < 1 || n > 100) {
                alert("Score must be an integer between 1 and 100.");
                return;
              }
              onScore(n);
              setScoring(false);
            }}
          >
            Save
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              setScoring(false);
              setScoreDraft(
                typeof data.score === "number" ? String(data.score) : ""
              );
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/* ================== Main Page ================== */
export default function WeekDetail() {
  const params = useParams();
  const classId = params.id;
  const wk = params.weekNumber || params.weekId || params.week || params.number;
  const role = localStorage.getItem("role");

  const [klass, setKlass] = useState(null);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");

  const [sideOpen, setSideOpen] = useState(false);

  const [fs, setFs] = useState({ open: false, src: "", title: "" });
  // const openFS = (src, title="Viewer") => setFs({ open:true, src, title });
  const closeFS = () => setFs({ open: false, src: "", title: "" });

  const weekIdForApi = useMemo(
    () => items.find((x) => Number(x.week) === Number(wk))?.weekId || null,
    [items, wk]
  );

  // kunci scroll saat drawer terbuka (mobile)
  useEffect(() => {
    document.body.style.overflow = sideOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [sideOpen]);

  // Toast & overlay
  const [toast, setToast] = useState({ open: false, text: "" });
  const [overlay, setOverlay] = useState(false);
  const showToast = (text) => {
    setToast({ open: true, text });
    setTimeout(() => setToast({ open: false, text: "" }), 1200);
  };

  // Comments
  const [comments, setComments] = useState([]);
  const [cLoading, setCLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(cmtKey(classId, wk), JSON.stringify(comments));
    } catch {
      /* ignore */
    }
  }, [comments, classId, wk]);

  // Quiz detail (untuk viewer quiz)
  const [quizDetail, setQuizDetail] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const navigate = useNavigate();

  // menu atas kanan (titik 3)
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);

  // menu tambah di sidebar (ikon plus)
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef(null);

  const steps = useMemo(
    () =>
      items.map((it, i) => ({
        idx: i,
        title: it.title || `${capitalize(it.type)} ${i + 1}`,
        type: it.type,
      })),
    [items]
  );

  const current = items[active];

  /* ---------- Load comments saat resource aktif berubah ---------- */
  useEffect(() => {
    (async () => {
      if (!current?.id) {
        setComments([]);
        return;
      }
      try {
        setCLoading(true);
        const list = await fetchCommentsAPI(current.id);
        setComments(list);
      } catch (e) {
        console.error(e);
        setComments([]);
      } finally {
        setCLoading(false);
      }
    })();
  }, [current?.id]);

  /* ---------- Load quiz detail bila current.type === 'quiz' ---------- */
  useEffect(() => {
    if (current?.type !== "quiz") {
      setQuizDetail(null);
      return;
    }

    // 1) coba gunakan cache
    const cached = quizFromCache(current);
    if (cached) {
      setQuizDetail(cached);
      return;
    }

    // 2) kalau cache belum ada, fetch by id
    const qid = current.quizId ?? current.quiz_id ?? null;
    if (!qid) {
      setQuizDetail(null);
      return;
    }

    (async () => {
      try {
        setQuizLoading(true);
        const q = await fetchQuizDetail(qid);
        setQuizDetail(q);
      } catch (e) {
        console.error(e);
        setQuizDetail(null);
      } finally {
        setQuizLoading(false);
      }
    })();
  }, [current]);

  /* ---------- Load class & resources + cache ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);

      // header kelas (axios wrapper)
      try {
        const kjson = await get(`kelas/${classId}`);
        setKlass(kjson?.data || kjson); // fallback aman
      } catch (err) {
        console.error("Gagal memuat header kelas:", err);
      }

      // tampilkan cache dulu
      let cachedWeekItems = [];

      try {
        const raw = localStorage.getItem(resKey(classId));
        const all = raw ? JSON.parse(raw) : [];

        cachedWeekItems = (Array.isArray(all) ? all : [])
          .filter((x) => Number(x.week) === Number(wk))
          // penting: buat field yang konsisten (title "Quiz — …", quizId, dst)
          .map((it) => normalizeResource(it, it.week));
      } catch (e) {
        console.warn("Cache read/parse failed:", e);
        cachedWeekItems = [];
      }

      if (cachedWeekItems.length) {
        const sorted = [...cachedWeekItems].sort((a, b) =>
          a.id > b.id ? 1 : -1
        );
        setItems(sorted);
        setActive(0);
      }

      // refetch fresh
      try {
        const allItems = await fetchWeeksForClass(classId);
        localStorage.setItem(resKey(classId), JSON.stringify(allItems));
        const fresh = allItems
          .filter((x) => Number(x.week) === Number(wk))
          .sort((a, b) => (a.id > b.id ? 1 : -1));

        /* ⬇️ MERGE fresh dengan cachedWeekItems supaya item baru dari cache
   (hasil create quiz) tidak ketiban saat refetch selesai */
        const byId = {};
        [...cachedWeekItems, ...fresh].forEach((it) => {
          byId[it.id] = it; // yang terakhir menang → data terbaru
        });
        const merged = Object.values(byId).sort((a, b) =>
          a.id > b.id ? 1 : -1
        );

        setItems(merged);
        setActive(0);
      } catch (err) {
        console.error("fetchWeeksForClass error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [classId, wk]);

  /* ---------- Persist cache untuk week aktif ---------- */
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
      console.warn("Gagal menyimpan cache:", e);
    }
  }, [classId, wk, items]);

  /* ---------- Load comments cached (opsional) ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cmtKey(classId, wk));
      setComments(raw ? JSON.parse(raw) : []);
    } catch {
      setComments([]);
    }
  }, [classId, wk]);

  /* ---------- Close menus when clicking outside ---------- */
  useEffect(() => {
    const onDocClick = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target))
        setActionsOpen(false);
      if (addRef.current && !addRef.current.contains(e.target))
        setAddOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /* ---------- Edit / Create Material ---------- */
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);

  function openEditMaterial(target) {
    const existingWeekId =
      items.find((x) => Number(x.week) === Number(wk))?.weekId || null;

    let base = {
      id: null,
      week: Number(wk), // nomor
      weekId: existingWeekId, // ID week untuk API
      type: "composite",
      title: "",
      includeText: false,
      includeVideo: false,
      includeFile: false,
      text: "",
      videoUrl: "",
      fileUrl: "",
    };

    if (target) {
      base = {
        id: target.id ?? null,
        week: target.week ?? Number(wk),
        weekId: target.weekId ?? existingWeekId,
        type: "composite",
        title: target.title || "",
        text: target.text || "",
        videoUrl: target.videoUrl || "",
        fileUrl: target.fileUrl || "",
        includeText: !!target.text,
        includeVideo: !!target.videoUrl,
        includeFile: !!(target.file || target.fileUrl),
      };
    }

    setEditing(base);
    setShowEdit(true);
    setAddOpen(false);
    setSideOpen(false);
  }

  async function saveMaterial(updated) {
    try {
      setOverlay(true);
      let saved;

      if (updated.id) {
        const json = await updateResourceAPI(updated.id, updated);
        saved = normalizeResource(json, updated.week);
      } else {
        // ↓↓↓ PAKAI INI
        const json = await createResourceAPI(
          classId,
          updated.weekId ?? updated.week, // <-- weekId (fallback week number)
          updated
        );
        saved = normalizeResource(json, updated.week);
      }

      let nextItemsRef = [];
      setItems((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        const next = exists
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved];
        nextItemsRef = next;
        return next;
      });

      // update cache untuk week ini saja
      try {
        const raw = localStorage.getItem(resKey(classId));
        const all = raw ? JSON.parse(raw) : [];
        const rest = all.filter((x) => Number(x.week) !== Number(saved.week));
        const onlyThisWeek = nextItemsRef.filter(
          (x) => Number(x.week) === Number(saved.week)
        );
        localStorage.setItem(
          resKey(classId),
          JSON.stringify([...rest, ...onlyThisWeek])
        );
      } catch {
        /* ignore */
      }

      setShowEdit(false);
      const newIdx = nextItemsRef.findIndex((a) => a.id === saved.id);
      setActive(newIdx >= 0 ? newIdx : Math.max(nextItemsRef.length - 1, 0));
      showToast("Material saved");
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to save material");
    } finally {
      setOverlay(false);
    }
  }

  /* ---------- Delete current material ---------- */
  async function handleDeleteCurrent() {
    const cur = items[active];
    if (!cur?.id) return;
    try {
      setOverlay(true);
      await deleteResourceAPI(cur.id);

      setItems((prev) => {
        const next = prev.filter((x) => x.id !== cur.id);
        // perbarui cache semua resources
        try {
          const raw = localStorage.getItem(resKey(classId));
          const all = raw ? JSON.parse(raw) : [];
          const cleaned = all.filter((x) => x.id !== cur.id);
          localStorage.setItem(resKey(classId), JSON.stringify(cleaned));
        } catch {
          /* ignore */
        }
        const nextIdx = Math.min(active, Math.max(0, next.length - 1));
        setActive(nextIdx);
        return next;
      });

      showToast("Material deleted");
    } catch (e) {
      console.error(e);
      showToast("Failed to delete");
    } finally {
      setOverlay(false);
    }
  }

  /* ================== Styles (inline for brevity) ================== */
  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&display=swap');

:root { --violet:#6b46c1; --violet-700:#553c9a; }
body { background:#fbfbfb; font-family: Inter, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }

/* layout dasar (desktop) */
.wrap{
  display:grid;
  grid-template-columns: clamp(260px, 22vw, 360px) 1fr;
  gap: clamp(12px, 2vw, 24px);
  width:100%;
  max-width:95%;
  margin:0;
  padding: 12px clamp(12px, 2vw, 24px);
}
.panel{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; }
.left{ padding:12px; }
.right{ padding:18px; min-height:60vh; }

.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin:12px 0 6px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }

.title{ font-size: clamp(22px, 2vw + 6px, 34px); font-weight:800; margin:0 0 10px; }
.step-list{
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step{ display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:600; transition: background-color .15s ease, transform .12s ease, box-shadow .12s ease, border-color .15s ease; border:1px solid transparent; }
.step:hover{ background:#eef2ff; border-color:#e9d5ff; box-shadow:0 2px 12px rgba(107,70,193,.10); transform: translateX(2px); }
.step.active{ background:#f1f5f9; }
.idx{ width:22px; text-align:right; opacity:.6; }

.viewer{ margin-top:8px; }

.viewer iframe{ width:100%; height: min(72svh, 700px); border:0; border-radius:12px; }


.expand-btn{
  position:absolute; right:10px; top:10px;
  display:inline-flex; align-items:center; gap:6px;
  border:1px solid rgba(255,255,255,.35);
  background: rgba(17,24,39,.75); color:#fff;
  padding:8px 10px; border-radius:10px; cursor:pointer;
  backdrop-filter: blur(2px);
}
.expand-btn:hover{ background: rgba(17,24,39,.9); }

/* fullscreen overlay */
.fs-wrap{
  position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.9);
  display:grid; place-items:center;
  padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);
}
.fs-inner{ width:100vw; height:100svh; }
.fs-inner iframe{ width:100%; height:100%; border:0; }
.fs-close{
  position:fixed; top: max(10px, env(safe-area-inset-top, 10px));
  right:max(10px, env(safe-area-inset-right, 10px));
  border:0; background:#fff; color:#111827; font-weight:800; border-radius:10px; padding:8px 10px; cursor:pointer;
}

/* mobile tweak: biar lebih tinggi */
@media (max-width:640px){
  .viewer iframe, .file-frame{ height: 86svh; }
}

.toolbar, .left-top{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
.inline-btn{ border:1px solid #e5e7eb; background:#fff; color:#1f2937; font-weight:700; cursor:pointer; padding:8px 12px; border-radius:10px; display:inline-flex; align-items:center; gap:8px; }
.inline-btn:hover{ background:#f8fafc; }

.controls{ display:flex; justify-content:space-between; margin-top:22px; }
.btn{ padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; font-weight:700; cursor:pointer; }
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); color:#fff; border-color:var(--violet); }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }

.cmt-box{ margin-top:28px; }
.cmt-item{ border-top:1px solid #eef2f7; padding:16px 0; }
.cmt-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; font-weight:700; }
.cmt-meta{ font-size:12px; color:#64748b; }
.cmt-body{ margin-top:6px; line-height:1.7; }
.cmt-actions{ display:flex; gap:8px; margin-top:8px; }
.cmt-replies{ margin-top:10px; padding-left:12px; border-left:2px solid #eef2f7; }

.input,.textarea{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }
.textarea{ min-height:90px; resize:vertical; }

.skel{ background:#eef2f7; border-radius:12px; position:relative; overflow:hidden; }
.skel.shimmer::after{ content:""; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent); animation: shimmer 1.2s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
.skel-line{ height:14px; margin:10px 0; }
.skel-title{ height:32px; width:60%; margin:10px 0 14px; }
.skel-iframe{ height: clamp(280px, 45vw, 560px); border-radius:12px; }

.actions-menu{ position:relative; }
.actions-menu .dropdown{
  position:absolute; left:0; top:42px;
  background:#fff; border:1px solid #e5e7eb; border-radius:12px;
  box-shadow:0 10px 24px rgba(0,0,0,.08); min-width:220px; padding:6px; z-index:30;
}
.actions-menu .dropdown button{
  font-weight:600; font-size:14.5px; color:#0f172a; background:#fff;
  border:0; width:100%; text-align:left; padding:10px 12px; border-radius:10px; cursor:pointer;
}
.actions-menu .dropdown button:hover{ background:#f1f5f9; } /* <- ditutup dengan benar */

/* default: hamburger & bar judul mobile disembunyikan di desktop */
.mobile-top{ display:none; align-items:center; gap:10px; margin:4px 0 10px; }
.hamburger{
  display:none; border:1px solid #e2e8f0; background:#fff;
  border-radius:10px; padding:8px; align-items:center; justify-content:center;
}

/* overlay untuk drawer */
.backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:1000; display:none; }
.backdrop.show{ display:block; }

/* =================== Responsive (<=1100px) =================== */
/* =================== Responsive (<=1100px) =================== */
@media (max-width:1100px){
  .wrap{ grid-template-columns: 1fr; max-width:100%; padding:10px 12px; }

  /* sidebar menjadi drawer */
  .left{
    position: fixed; left:0; top:0; bottom:0;
    width: 86vw; max-width: 360px;
    transform: translateX(-100%);
    transition: transform .25s ease;
    z-index: 1001;

    /* penting: jangan clip dropdown */
    overflow: visible;              /* <- sebelumnya auto */
    display: flex; flex-direction: column;
  }
  .left.open{ transform: translateX(0); }

  /* biar yang scroll cuma listnya */
  .step-list{
    flex: 1 1 auto;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* hamburger bar tampil di mobile */
  .mobile-top{ display:flex; }
  .hamburger{ display:inline-flex; }

  /* pastikan dropdown di atas dan nempel kanan tombol + */
  .actions-menu .dropdown{
    right: 0; left: auto;          /* buka ke kiri dari tepi tombol */
    z-index: 1200;                 /* di atas isi drawer / backdrop */
  }

  .bottom-back{
    position: sticky; bottom:0;
    background: linear-gradient(180deg, transparent, #fff 40%);
    padding: 10px 0 12px;
  }
    .file-frame{ width:100%; height: clamp(420px, 70vh, 900px); border:0; border-radius:12px; }
.modal-overlay { z-index: 2000; }

/* --- Tombol menu komentar (Edit / Delete / Give Score) --- */
.menu button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid #e2e8f0;
  background: #f9fafb;
  color: #1f2937;
  transition: all 0.15s ease-in-out;
}

/* Hover efek lembut */
.menu button:hover {
  background: #eef2ff;
  border-color: #c7d2fe;
  color: #4338ca;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(67, 56, 202, 0.12);
}

/* Tombol Delete diberi warna merah agar tegas */
.menu button:nth-child(2):hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
  box-shadow: 0 2px 6px rgba(185, 28, 28, 0.12);
}

/* Tombol Give Score diberi warna hijau lembut */
.menu button:nth-child(3):hover {
  background: #dcfce7;
  border-color: #bbf7d0;
  color: #166534;
  box-shadow: 0 2px 6px rgba(22, 101, 52, 0.12);
}

}

`;

  return (
    <>
      <style>{styles}</style>
      {/* overlay untuk drawer */}
      {sideOpen && (
        <div className="backdrop show" onClick={() => setSideOpen(false)} />
      )}
      <div className="week-detail-page">
        <div className="wrap">
          {/* Left: steps / add actions */}
          <aside className={`panel left ${sideOpen ? "open" : ""}`}>
            <div className="left-top">
              <div style={{ fontWeight: 800 }}>
                Week {wk} — {klass?.nama_kelas || ""}
              </div>

              {role === "dosen" && (
                <div className="actions-menu" ref={addRef}>
                  <button
                    className="inline-btn btn-primary"
                    onClick={() => setAddOpen((s) => !s)}
                    aria-haspopup="menu"
                    aria-expanded={addOpen}
                    title="Add"
                  >
                    <PlusCircle size={16} />
                  </button>
                  {addOpen && (
                    <div className="dropdown">
                      <button
                        onClick={() => {
                          setAddOpen(false);
                          setSideOpen(false);
                          openEditMaterial(null);
                        }}
                      >
                        Add Material
                      </button>

                      <button
                        onClick={() => {
                          setAddOpen(false);
                          const wid = weekIdForApi || wk; // fallback
                          navigate(
                            `/lecture/classes/${classId}/weeks/${wk}/quiz/new?wid=${wid}`
                          );
                        }}
                      >
                        New Quiz (Multiple choice)
                      </button>
                      <button
                        onClick={() => {
                          setAddOpen(false);
                          const wid = weekIdForApi || wk;
                          navigate(
                            `/lecture/classes/${classId}/weeks/${wk}/quiz/new?type=short&wid=${wid}`
                          );
                        }}
                      >
                        New Short-answer
                      </button>
                      <button
                        onClick={() => {
                          setAddOpen(false);
                          const wid = weekIdForApi || wk;
                          navigate(
                            `/lecture/classes/${classId}/weeks/${wk}/assignment/new?wid=${wid}`
                          );
                        }}
                      >
                        New Assignment
                      </button>
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
                  <div className="skel shimmer" style={{ height: 44 }} />
                </>
              ) : steps.length === 0 ? (
                <div style={{ opacity: 0.6 }}>No content yet.</div>
              ) : (
                steps.map((s) => (
                  <div
                    key={s.idx}
                    className={`step ${s.idx === active ? "active" : ""}`}
                    onClick={() => {
                      setActive(s.idx);
                      setSideOpen(false);
                    }}
                    tabIndex={0}
                  >
                    <span className="idx">{s.idx + 1}.</span>
                    <span>{s.title}</span>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Right: content viewer */}
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
                Week {wk}
                {klass?.nama_kelas ? ` — ${klass.nama_kelas}` : ""}
              </div>
            </div>
            <div className="breadcrumb">
              <Link to="/lecture">Dashboard</Link>
              <ChevronRight size={16} />
              <Link to={`/lecture/classes/${classId}`}>Class</Link>
              <ChevronRight size={16} />
              <span>Week {wk}</span>
            </div>

            {role === "dosen" && (
              <div className="toolbar" style={{ justifyContent: "flex-end" }}>
                <div
                  className="actions-menu"
                  ref={actionsRef}
                  style={{ position: "relative" }}
                >
                  <button
                    className="inline-btn"
                    onClick={() => setActionsOpen((s) => !s)}
                    aria-haspopup="menu"
                    aria-expanded={actionsOpen}
                    title="Actions"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {actionsOpen && (
                    <div
                      className="dropdown"
                      style={{ right: 0, left: "auto" }}
                    >
                      <button
                        onClick={() => {
                          setActionsOpen(false);
                          const target = items[active];
                          if (!target || target.type === "empty") return;

                          if (target.type === "assignment") {
                            const aid =
                              target.assignmentId || target.assignment?.id;
                            if (!aid) return;
                            navigate(
                              `/lecture/classes/${classId}/weeks/${wk}/assignment/${aid}/edit`
                            );
                            return;
                          }

                          if (target.type === "quiz") {
                            const qid = target.quizId || target.quiz?.id;
                            if (!qid) return;
                            navigate(
                              `/lecture/classes/${classId}/weeks/${wk}/quiz/${qid}/edit?wid=${
                                weekIdForApi || wk
                              }`
                            );
                            return;
                          }

                          // default: material biasa
                          openEditMaterial(target);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setActionsOpen(false);
                          handleDeleteCurrent();
                        }}
                        style={{ color: "#b91c1c" }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Viewer */}
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
                  {` ${active + 1}. `}
                  {current.title || capitalize(current.type)}
                </h1>

                {/* ===== COMPOSITE ===== */}
                {current.type === "composite" && (
                  <div style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {/* TEXT (opsional) */}
                    {current.text && (
                      <section style={{ marginBottom: 20 }}>
                        <div>{current.text}</div>
                      </section>
                    )}

                    {/* VIDEO (opsional) */}
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

                    {/* FILE (opsional) */}
                    {current.fileUrl && (
                      <section style={{ marginTop: 16 }}>
                        <FileViewer
                          url={current.fileUrl}
                          title={current.title || "File"}
                        />
                      </section>
                    )}
                  </div>
                )}

                {/* ===== LEGACY TYPES (tetap didukung) ===== */}
                {current.type === "text" && (
                  <div style={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {current.text}
                  </div>
                )}

                {current.type === "video" && (
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
                )}

                {current.type === "file" && (
                  <FileViewer
                    url={current.fileUrl}
                    title={current.title || "File"}
                  />
                )}

                {current.type === "assignment" && (
                  <div style={{ lineHeight: 1.7 }}>
                    <div className="cmt-meta" style={{ marginBottom: 8 }}>
                      {current.dueDate
                        ? `Due: ${new Date(current.dueDate).toLocaleString()}`
                        : "No due date"}
                      {" • "}
                      Max score: {current.maxScore ?? 100}
                      {current.allowFile ? " • File upload enabled" : ""}
                    </div>
                    {current.instructions && (
                      <section style={{ whiteSpace: "pre-wrap" }}>
                        {current.instructions}
                      </section>
                    )}
                  </div>
                )}

                {current.type === "quiz" && (
                  <div>
                    <div className="cmt-meta" style={{ marginBottom: 8 }}>
                      {quizLoading
                        ? "Loading quiz…"
                        : quizDetail?.title || current.title}
                    </div>

                    {!quizLoading && quizDetail && (
                      <>
                        {quizDetail.instructions && (
                          <div
                            style={{ whiteSpace: "pre-wrap", marginBottom: 10 }}
                          >
                            {quizDetail.instructions}
                          </div>
                        )}

                        <div className="cmt-meta" style={{ marginBottom: 12 }}>
                          {quizDetail.timeLimit
                            ? `Time limit: ${quizDetail.timeLimit} min`
                            : "No time limit"}
                          {" • "}
                          {quizDetail.shuffle ? "Shuffle: on" : "Shuffle: off"}
                        </div>

                        <ol
                          style={{
                            display: "grid",
                            gap: 14,
                            paddingLeft: 18,
                            listStyle: "none",
                          }}
                        >
                          {quizDetail.questions.map((q, idx) => (
                            <li key={q.id} style={{ lineHeight: 1.6 }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                {idx + 1}. {q.text}
                                <span
                                  className="cmt-meta"
                                  style={{ marginLeft: 8 }}
                                >
                                  ({String(q.type).replace(/_/g, " ")})
                                </span>
                              </div>

                              {Array.isArray(q.options) &&
                                q.options.length > 0 && (
                                  <ul style={{ marginTop: 6 }}>
                                    {q.options.map((op) => (
                                      <li
                                        key={op.id}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 999,
                                            background: op.isCorrect
                                              ? "#16a34a"
                                              : "#e5e7eb",
                                            display: "inline-block",
                                          }}
                                        />
                                        <span>{op.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>
                )}

                <div className="controls">
                  <button
                    className="btn"
                    disabled={active === 0}
                    onClick={() => setActive((i) => Math.max(0, i - 1))}
                  >
                    Previous
                  </button>
                  <div />
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

                <Discussion
                  comments={comments}
                  cLoading={cLoading}
                  newText={newText}
                  setNewText={setNewText}
                  addComment={async () => {
                    const txt = newText.trim();
                    if (!txt || !current?.id) return;
                    try {
                      const saved = await createCommentAPI(
                        current.id,
                        txt,
                        null
                      );
                      setComments((prev) => [...prev, saved]);
                      setNewText("");
                    } catch (e) {
                      showToast(e.message);
                    }
                  }}
                  updateComment={async (id, text, parentId = null) => {
                    try {
                      const saved = await updateCommentAPI(id, text);
                      if (!parentId) {
                        setComments((list) =>
                          list.map((c) => (c.id === id ? saved : c))
                        );
                      } else {
                        setComments((list) =>
                          list.map((c) =>
                            c.id !== parentId
                              ? c
                              : {
                                  ...c,
                                  replies: (c.replies || []).map((r) =>
                                    r.id === id ? saved : r
                                  ),
                                }
                          )
                        );
                      }
                    } catch (e) {
                      showToast(e.message);
                    }
                  }}
                  deleteComment={async (id, parentId = null) => {
                    try {
                      await deleteCommentAPI(id);
                      if (!parentId) {
                        setComments((list) => list.filter((c) => c.id !== id));
                      } else {
                        setComments((list) =>
                          list.map((c) =>
                            c.id !== parentId
                              ? c
                              : {
                                  ...c,
                                  replies: (c.replies || []).filter(
                                    (r) => r.id !== id
                                  ),
                                }
                          )
                        );
                      }
                    } catch (e) {
                      showToast(e.message);
                    }
                  }}
                  addReply={async (parentId, text) => {
                    const t = (text || "").trim();
                    if (!t || !current?.id) return;
                    try {
                      const saved = await createCommentAPI(
                        current.id,
                        t,
                        parentId
                      );
                      setComments((list) =>
                        list.map((c) =>
                          c.id !== parentId
                            ? c
                            : { ...c, replies: [...(c.replies || []), saved] }
                        )
                      );
                    } catch (e) {
                      showToast(e.message);
                    }
                  }}
                  isLecturer={role === "dosen"}
                  onScore={async (commentId, score) => {
                    const num = Number(score);
                    if (!Number.isInteger(num) || num < 1 || num > 100) {
                      showToast("Score must be 1–100");
                      return;
                    }
                    try {
                      const saved = await scoreCommentAPI(commentId, num);
                      setComments((list) =>
                        list.map((c) =>
                          c.id === saved.id
                            ? saved
                            : {
                                ...c,
                                replies: (c.replies || []).map((r) =>
                                  r.id === saved.id ? saved : r
                                ),
                              }
                        )
                      );
                    } catch (e) {
                      showToast(e.message);
                    }
                  }}
                />
              </div>
            ) : (
              <div>No content found for this week.</div>
            )}
          </section>
        </div>
      </div>
      {/* Modal Edit/Add */}
      <EditMaterialModal
        open={showEdit}
        data={editing}
        onClose={() => setShowEdit(false)}
        onSave={saveMaterial}
      />
      {/* Overlay loading */}
      {overlay && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.25)",
            display: "grid",
            placeItems: "center",
            zIndex: 2000,
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
            Processing…
          </div>
        </div>
      )}
      {/* Fullscreen overlay */}
      {fs.open && (
        <div className="fs-wrap" onClick={closeFS}>
          <div className="fs-inner" onClick={(e) => e.stopPropagation()}>
            <button className="fs-close" onClick={closeFS}>
              <X size={16} /> Close
            </button>
            <iframe
              title={fs.title}
              src={fs.src}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}
      {/* Toast center screen */}
      {toast.open && (
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
              padding: "10px 14px",
              borderRadius: 10,
              boxShadow: "0 12px 30px rgba(0,0,0,.25)",
            }}
          >
            {toast.text}
          </div>
        </div>
      )}
    </>
  );
}

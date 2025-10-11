// src/pages/mahasiswa/AttemptPage.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ChevronLeft } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ——— Modal kecil di tengah layar ———
function CenterAlert({ open, text, onClose }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#111827",
          color: "#fff",
          padding: "14px 18px",
          borderRadius: 12,
          boxShadow: "0 14px 40px rgba(0,0,0,.35)",
          minWidth: 260,
          maxWidth: 520,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Info</div>
        <div>{text}</div>
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}
        >
          <button className="btn btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ——— kecil-kecilan util ———
const stripLeadingNumber = (s) =>
  String(s || "").replace(/^\s*\d+[.)-]\s*/, "");

// ——— Styles ringan agar mirip halaman lain ———
const pageStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@400;600;700;800&display=swap');
:root { --violet:#6b46c1; --violet-700:#553c9a; }
.atp-root{ font-family: Inter, Poppins, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#fbfbfb; }
.wrap{ width:100%; max-width:1000px; margin:0 auto; padding: 14px clamp(12px,2vw,24px); }
.panel{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px; }
.breadcrumb{ display:flex; align-items:center; gap:8px; color:#475569; font-weight:600; margin-bottom:10px; }
.breadcrumb a{ color:#475569; text-decoration:none; }
.breadcrumb a:hover{ text-decoration:underline; }
.title{ font-size: clamp(22px, 2vw + 6px, 34px); font-weight:800; margin:0 0 8px; }
.meta{ color:#64748b; font-size:14px; margin-bottom:12px; }
.btn{ padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; font-weight:700; cursor:pointer; }
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); color:#fff; border-color:var(--violet); }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }
.qcard{ border:1px solid #e5e7eb; border-radius:12px; padding:14px; }
.qtitle{ font-weight:800; margin-bottom:6px; }
.opt{ display:flex; align-items:center; gap:10px; padding:6px 0; }
.hr{ border:none; border-top:1px solid #eef2f7; margin:14px 0; }
.bottom{ display:flex; justify-content:space-between; margin-top:14px; }
.timer{ font-weight:800; color:#111827; }
.badge{ font-size:12px; font-weight:800; padding:4px 8px; border-radius:999px; background:#eef2ff; color:#4338ca; }
.disabled{ opacity:.55; pointer-events:none; }
.input{ width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px 12px; font:inherit; outline:none; }

}
`;

// ——— Komponen utama ———
export default function AttemptPage() {
  const { classId, week, quizId } = useParams();
  const [sp] = useSearchParams();
  const aidFromQS = sp.get("aid");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null); // { id, status, time_left, score, ... }
  const [quiz, setQuiz] = useState(null); // { title, questions:[{id,question_text,options:[...]}] }
  const [answers, setAnswers] = useState({}); // { [question_id]: option_id | "__TEXT__::<value>" }
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // detik
  const tickRef = useRef(null);
  const started = attempt?.status === "started";

  // fetch attempt detail
  useEffect(() => {
    (async () => {
      try {
        if (!aidFromQS) {
          setAlert({ open: true, text: "Attempt ID (aid) tidak ditemukan." });
          setLoading(false);
          return;
        }

        const r = await fetch(`${BASE_URL}/api/attempts/${aidFromQS}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!r.ok) throw new Error(`Load attempt failed (${r.status})`);

        const json = await r.json();
        const a = json.attempt || json;
        const qz = json.quiz || {};

        setAttempt(a);
        setQuiz(qz);

        // ---- FIX: 0 = tanpa batas waktu -> jadikan null supaya timer tidak jalan
        const noLimit = Number(qz.time_limit ?? 0) === 0;
        const rawLeft = Number(a.time_left);
        const tl = noLimit
          ? null
          : Number.isFinite(rawLeft)
          ? Math.max(0, rawLeft)
          : null;

        setTimeLeft(tl);

        // seed jawaban
        const seeded = {};
        (json.answers || []).forEach((row) => {
          if (row.option_id) seeded[row.question_id] = String(row.option_id);
          else if (row.text_answer)
            seeded[row.question_id] = `__TEXT__::${row.text_answer}`;
        });
        setAnswers(seeded);
      } catch (e) {
        console.error(e);
        setAlert({ open: true, text: e.message || "Gagal memuat attempt." });
      } finally {
        setLoading(false);
      }
    })();
  }, [aidFromQS, token]);

  // Kirim submit aborted saat tab ditutup / refresh / pindah tab
  useEffect(() => {
    if (!attempt || attempt.status !== "started") return;

    const submitAborted = () => {
      fetch(`${BASE_URL}/api/attempts/${attempt.id}/submit?aborted=1`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        keepalive: true,
        body: JSON.stringify({ aborted: 1 }),
      }).catch(() => {});
    };

    // 1) Tutup/refresh tab
    const beforeUnload = (event) => {
      submitAborted();
      event.preventDefault(); // <- pakai parameternya
      event.returnValue = ""; // <- agar beberapa browser menampilkan konfirmasi
    };
    window.addEventListener("beforeunload", beforeUnload);

    // 2) Sembunyikan tab (opsional, saat user benar-benar pergi dari tab)
    const onHidden = () => {
      if (document.visibilityState === "hidden") submitAborted();
    };
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [attempt?.id, attempt?.status, token]);

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (!attempt) return;

      // Anti double-submit di sisi UI
      if (attempt.status !== "started") {
        setAlert({ open: true, text: "Attempt sudah disubmit." });
        return;
      }
      if (submitting) return;

      try {
        setSubmitting(true);

        const r = await fetch(`${BASE_URL}/api/attempts/${attempt.id}/submit`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          // 409 dari backend → attempt sudah disubmit (race/duplikat)
          if (r.status === 409) {
            setAlert({ open: true, text: "Quiz sudah pernah disubmit." });
            try {
              const j = JSON.parse(txt);
              const aid = j?.attempt?.id ?? attempt.id;
              navigate(
                `/student/classes/${classId}/weeks/${week}/quiz/${quizId}/review?aid=${aid}`
              );
            } catch {
              // abaikan jika body bukan JSON
            }
            return;
          }
          throw new Error(`Submit gagal (${r.status}) ${txt}`);
        }

        const json = await r.json();

        // Cache skor lokal agar WeekDetail bisa menampilkan nilai cepat
        try {
          localStorage.setItem(
            `quiz-score:${quizId}`,
            JSON.stringify({
              score: json.score,
              at: Date.now(),
              attemptId: attempt.id,
            })
          );
        } catch {
          // abaikan error storage
        }

        // Update state attempt agar tombol terkunci & skor tampil
        setAttempt((a) => ({
          ...a,
          status: "submitted",
          score: json.score,
          ended_at: new Date().toISOString(),
        }));

        // Notifikasi
        setAlert({
          open: true,
          text: auto
            ? "Waktu habis. Jawaban otomatis disubmit."
            : "Quiz telah disubmit!",
        });

        // Pindah ke halaman review
        setTimeout(() => {
          navigate(
            `/student/classes/${classId}/weeks/${week}/quiz/${quizId}/review?aid=${attempt.id}`
          );
        }, 500);
      } catch (e) {
        console.error(e);
        setAlert({ open: true, text: e.message || "Submit gagal." });
      } finally {
        setSubmitting(false);
      }
    },
    [attempt, submitting, token, classId, week, quizId, navigate]
  );

  // auto timer & auto-submit
  useEffect(() => {
    if (!started) return;
    if (timeLeft == null) return;

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setTimeLeft((s) => {
        if (s == null) return s;
        if (s <= 1) {
          clearInterval(tickRef.current);
          handleSubmit(true); // aman: sudah useCallback
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(tickRef.current);
  }, [started, timeLeft, handleSubmit]);

  const abortAttempt = async () => {
    if (!attempt?.id || attempt.status !== "started") return;
    try {
      await fetch(`${BASE_URL}/api/attempts/${attempt.id}/abort`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        // agar tetap dikirim walau user menutup tab
        keepalive: true,
      });
    } catch (e) {
      // diamkan saja; ini best-effort
      console.warn("abortAttempt failed:", e);
    }
  };

  const fmtTime = useMemo(() => {
    if (timeLeft == null) return "No limit";
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [timeLeft]);

  const pickOption = async (qId, optId) => {
    // simpan lokal dulu agar terasa instan
    setAnswers((map) => ({ ...map, [qId]: String(optId) }));
    try {
      await fetch(`${BASE_URL}/api/attempts/${attempt.id}/answers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ question_id: qId, option_id: Number(optId) }),
      });
    } catch (e) {
      console.error(e);
      setAlert({ open: true, text: "Gagal menyimpan jawaban. Koneksi?" });
    }
  };

  // simpan typed answer (dengan debounce ringan)
  const textTimers = useRef({});

  useEffect(() => {
    return () => {
      Object.values(textTimers.current || {}).forEach((t) => clearTimeout(t));
    };
  }, []);

  const typeAnswer = (qId, text) => {
    setAnswers((m) => ({ ...m, [qId]: `__TEXT__::${text}` }));

    if (textTimers.current[qId]) clearTimeout(textTimers.current[qId]);
    textTimers.current[qId] = setTimeout(async () => {
      try {
        await fetch(`${BASE_URL}/api/attempts/${attempt.id}/answers`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ question_id: qId, text_answer: text }),
        });
      } catch (e) {
        console.error(e);
        setAlert({ open: true, text: "Gagal menyimpan jawaban. Koneksi?" });
      }
    }, 350);
  };

  return (
    <div className="atp-root">
      <style>{pageStyles}</style>
      <div className="wrap">
        <div className="breadcrumb">
          <Link to="/student">Dashboard</Link>
          <span>›</span>
          <Link to={`/student/classes/${classId}/weeks/${week}`}>
            Week {week}
          </Link>
          <span>›</span>
          <span>Attempt</span>
        </div>

        <div className="panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <h1 className="title">Quiz — {quiz?.title || ""}</h1>
            <div className="badge">
              Time left: <span className="timer">{fmtTime}</span>
            </div>
          </div>

          {loading ? (
            <div className="meta">Loading…</div>
          ) : !quiz ? (
            <div className="meta">Quiz tidak ditemukan.</div>
          ) : (
            <>
              <ol style={{ display: "grid", gap: 14, paddingLeft: 18 }}>
                {(quiz.questions || []).map((q, idx) => (
                  <li key={q.id} className="qcard">
                    <div className="qtitle">
                      {idx + 1}. {stripLeadingNumber(q.question_text || q.text)}
                    </div>

                    {/** Deteksi short answer */}
                    {String(q.type || "").toUpperCase() === "SHORT_ANSWER" ||
                    (Array.isArray(q.options) && q.options.length === 0) ? (
                      <input
                        className="input"
                        type="text"
                        placeholder="Type your answer…"
                        value={
                          String(answers[q.id] || "").startsWith("__TEXT__::")
                            ? String(answers[q.id]).slice("__TEXT__::".length)
                            : ""
                        }
                        onChange={(e) => typeAnswer(q.id, e.target.value)}
                        disabled={!started}
                      />
                    ) : (
                      <div>
                        {(q.options || []).map((op) => (
                          <label key={op.id} className="opt">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={
                                String(answers[q.id] || "") === String(op.id)
                              }
                              onChange={() => pickOption(q.id, op.id)}
                              disabled={!started}
                            />
                            <span>{op.option_text ?? op.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              <div className="hr" />

              <div className="bottom">
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    onClick={async () => {
                      await abortAttempt();
                      navigate(-1);
                    }}
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                </div>

                <div>
                  <button
                    className={`btn btn-primary ${
                      !started || submitting ? "disabled" : ""
                    }`}
                    onClick={() => handleSubmit(false)}
                    disabled={!started || submitting}
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <CenterAlert
        open={alert.open}
        text={alert.text}
        onClose={() => setAlert({ open: false, text: "" })}
      />
    </div>
  );
}

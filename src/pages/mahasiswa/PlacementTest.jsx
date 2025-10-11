// src/pages/mahasiswa/PlacementTest.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DEFAULT_LIMIT_MIN = 30; // ⬅️ 30 menit

export default function PlacementTest() {
  const token = localStorage.getItem("token") || "";
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const aid = sp.get("aid");

  // state
  const [attempt, setAttempt] = useState(null);
  const [test, setTest] = useState({ title: "Placement Test", questions: [] });
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // load attempt + test
  useEffect(() => {
    if (!aid) {
      navigate("/student");
      return;
    }
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/placement/attempts/${aid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: ac.signal,
        });

        if (!r.ok) {
          // kalau 404/403 baru redirect; selain itu lempar error biasa
          if (r.status === 404 || r.status === 403) {
            if (!cancelled) navigate("/student");
            return;
          }
          throw new Error(`HTTP ${r.status}`);
        }

        const j = await r.json();
        if (cancelled) return;

        setAttempt(j?.attempt ?? null);

        const title =
          j?.test?.title || j?.attempt?.test?.title || "Placement Test";

        // pastikan time_limit ikut disimpan
        const tl = Number(
          j?.test?.time_limit ?? j?.attempt?.test?.time_limit ?? 0
        );

        const questions = Array.isArray(j?.test?.questions)
          ? j.test.questions
          : Array.isArray(j?.questions)
          ? j.questions
          : [];

        setTest({ title, time_limit: tl, questions });
      } catch (err) {
        // Abaikan abort dari cleanup/StrictMode
        if (err?.name === "AbortError" || err?.code === 20) return;
        console.error("Load placement attempt failed:", err);
        if (!cancelled) navigate("/student");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [aid, token, navigate]);

  // timer (ambil dari test.time_limit kalau diset; fallback 30 menit)
  useEffect(() => {
    if (!attempt) return;

    const limitMin =
      Number(test?.time_limit) > 0
        ? Number(test.time_limit)
        : DEFAULT_LIMIT_MIN;

    const started = attempt?.started_at
      ? new Date(attempt.started_at).getTime()
      : Date.now();

    const endAt = started + limitMin * 60 * 1000;

    // set awal
    setTimeLeft(Math.max(0, Math.floor((endAt - Date.now()) / 1000)));

    const iv = setInterval(() => {
      const sec = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setTimeLeft(sec);
      if (sec <= 0) {
        clearInterval(iv);
        // auto submit ketika habis
        submit(true).catch(() => {});
      }
    }, 1000);

    return () => clearInterval(iv);
  }, [attempt?.id, test?.time_limit]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const totalQ = useMemo(
    () => (Array.isArray(test?.questions) ? test.questions.length : 0),
    [test?.questions]
  );

  const percent = totalQ ? Math.round((answeredCount / totalQ) * 100) : 0;

  const fmt = (s) => {
    const m = Math.floor((s ?? 0) / 60)
      .toString()
      .padStart(2, "0");
    const n = Math.floor((s ?? 0) % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${n}`;
  };

  // pilih jawaban (simpan lokal + kirim best-effort ke server)
  const choose = async (qid, oid) => {
    setAnswers((m) => ({ ...m, [qid]: oid }));
    try {
      await fetch(`${BASE_URL}/api/placement/attempts/${aid}/answer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ question_id: qid, option_id: oid }),
      });
    } catch (err) {
      console.warn("Save answer failed (ignored):", err);
    }
  };

  // submit & redirect
  const submit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(
        `${BASE_URL}/api/placement/attempts/${aid}/submit`,
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
        if (!auto) alert(msg || `Submit failed (${r.status})`);
        return;
      }

      const j = await r.json();

      if (auto) alert("Waktu habis. Jawabanmu otomatis terkirim.");
      // ← arahkan ke halaman review
      if (j.review_url) {
        const url = new URL(j.review_url);
        navigate(url.pathname + url.search);
      } else {
        navigate(`/student/placement-review?aid=${aid}`);
      }
    } catch (err) {
      if (!auto) alert("Submit failed. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-root">
      {/* gaya halaman agar serasi dg dashboard */}
      <style>{`
:root { --violet:#6b46c1; --violet-700:#553c9a; }
body { background:#fbfbfb; }
.pt-wrap{ max-width:1000px; margin:0 auto; padding:20px clamp(12px,2vw,24px); }
.breadcrumb{ font-size:14px; color:#64748b; display:flex; gap:6px; align-items:center; margin-bottom:8px; }
.breadcrumb a{ color:#6b7280; text-decoration:none; }
.header{
  background: radial-gradient(1200px 400px at 80% -20%, rgba(255,255,255,.25), transparent 60%), var(--violet);
  color:#fff; border-radius:16px; padding:18px 20px; box-shadow:0 10px 28px rgba(0,0,0,.12);
  display:flex; align-items:center; justify-content:space-between; gap:10px;
}
.header .title{ font-weight:800; font-size: clamp(18px, 1.2vw + 10px, 24px); margin:0; }
.badges{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.badge{
  background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.25);
  padding:6px 10px; border-radius:999px; font-weight:700;
}
.badge.warn{ background:#fff; color:#111827; border-color:#e5e7eb; }
.panel{
  background:#fff; border:1px solid #e5e7eb; border-radius:14px; margin-top:14px; box-shadow:0 2px 8px rgba(0,0,0,.06);
}
.panel .inner{ padding:18px; }
.qitem{ padding:14px; border:1px solid #eef2f7; border-radius:12px; }
.qhead{ font-weight:700; margin-bottom:8px; }
.opt{ display:flex; align-items:flex-start; gap:8px; padding:6px 8px; border-radius:8px; cursor:pointer; }
.opt:hover{ background:#f9fafb; }
.opt input{ margin-top:3px; }
.divider{ height:1px; background:#eef2f7; margin:16px 0; }
.btn{
  padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1;
  background:#fff; color:#111827; font-weight:700; cursor:pointer;
}
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); border-color:var(--violet); color:#fff; }
.btn-primary:hover{ background:var(--violet-700); color:#fff; }
.stickybar{
  position:sticky; bottom:0; background:#fff; border-top:1px solid #e5e7eb;
  padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:12px;
  border-bottom-left-radius:14px; border-bottom-right-radius:14px;
}
.tleft{
  font-weight:800; 
}
.tleft.warn{ color:#b91c1c; } /* merah saat < 1 menit */
.progressWrap{ height:8px; background:#e5e7eb; border-radius:999px; overflow:hidden; }
.progressBar{ height:100%; background:var(--violet); width:0%; transition:width .2s; }
      `}</style>

      <div className="pt-wrap">
        <div className="breadcrumb">
          <Link to="/student">Dashboard</Link>
          <span>›</span>
          <span>Placement Test</span>
        </div>

        <div className="header">
          <h1 className="title">{test?.title || "Placement Test"}</h1>
          <div className="badges">
            <span
              className={`badge ${
                timeLeft !== null && timeLeft <= 60 ? "warn" : ""
              }`}
            >
              Time: {timeLeft === null ? "…" : fmt(timeLeft)}
            </span>
            <span className="badge">
              {answeredCount}/{totalQ} answered
            </span>
          </div>
        </div>

        <div className="panel">
          {loading ? (
            <div className="inner">Loading…</div>
          ) : (
            <>
              <div className="inner">
                {/* progress bar */}
                <div className="progressWrap" aria-hidden>
                  <div
                    className="progressBar"
                    style={{ width: `${percent}%` }}
                    aria-label={`Progress ${percent}%`}
                  />
                </div>

                <ol style={{ display: "grid", gap: 14, paddingLeft: 18 }}>
                  {(test?.questions ?? []).map((q, idx) => {
                    // buang angka "1.", "2)" dst di awal teks soal
                    const cleanText = String(q?.text ?? "").replace(
                      /^\s*\d+[.)-]?\s*/,
                      ""
                    );
                    return (
                      <li key={q?.id ?? idx} className="qcard">
                        <div className="qtitle">{cleanText}</div>

                        {(q?.options ?? []).map((op) => (
                          <label key={op.id} className="opt">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={
                                String(answers[q.id] ?? "") === String(op.id)
                              }
                              onChange={() => choose(q.id, op.id)}
                            />
                            <span>{op.text}</span>
                          </label>
                        ))}
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="stickybar">
                <div
                  className={`tleft ${
                    timeLeft !== null && timeLeft <= 60 ? "warn" : ""
                  }`}
                >
                  Time left: {timeLeft === null ? "…" : fmt(timeLeft)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      if (
                        confirm(
                          "Keluar dari tes? Jawaban yang belum tersimpan bisa hilang."
                        )
                      ) {
                        navigate("/student");
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (confirm("Yakin submit jawaban sekarang?"))
                        submit(false);
                    }}
                    disabled={submitting || attempt?.status === "submitted"}
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

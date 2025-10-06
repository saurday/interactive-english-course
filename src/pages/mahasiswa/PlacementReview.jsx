import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const BASE_URL = "https://laravel-interactive-english-course-production.up.railway.app";

export default function PlacementReview() {
  const token = localStorage.getItem("token") || "";
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const aid = sp.get("aid");

  const [data, setData] = useState({
    correct: 0,
    total: 0,
    score_percent: 0,
    level: null,
    level_name: null,
    questions: [],
    materials_url: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!aid) {
      navigate("/student");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `${BASE_URL}/api/placement/attempts/${aid}/review`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancelled) setData(j);
      } catch (e) {
        console.error(e);
        if (!cancelled) navigate("/student");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aid, token, navigate]);

  return (
    <div className="pt-root">
      <style>{`
:root { --violet:#6b46c1; --violet-700:#553c9a; }
body { background:#fbfbfb; }
.wrap{ max-width:1000px; margin:0 auto; padding:20px clamp(12px,2vw,24px); }
.header{
  background: radial-gradient(1200px 400px at 80% -20%, rgba(255,255,255,.25), transparent 60%), var(--violet);
  color:#fff; border-radius:16px; padding:18px 20px; box-shadow:0 10px 28px rgba(0,0,0,.12);
  display:flex; align-items:center; justify-content:space-between; gap:10px;
}
.badge{ background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25);
  padding:6px 10px; border-radius:999px; font-weight:700; }
.card{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
.q{ border:1px solid #eef2f7; border-radius:12px; padding:12px; }
.opt{ display:flex; gap:8px; margin:4px 0; padding:6px; border-radius:8px; border:1px solid transparent; }
  .opt.chosen{ background:#f8fafc; border-color:#cbd5e1; }
  .opt.correct.chosen{ background:#ecfdf5; border-color:#a7f3d0; }
  .opt.wrong.chosen{ background:#fef2f2; border-color:#fecaca; }
.btn{
  padding:10px 14px; border-radius:10px; border:1px solid #cbd5e1;
  background:#fff; color:#111827; font-weight:700; cursor:pointer;
}
.btn:hover{ background:#f8fafc; }
.btn-primary{ background:var(--violet); border-color:var(--violet); color:#fff; }
.btn-primary:hover{ background:var(--violet-700); }
.subtle, .muted { color:#64748b; }

/* tampilan khusus untuk "No answer" */
.noanswer{
  color:#64748b;
  font-style: italic;
  background:#f8fafc;
  border:1px dashed #e5e7eb;
  padding:4px 8px;
  border-radius:8px;
  display:inline-block;
}
      `}</style>

      <div className="wrap">
        <div className="header">
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>
              Placement Review
            </div>
            <div style={{ opacity: 0.95 }}>
              Score{" "}
              <b>
                {data.correct}/{data.total}
              </b>{" "}
              &mdash; Level:&nbsp;
              <b>
                {data.level}{" "}
                {data.level_name
                  ? `(${data.level_name.replace(/^[A-C]\d\s*/, "").trim()})`
                  : ""}
              </b>
            </div>
          </div>
          <div className="badge">{data.score_percent}%</div>
        </div>

        <div style={{ height: 12 }} />

        <div className="card">
          {loading ? (
            "Loading…"
          ) : (
            <ol style={{ display: "grid", gap: 14, paddingLeft: 18 }}>
              {(data?.questions ?? []).map((q, idx) => {
                const hasChoice = (q.options || []).some(
                  (o) => o.chosen === true
                );
                return (
                  <li key={q?.id ?? idx} className="qcard">
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      {String(q.text || "").replace(/^\s*\d+[.)-]?\s*/, "")}
                    </div>

                    {q.options.map((op) => {
                      const isCorrect = op.is_correct === true;
                      const chosen = op.chosen === true;

                      // HANYA warnai kalau dipilih; jangan highlight kunci kalau tidak dipilih
                      let cls = "opt";
                      if (chosen && isCorrect) cls += " correct chosen";
                      else if (chosen && !isCorrect) cls += " wrong chosen";
                      else if (chosen) cls += " chosen";

                      return (
                        <div key={op.id} className={cls}>
                          <div>
                            <input type="radio" checked={chosen} readOnly />
                          </div>
                          <div>
                            {op.text}
                            {chosen && isCorrect && (
                              <em style={{ marginLeft: 8, color: "#059669" }}>
                                (correct)
                              </em>
                            )}
                            {chosen && !isCorrect && (
                              <em style={{ marginLeft: 8, color: "#b91c1c" }}>
                                (your choice)
                              </em>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {!hasChoice && (
                      <div className="noanswer" style={{ marginTop: 6 }}>
                        No answer
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 14,
            }}
          >
            <button
              className="btn btn-primary"
              onClick={() => navigate("/student/cefr", { replace: true })}
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/pages/mahasiswa/ReviewPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { get, ApiError } from "@/config/api";

export default function ReviewPage() {
  const { classId, week } = useParams();
  const [sp] = useSearchParams();
  const aid = sp.get("aid");

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!aid) {
      setErr("Missing attempt id");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // ✅ GET /attempts/:attempt
        const json = await get(`/attempts/${aid}`);
        if (!cancelled) setData(json);
      } catch (e) {
        if (e instanceof ApiError) {
          setErr(`Failed to fetch review (HTTP ${e.status})`);
        } else {
          setErr("Network error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aid]);

  if (err) return <div style={{ padding: 20 }}>{err}</div>;
  if (!data) return <div style={{ padding: 20 }}>Loading review…</div>;

  const ansMap = new Map((data.answers || []).map((a) => [a.question_id, a]));

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "14px auto",
        padding: "0 16px",
        fontFamily: "Inter, system-ui",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <Link to={`/student/classes/${classId}/weeks/${week}`}>← Back to Week</Link>
      </div>

      <h1 style={{ fontWeight: 800, marginBottom: 4 }}>
        Review — {data.quiz?.title}
      </h1>
      <div style={{ color: "#64748b", marginBottom: 10 }}>
        Score: <b>{data.attempt?.score ?? 0}</b>
      </div>

      <ol style={{ paddingLeft: 18, display: "grid", gap: 14 }}>
        {(data.quiz?.questions || []).map((q, idx) => {
          const row = ansMap.get(q.id);
          const options = q.options || [];

          return (
            <li
              key={q.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                {idx + 1}. {q.question_text || q.text}
              </div>

              {options.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {options.map((op) => {
                    const isChosen = String(row?.option_id ?? "") === String(op.id);
                    const correct =
                      op.is_correct === true || op.correct === true;
                    const label = op.option_text ?? op.text;

                    return (
                      <li key={op.id} style={{ lineHeight: 1.7 }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: correct ? "#16a34a" : "#e5e7eb",
                            marginRight: 8,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: isChosen ? 700 : 400,
                            textDecoration:
                              isChosen && !correct ? "line-through" : "none",
                            color: isChosen && !correct ? "#b91c1c" : "inherit",
                          }}
                        >
                          {label}
                          {isChosen ? "  (your choice)" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={{ marginTop: 6 }}>
                  <span
                    style={{
                      color: "#64748b",
                      fontStyle: "italic",
                      background: "#f8fafc",
                      border: "1px dashed #e5e7eb",
                      padding: "4px 8px",
                      borderRadius: 8,
                      display: "inline-block",
                    }}
                  >
                    {row?.text_answer ? `Your answer: ${row.text_answer}` : "No answer"}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

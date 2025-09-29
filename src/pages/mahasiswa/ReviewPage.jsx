import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_URL ?? "https://laravel-interactive-english-course-production.up.railway.app";

export default function ReviewPage() {
  const { classId, week } = useParams();
  const [sp] = useSearchParams();
  const aid = sp.get("aid");
  const token = localStorage.getItem("token") || "";

  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!aid) {
      setErr("Missing attempt id");
      return;
    }

    const load = async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/attempts/${aid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!r.ok) {
          setErr(`Failed to fetch review (HTTP ${r.status})`);
          return;
        }
        const json = await r.json();
        setData(json);
      } catch {
        setErr("Network error");
      }
    };

    load();
  }, [aid, token]);

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
        <Link to={`/student/classes/${classId}/weeks/${week}`}>
          ← Back to Week
        </Link>
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
                {idx + 1}. {q.question_text}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(q.options || []).map((op) => {
                  const isChosen = row?.option_id === op.id;
                  const correct = !!op.is_correct;
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
                        {op.option_text}
                        {isChosen ? "  (your choice)" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

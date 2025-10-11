import React, { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  Accept: "application/json",
});

function Bar({ value = 0 }) {
  return (
    <div
      style={{
        background: "#eef2ff",
        height: 10,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          background: "linear-gradient(90deg,#7c3aed,#a78bfa)",
        }}
      />
    </div>
  );
}

export default function AdminProgress() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const tries = [
          `${BASE_URL}/api/progress`,
          `${BASE_URL}/api/users/progress`,
        ];
        let ok = null;
        for (const url of tries) {
          try {
            const r = await fetch(url, { headers: headers() });
            if (r.ok) {
              ok = await r.json();
              break;
            }
          } catch {
            /* ignore */
          }
        }
        // fallback contoh
        if (!ok) {
          ok = [
            {
              id: 1,
              name: "Alice",
              email: "alice@example.com",
              progress: 76,
              level: "B1",
            },
            {
              id: 2,
              name: "Bob",
              email: "bob@example.com",
              progress: 42,
              level: "A2",
            },
            {
              id: 3,
              name: "Cindy",
              email: "cindy@example.com",
              progress: 90,
              level: "B2",
            },
          ];
        }
        const arr = Array.isArray(ok) ? ok : ok.data || ok.rows || [];
        setRows(arr);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <style>{`
.table{ width:100%; border-collapse:collapse; font-size:14px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
.table th,.table td{ padding:10px 12px; border-bottom:1px solid #eef2f7; text-align:left; }
.badge{ display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:999px; font-weight:700; font-size:12px; background:#f5f3ff; color:#7c3aed; border:1px solid #e9d5ff; }
      `}</style>

      <h1 className="page-title">User Progress</h1>

      {loading ? (
        <div className="card">Loading progress…</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>#</th>
              <th>Name</th>
              <th>Email</th>
              <th style={{ width: 120 }}>Level</th>
              <th style={{ width: 240 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 700 }}>{r.name}</td>
                <td>{r.email}</td>
                <td>
                  <span className="badge">{(r.level || "").toUpperCase()}</span>
                </td>
                <td>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Bar value={r.progress || 0} />
                    <b style={{ width: 38, textAlign: "right" }}>
                      {Math.round(r.progress || 0)}%
                    </b>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

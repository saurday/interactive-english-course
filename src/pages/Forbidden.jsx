// src/pages/Forbidden.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <div
      style={{
        fontFamily: "'Poppins', 'Inter', sans-serif",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        padding: "0 20px",
        textAlign: "center",
        color: "#333",
      }}
    >
      <h1
        style={{
          fontSize: "6rem",
          margin: 0,
          fontWeight: 700,
          color: "#ef4444",
          letterSpacing: "0.1em",
        }}
      >
        403
      </h1>
      <h2
        style={{
          fontSize: "1.5rem",
          margin: "16px 0 8px",
          fontWeight: 600,
        }}
      >
        Forbidden
      </h2>
      <p
        style={{
          fontSize: "1.125rem",
          marginBottom: "24px",
          maxWidth: 400,
          lineHeight: 1.5,
          color: "#555",
        }}
      >
        You do not have permission to access this page.
      </p>
      <Link
        to="/"
        style={{
          textDecoration: "none",
          backgroundColor: "#dc2626",
          color: "white",
          padding: "12px 24px",
          borderRadius: 6,
          fontWeight: 600,
          boxShadow: "0 4px 6px rgba(220, 38, 38, 0.3)",
          transition: "background-color 0.3s ease",
          display: "inline-block",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#b91c1c")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#dc2626")}
      >
        Back to Home
      </Link>
    </div>
  );
}
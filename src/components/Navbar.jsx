// src/components/Navbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [hovered, setHovered] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef(null);

  const hoverOn = (k) => () => setHovered(k);
  const hoverOff = () => setHovered(null);

  // internal routes pakai Link
  const leftMenus = [
    { key: "home", label: "Home", to: "/" },
    { key: "about", label: "About", to: "/about" },
    { key: "features", label: "Features", to: "/features" },
  ];
  const rightMenus = [
    { key: "login", label: "Login", to: "/login" },
    { key: "register", label: "Register", to: "/register" },
  ];

  // tutup dengan ESC / klik di luar panel
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && setMobileOpen(false);
    const onDoc = (e) => {
      if (mobileOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onEsc);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [mobileOpen]);

  // kunci scroll body saat open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
  }, [mobileOpen]);

  return (
    <>
      <style>{`
        .nav-root { display:flex; align-items:center; gap:16px; padding:10px 20px; box-shadow:0 2px 5px rgba(0,0,0,.1); background:#fff; position:relative; z-index:1010; }
        .brand { font-weight:800; font-size:18px; white-space:nowrap; }
        .nav-left, .nav-right { display:flex; align-items:center; gap:12px; margin:0; padding:0; list-style:none; }
        .spacer { flex:1; }
        .mobile-toggle { display:none; margin-left:8px; border:0; background:transparent; padding:8px; border-radius:10px; cursor:pointer; }
        .mobile-toggle:hover{ background:#f3f4f6; }

        /* Backdrop & panel muncul hanya saat open (dirender kondisional) */
        .backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:2000; }
        .panel{ position:fixed; left:0; right:0; top:0; z-index:2001; }
        .panel-card{ margin:10px; border-radius:14px; background:#fff; border:1px solid #e5e7eb; box-shadow:0 20px 60px rgba(0,0,0,.20); overflow:hidden; }
        .panel-head{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #eef2f7; font-weight:800; }
        .panel-list{ display:grid; gap:10px; padding:12px; }
        .mobile-item{ display:block; padding:12px; border-radius:10px; color:#111827; text-decoration:none; border:1px solid #eef2f7; }
        .mobile-row{ display:flex; gap:10px; }

        @media (max-width: 760px){
          .nav-left, .nav-right { display:none; }
          .mobile-toggle { display:inline-flex; }
        }
      `}</style>

      <nav className="nav-root">
        <div className="brand">Interactive English Course</div>

        {/* kiri (desktop) */}
        <ul className="nav-left">
          {leftMenus.map((it) => (
            <li key={it.key}>
              <Link
                to={it.to}
                onMouseEnter={hoverOn(it.key)}
                onMouseLeave={hoverOff}
                style={{ ...styles.navLinkBase, ...(hovered === it.key ? styles.navLinkHover : {}) }}
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="spacer" />

        {/* kanan (desktop) */}
        <ul className="nav-right">
          {rightMenus.map((it) => {
            const isLogin = it.key === "login";
            const base = {
              ...styles.navBtnBase,
              ...(isLogin ? styles.btnLight : styles.btnSolid),
              ...(hovered === it.key ? (isLogin ? styles.btnLightHover : styles.btnSolidHover) : {}),
            };
            return (
              <li key={it.key}>
                <Link
                  to={it.to}
                  onMouseEnter={hoverOn(it.key)}
                  onMouseLeave={hoverOff}
                  style={base}
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* hamburger */}
        <button
          className="mobile-toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((s) => !s)}
        >
          {mobileOpen ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </nav>

      {/* panel mobile */}
      {mobileOpen && (
        <>
          <div className="backdrop" onClick={() => setMobileOpen(false)} />
          <div className="panel" role="dialog" aria-modal="true">
            <div className="panel-card" ref={panelRef}>
              <div className="panel-head">
                Menu
                <button className="mobile-toggle" onClick={() => setMobileOpen(false)} aria-label="Close">
                  <X size={18}/>
                </button>
              </div>
              <div className="panel-list">
                {leftMenus.map((it) => (
                  <Link key={it.key} to={it.to} className="mobile-item" onClick={() => setMobileOpen(false)}>
                    {it.label}
                  </Link>
                ))}
                <div className="mobile-row">
                  <Link to="/login" className="mobile-item" style={{ flex:1 }} onClick={() => setMobileOpen(false)}>
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="mobile-item"
                    style={{ flex:1, background:"#8b5cf6", color:"#fff", borderColor:"#8b5cf6" }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

const styles = {
  navLinkBase: {
    cursor: "pointer",
    fontSize: 14,
    color: "#333",
    textDecoration: "none",
    padding: "8px 12px",
    borderRadius: 8,
    transition: "background-color .2s ease, color .2s ease, box-shadow .2s ease",
  },
  navLinkHover: { backgroundColor: "#6554f9", color: "#fff", boxShadow: "0 6px 18px rgba(139,92,246,.35)" },

  navBtnBase: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 96,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 999,
    textDecoration: "none",
    transition: "background-color .2s ease, box-shadow .2s ease, filter .2s ease",
    border: "1px solid transparent",
    userSelect: "none",
  },
  btnLight: { background: "#fff", color: "#334155", borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,.06)" },
  btnLightHover: { background: "#f8fafc", color: "#334155", borderColor: "#e2e8f0", boxShadow: "0 4px 14px rgba(15,23,42,.10)" },
  btnSolid: { background: "linear-gradient(135deg,#7c3aed,#6b46c1)", color: "#fff", borderColor: "#6b46c1", boxShadow: "0 6px 18px rgba(139,92,246,.25)" },
  btnSolidHover: { background: "linear-gradient(135deg,#6d28d9,#553c9a)", color: "#fff", filter: "saturate(1.02)" },
};

export default Navbar;

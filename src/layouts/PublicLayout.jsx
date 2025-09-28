// src/layouts/PublicLayout.jsx
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function PublicLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: "1 0 auto", width: "100%" }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

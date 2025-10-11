import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Home, Users, UserPlus, BarChart2, Settings, LogOut, BookOpen, Menu, Shield
} from "lucide-react";

const MENU = [
  { label: "Dashboard", icon: <Home size={18} />, to: "/admin" , end: true},
  { label: "Users", icon: <Users size={18} />, to: "/admin/users" },
  { label: "User Progress", icon: <BarChart2 size={18} />, to: "/admin/progress" },
  { label: "CEFR Modules", icon: <BookOpen size={18} />, to: "/lecture/cefr" },
  { label: "Settings", icon: <Settings size={18} />, to: "/lecture/settings" },
  { label: "Logout", icon: <LogOut size={18} />, action: "logout" },
];

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // hide body scroll saat sidebar mobile dibuka
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const handleLogout = (e) => {
    e?.preventDefault?.();
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[rgb(248,247,255)]/1 relative">
      {/* Top header */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur border-slate-200">
        <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
          <button
            className="inline-flex items-center justify-center p-2 border md:hidden rounded-xl border-slate-200"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 font-extrabold text-slate-800">
            <Shield size={18} className="text-violet-500" />
            <span>Admin Console</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="hidden text-sm md:inline text-slate-500">
              {JSON.parse(localStorage.getItem("userInfo") || "{}")?.email || "admin"}
            </span>
            <div className="rounded-full size-8 bg-gradient-to-br from-violet-500 to-fuchsia-500" />
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-[1400px] px-3 sm:px-4 md:px-6 lg:px-8 flex">
        {/* Sidebar */}
        <aside
          className={`fixed md:sticky md:top-0 md:translate-x-0 z-40 inset-y-0 left-0 w-[240px] bg-white border-r border-slate-200 p-4 md:h-[calc(100vh-0px)] md:mt-4 md:rounded-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="mb-3 font-semibold text-slate-800">Admin</div>
          <nav className="space-y-1">
            {MENU.map((m) =>
              m.action === "logout" ? (
                <button
                  key={m.label}
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-[#f3f0ff] hover:text-violet-600"
                >
                  {m.icon} {m.label}
                </button>
              ) : (
                <NavLink
                  key={m.label}
                  to={m.to}
                  end={m.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? "bg-[#f3f0ff] text-violet-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`
                  }
                >
                  {m.icon} {m.label}
                </NavLink>
              )
            )}
          </nav>
        </aside>

        {/* Backdrop mobile */}
        {open && (
          <div
            className="fixed inset-0 z-30 md:hidden bg-black/35"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 py-5 md:ml-6 md:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

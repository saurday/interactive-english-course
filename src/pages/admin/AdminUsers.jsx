import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Mail,
  User,
  Shield,
} from "lucide-react";

/* ---- Config ---- */
import api from "@/config/api";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "lecture", label: "Lecture" },
  { value: "admin", label: "Admin" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {mode:'create'|'edit', data?:user}
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(kw) ||
        u.email?.toLowerCase().includes(kw) ||
        u.role?.toLowerCase().includes(kw)
    );
  }, [users, q]);

  async function load() {
    try {
      setLoading(true);
      const { data: j } = await api.get(`/api/users`);
      setUsers(Array.isArray(j) ? j : j?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  const onCreate = () =>
    setModal({
      mode: "create",
      data: { name: "", email: "", password: "", role: "student" },
    });
  const onEdit = (u) =>
    setModal({ mode: "edit", data: { ...u, password: "" } });
  const onClose = () => setModal(null);

  async function onDelete(id) {
    if (!window.confirm("Delete this user?")) return;
    const r = await api.delete(`/api/users/${id}`);
    if (r.status === 200 || r.status === 204) {
      setUsers((s) => s.filter((x) => x.id !== id));
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!modal) return;
    try {
      setSaving(true);
      const isEdit = modal.mode === "edit";

      const payload = {
        name: modal.data.name,
        email: modal.data.email,
        role: modal.data.role,
      };
      if (!isEdit || modal.data.password)
        payload.password = modal.data.password;

      let j;
      if (isEdit) {
        const { data } = await api.put(`/api/users/${modal.data.id}`, payload);
        j = data;
      } else {
        const { data } = await api.post(`/api/users`, payload);
        j = data;
      }

      if (isEdit) {
        setUsers((s) => s.map((x) => (x.id === modal.data.id ? j : x)));
      } else {
        setUsers((s) => [j, ...s]);
      }
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-slate-800">Users</h1>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-white shadow-lg rounded-xl bg-violet-600 shadow-violet-500/20 hover:brightness-95"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white border rounded-2xl border-slate-200">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={16}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, or role…"
              className="w-full py-2 pr-3 text-sm border outline-none rounded-xl border-slate-200 pl-9 focus:ring-4 focus:ring-violet-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th className="pr-4 text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-5 text-center text-slate-500" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-5 text-center text-slate-500" colSpan={4}>
                    No data
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-t last:border-b">
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="rounded-full size-8 bg-gradient-to-br from-violet-500 to-fuchsia-500" />
                        <div className="font-semibold text-slate-800">
                          {u.name}
                        </div>
                      </div>
                    </Td>
                    <Td className="text-slate-600">{u.email}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f0ff] text-violet-700 px-2.5 py-1 text-[12px] font-semibold">
                        <Shield size={12} /> {u.role}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2 pr-2">
                        <button
                          onClick={() => onEdit(u)}
                          className="p-2 border rounded-lg border-slate-200 hover:bg-slate-50"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(u.id)}
                          className="p-2 border rounded-lg border-slate-200 hover:bg-slate-50 text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40"
          onClick={onClose}
        >
          <div
            className="w-full max-w-lg p-5 bg-white border rounded-2xl border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-800">
                {modal.mode === "create" ? "Add User" : "Edit User"}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <Field
                label="Full Name"
                icon={<User size={14} className="text-violet-600" />}
              >
                <input
                  required
                  value={modal.data.name}
                  onChange={(e) =>
                    setModal((m) => ({
                      ...m,
                      data: { ...m.data, name: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border outline-none rounded-xl border-slate-200 focus:ring-4 focus:ring-violet-200"
                  placeholder="John Doe"
                />
              </Field>

              <Field
                label="Email"
                icon={<Mail size={14} className="text-violet-600" />}
              >
                <input
                  required
                  type="email"
                  value={modal.data.email}
                  onChange={(e) =>
                    setModal((m) => ({
                      ...m,
                      data: { ...m.data, email: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border outline-none rounded-xl border-slate-200 focus:ring-4 focus:ring-violet-200"
                  placeholder="john@example.com"
                />
              </Field>

              <Field label="Password (optional for edit)">
                <input
                  type="password"
                  value={modal.data.password || ""}
                  onChange={(e) =>
                    setModal((m) => ({
                      ...m,
                      data: { ...m.data, password: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border outline-none rounded-xl border-slate-200 focus:ring-4 focus:ring-violet-200"
                  placeholder={
                    modal.mode === "create"
                      ? "Create a password"
                      : "Leave empty to keep current"
                  }
                />
              </Field>

              <Field label="Role">
                <select
                  value={modal.data.role}
                  onChange={(e) =>
                    setModal((m) => ({
                      ...m,
                      data: { ...m.data, role: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white border outline-none rounded-xl border-slate-200 focus:ring-4 focus:ring-violet-200"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded-xl border-slate-200"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white shadow-lg rounded-xl bg-violet-600 shadow-violet-500/20 hover:brightness-95"
                >
                  <Save size={16} /> {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`text-left font-semibold text-xs uppercase tracking-wide px-4 py-3 ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;
}
function Field({ label, icon, children }) {
  return (
    <label className="block text-sm">
      <div className="mb-1.5 flex items-center gap-2 text-slate-700 font-semibold">
        {icon}
        {label}
      </div>
      {children}
    </label>
  );
}

import { Navigate, Outlet } from "react-router-dom";
import { getRole, isAuthed } from "../utils/auth";

export default function ProtectedRoute({ allow = [] }) {
  const authed = isAuthed();
  const role = getRole();

  if (!authed) return <Navigate to="/login" replace />;
  if (allow.length && !allow.includes(role)) return <Navigate to="/403" replace />;

  return <Outlet />;
}

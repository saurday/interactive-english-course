// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

/** Public pages */
import LandingPage from "./pages/LandingPage";
import Login from "./pages/login";
import Register from "./pages/register";
import About from "./pages/About";
import Features from "./pages/Features";
import Fitur from "./pages/Fitur";

/** Error / misc */
import Forbidden from "./pages/Forbidden";

/** Dosen */
import ClassDetail from "./pages/dosen/ClassDetail";
import LecturerWeekDetail from "./pages/dosen/WeekDetail";
import QuizBuilder from "./pages/dosen/QuizBuilder";
import AssignmentBuilder from "./pages/dosen/AssignmentBuilder";
import DosenDashboard from "./pages/dosen/dashboard";
import Reports from "./pages/dosen/Reports.jsx"; // <-- PASTI ada
import LecturerSettings from "./pages/dosen/Settings.jsx";

/** Mahasiswa */
import StudentWeekDetail from "./pages/mahasiswa/WeekDetail.jsx";
import AttemptPage from "./pages/mahasiswa/AttemptPage";
import ReviewPage from "./pages/mahasiswa/ReviewPage";
import MahasiswaDashboard from "./pages/mahasiswa/dashboard";
import StudentSettings from "./pages/mahasiswa/Settings.jsx";
/** Admin */
import AdminDashboard from "./pages/admin/dashboard";

/** Layout & guards */
import PublicLayout from "./layouts/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* ===== PUBLIC (Navbar + Footer via PublicLayout) ===== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/fitur" element={<Fitur />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* ===== 403 (tanpa layout) ===== */}
        <Route path="/403" element={<Forbidden />} />

        {/* ===== MAHASISWA ===== */}
        <Route element={<ProtectedRoute allow={["mahasiswa"]} />}>
          <Route path="/student" element={<MahasiswaDashboard />} />
          <Route
            path="/student/classes/:id/weeks/:weekNumber"
            element={<StudentWeekDetail />}
          />
          <Route
            path="/student/classes/:classId/weeks/:week/quiz/:quizId/attempt"
            element={<AttemptPage />}
          />
          <Route
            path="/student/classes/:classId/weeks/:week/quiz/:quizId/review"
            element={<ReviewPage />}
          />
          <Route path="/student/settings" element={<StudentSettings />} />
        </Route>

        {/* ===== DOSEN ===== */}
        <Route element={<ProtectedRoute allow={["dosen"]} />}>
          <Route path="/lecture" element={<DosenDashboard />} />
          <Route path="/lecture/classes/:id" element={<ClassDetail />} />

          {/* Assignment (NEW & EDIT) */}
          <Route
            path="/lecture/classes/:id/weeks/:week/assignment/new"
            element={<AssignmentBuilder />}
          />
          <Route
            path="/lecture/classes/:id/weeks/:week/assignment/:assignmentId/edit"
            element={<AssignmentBuilder />}
          />

          {/* Quiz */}
          <Route
            path="/lecture/classes/:id/weeks/:week/quiz/new"
            element={<QuizBuilder />}
          />
          <Route
            path="/lecture/classes/:id/weeks/:week/quiz/:quizId/edit"
            element={<QuizBuilder />}
          />

          {/* Week detail */}
          <Route
            path="/lecture/classes/:id/weeks/:week"
            element={<LecturerWeekDetail />}
          />

          <Route path="/lecture/reports" element={<Reports />} />
          <Route path="/lecture/settings" element={<LecturerSettings />} />
        </Route>

        {/* ===== ADMIN ===== */}
        <Route element={<ProtectedRoute allow={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* ===== WILDCARD (fallback) ===== */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

// App (WO-3) — provider nesting exactly per spec §3.7:
// <ToastProvider><AuthProvider><TermProvider><BrowserRouter> …
// Route table: /login; / (role-switched); /courses/:courseId (professor
// only); /sections/:sectionId (both roles — WO-5's admin readOnly depends
// on it); * → NotFound. Everything renders inside the AppShell.
// Clean URLs on Cloudflare Pages (WO-C): deep links are served by the
// public/_redirects SPA fallback.
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Spinner, ToastProvider } from "./components/ui";
import { AppShell } from "./components/layout/AppShell";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TermProvider } from "./context/TermContext";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
// Wave C pages (WO-4/WO-5/WO-6 own these modules — default exports at the
// agreed paths; the files land after this WO, so tsc reports them missing).
import ProfessorHome from "./pages/professor/ProfessorHome";
import CoursePage from "./pages/professor/CoursePage";
import SectionPage from "./pages/professor/SectionPage";
import AdminHome from "./pages/admin/AdminHome";
import FacultyPage from "./pages/admin/FacultyPage";

/** Full-content spinner used while the session is restored — no login flash. */
function FullPageSpinner(): JSX.Element {
  return (
    <div className="sh-fullpage">
      <Spinner label="Loading the portal…" />
    </div>
  );
}

function RequireAuth(): JSX.Element {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <FullPageSpinner />;
  if (!auth.profile) {
    // Preserve the destination for LoginPage's ?next= honouring.
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

/** Admins are bounced home from professor-only routes. */
function RequireProfessor(): JSX.Element {
  const auth = useAuth();
  if (auth.profile?.role !== "professor") return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Admins only — the faculty account desk. */
function RequireAdmin(): JSX.Element {
  const auth = useAuth();
  if (auth.profile?.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

/** `/` switches on the signed-in role (spec WO-3 step 4). */
function RoleHome(): JSX.Element {
  const auth = useAuth();
  if (!auth.profile) return <FullPageSpinner />;
  return auth.profile.role === "admin" ? <AdminHome /> : <ProfessorHome />;
}

function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<RoleHome />} />
          <Route element={<RequireProfessor />}>
            <Route path="/courses/:courseId" element={<CoursePage />} />
          </Route>
          {/* Both roles — WO-5 derives readOnly from the profile role. */}
          <Route path="/sections/:sectionId" element={<SectionPage />} />
          {/* The department head manages faculty accounts here. */}
          <Route element={<RequireAdmin />}>
            <Route path="/faculty" element={<FacultyPage />} />
          </Route>
          {/* The head may also teach — their own courses live here. */}
          <Route path="/teaching" element={<ProfessorHome />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App(): JSX.Element {
  return (
    <ToastProvider>
      <AuthProvider>
        <TermProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TermProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

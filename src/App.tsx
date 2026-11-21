import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AppProvider, useApp } from './store/AppContext';
import type { UserRole } from './types/domain';
import { ToastContainer } from './components/ui/ToastContainer';
import { PublicNavbar } from './components/layout/PublicNavbar';
import { PublicFooter } from './components/layout/PublicFooter';
import { DashboardShell } from './components/layout/DashboardShell';

// Public pages
import { HomePage } from './pages/public/HomePage';
import { AboutPage } from './pages/public/AboutPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Shared & Super Admin dashboard pages
import { NoticeBoardView } from './pages/dashboard/shared/NoticeBoardView';
import { AuditLogView } from './pages/dashboard/shared/AuditLogView';
import { SuperAdminOverview } from './pages/dashboard/super-admin/SuperAdminOverview';

// Principal / Institution Admin dashboard pages
import { PrincipalOverview } from './pages/dashboard/principal/PrincipalOverview';
import { ClassesSubjectsPage } from './pages/dashboard/principal/ClassesSubjectsPage';
import { TeachersPage } from './pages/dashboard/principal/TeachersPage';
import { StudentsPage } from './pages/dashboard/principal/StudentsPage';
import { ExamsPage } from './pages/dashboard/principal/ExamsPage';
import { MarksEntryPage } from './pages/dashboard/principal/MarksEntryPage';
import { ResultApprovalPage } from './pages/dashboard/principal/ResultApprovalPage';
import { TabulationPage } from './pages/dashboard/principal/TabulationPage';
import { SettingsPage } from './pages/dashboard/principal/SettingsPage';

// Teacher dashboard pages
import { TeacherClassesPage } from './pages/dashboard/teacher/TeacherClassesPage';
import { TeacherAssignmentsPage } from './pages/dashboard/teacher/TeacherAssignmentsPage';

// Student & Parent dashboard pages
import { StudentResultsPage } from './pages/dashboard/student/StudentResultsPage';
import { StudentAssignmentsPage } from './pages/dashboard/student/StudentAssignmentsPage';

function defaultDashboardPath(role: UserRole): string {
  if (role === 'teacher') return '/dashboard/teacher/classes';
  if (role === 'student' || role === 'parent') return `/dashboard/${role}/results`;
  return `/dashboard/${role}/overview`;
}

const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
};

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6FC] dark:bg-[#0B1020] text-[#111936] dark:text-[#E8ECFB]">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

const DashboardRoleGuard: React.FC<{ allowedRoles: UserRole[] }> = ({ allowedRoles }) => {
  const { user, actingInstitutionId } = useApp();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRole: UserRole =
    user.role === 'super_admin' && actingInstitutionId ? 'institution_admin' : user.role;

  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to={defaultDashboardPath(effectiveRole)} replace />;
  }

  return <DashboardShell />;
};

const DashboardEntryRedirect: React.FC = () => {
  const { user, actingInstitutionId } = useApp();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const effectiveRole: UserRole =
    user.role === 'super_admin' && actingInstitutionId ? 'institution_admin' : user.role;
  return <Navigate to={defaultDashboardPath(effectiveRole)} replace />;
};

const SuperAdminOverviewRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <SuperAdminOverview
      onEnterInstitution={() => navigate('/dashboard/institution_admin/overview')}
    />
  );
};

const PrincipalOverviewRoute: React.FC = () => {
  const navigate = useNavigate();
  return <PrincipalOverview onSelectPage={(page) => navigate(`/dashboard/institution_admin/${page}`)} />;
};

const PrincipalApprovalRoute: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ResultApprovalPage
      onOpenTabulation={() => navigate('/dashboard/institution_admin/tabulation')}
    />
  );
};

const TeacherClassesRoute: React.FC = () => {
  const navigate = useNavigate();
  return <TeacherClassesPage onNavigateToMarks={() => navigate('/dashboard/teacher/marks')} />;
};

const AppRoutes: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Layout & Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Dashboard Root Redirect */}
        <Route path="/dashboard" element={<DashboardEntryRedirect />} />

        {/* Super Admin Nested Routes */}
        <Route
          path="/dashboard/super_admin"
          element={<DashboardRoleGuard allowedRoles={['super_admin']} />}
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<SuperAdminOverviewRoute />} />
          <Route path="notices" element={<NoticeBoardView canCompose canDelete />} />
          <Route path="audit" element={<AuditLogView />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>

        {/* Principal / Institution Admin Nested Routes */}
        <Route
          path="/dashboard/institution_admin"
          element={<DashboardRoleGuard allowedRoles={['institution_admin']} />}
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<PrincipalOverviewRoute />} />
          <Route path="classes" element={<ClassesSubjectsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="marks" element={<MarksEntryPage />} />
          <Route path="approval" element={<PrincipalApprovalRoute />} />
          <Route path="tabulation" element={<TabulationPage />} />
          <Route path="notices" element={<NoticeBoardView canCompose canDelete />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit" element={<AuditLogView />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Route>

        {/* Teacher Nested Routes */}
        <Route
          path="/dashboard/teacher"
          element={<DashboardRoleGuard allowedRoles={['teacher']} />}
        >
          <Route index element={<Navigate to="classes" replace />} />
          <Route path="classes" element={<TeacherClassesRoute />} />
          <Route path="assignments" element={<TeacherAssignmentsPage />} />
          <Route path="marks" element={<MarksEntryPage teacherScoped />} />
          <Route
            path="notices"
            element={
              <NoticeBoardView
                canCompose
                allowedAudiences={[{ value: 'students', label: 'শিক্ষার্থী' }]}
              />
            }
          />
          <Route path="*" element={<Navigate to="classes" replace />} />
        </Route>

        {/* Student Nested Routes */}
        <Route
          path="/dashboard/student"
          element={<DashboardRoleGuard allowedRoles={['student']} />}
        >
          <Route index element={<Navigate to="results" replace />} />
          <Route path="results" element={<StudentResultsPage />} />
          <Route path="assignments" element={<StudentAssignmentsPage />} />
          <Route path="notices" element={<NoticeBoardView canCompose={false} />} />
          <Route path="*" element={<Navigate to="results" replace />} />
        </Route>

        {/* Parent Nested Routes */}
        <Route
          path="/dashboard/parent"
          element={<DashboardRoleGuard allowedRoles={['parent']} />}
        >
          <Route index element={<Navigate to="results" replace />} />
          <Route path="results" element={<StudentResultsPage />} />
          <Route path="assignments" element={<StudentAssignmentsPage />} />
          <Route path="notices" element={<NoticeBoardView canCompose={false} />} />
          <Route path="*" element={<Navigate to="results" replace />} />
        </Route>

        {/* Catch-all Dashboard & Public Fallback */}
        <Route path="/dashboard/*" element={<DashboardEntryRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
          <ToastContainer />
        </BrowserRouter>
      </AppProvider>
    </MotionConfig>
  );
}

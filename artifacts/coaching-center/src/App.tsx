import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StudentProtectedRoute } from '@/components/StudentProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import HomePage from '@/pages/public/HomePage';
import CoursesPage from '@/pages/public/CoursesPage';
import AdmissionPage from '@/pages/public/AdmissionPage';
import NoticeBoardPage from '@/pages/public/NoticeBoardPage';
import ContactPage from '@/pages/public/ContactPage';

import AdminLoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import StudentsPage from '@/pages/admin/StudentsPage';
import BatchesPage from '@/pages/admin/BatchesPage';
import TeachersPage from '@/pages/admin/TeachersPage';
import FeesPage from '@/pages/admin/FeesPage';
import ExamsPage from '@/pages/admin/ExamsPage';
import ResultsPage from '@/pages/admin/ResultsPage';
import NoticesPage from '@/pages/admin/NoticesPage';
import AdmissionsPage from '@/pages/admin/AdmissionsPage';
import SMSPage from '@/pages/admin/SMSPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import BackupPage from '@/pages/admin/BackupPage';

import ExamPage from '@/pages/ExamPage';

import PortalLoginPage from '@/pages/portal/PortalLoginPage';
import PortalSignupPage from '@/pages/portal/PortalSignupPage';
import PortalDashboardPage from '@/pages/portal/PortalDashboardPage';
import PortalFeesPage from '@/pages/portal/PortalFeesPage';
import PortalExamsPage from '@/pages/portal/PortalExamsPage';
import PortalResultsPage from '@/pages/portal/PortalResultsPage';
import PortalNoticePage from '@/pages/portal/PortalNoticePage';
import PortalProfilePage from '@/pages/portal/PortalProfilePage';

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/admission" element={<AdmissionPage />} />
      <Route path="/notices" element={<NoticeBoardPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Admin login */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin protected (Supabase Auth) */}
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/students" element={<StudentsPage />} />
        <Route path="/admin/batches" element={<BatchesPage />} />
        <Route path="/admin/teachers" element={<TeachersPage />} />
        <Route path="/admin/fees" element={<FeesPage />} />
        <Route path="/admin/exams" element={<ExamsPage />} />
        <Route path="/admin/results" element={<ResultsPage />} />
        <Route path="/admin/notices" element={<NoticesPage />} />
        <Route path="/admin/admissions" element={<AdmissionsPage />} />
        <Route path="/admin/sms" element={<SMSPage />} />
        <Route path="/admin/reports" element={<ReportsPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/admin/backup" element={<BackupPage />} />
      </Route>

      {/* Portal login + signup (public) */}
      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route path="/portal/signup" element={<PortalSignupPage />} />

      {/* Portal protected (student sessionStorage auth) */}
      <Route element={<StudentProtectedRoute />}>
        <Route path="/portal/dashboard" element={<PortalDashboardPage />} />
        <Route path="/portal/fees" element={<PortalFeesPage />} />
        <Route path="/portal/exams" element={<PortalExamsPage />} />
        <Route path="/portal/results" element={<PortalResultsPage />} />
        <Route path="/portal/notices" element={<PortalNoticePage />} />
        <Route path="/portal/profile" element={<PortalProfilePage />} />
      </Route>

      {/* Public exam page */}
      <Route path="/exam/:examId" element={<ExamPage />} />

      {/* Redirects */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={
        <div className="min-h-screen bg-navy-900 flex items-center justify-center text-center px-4">
          <div>
            <h1 className="font-inter font-black text-6xl text-sky-400 mb-4">404</h1>
            <p className="text-white text-xl font-semibold mb-2">Page not found</p>
            <p className="text-slate-400 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
            <a href="/" className="btn-primary">Go Home</a>
          </div>
        </div>
      } />
    </Routes>
  );
}

function App() {
  const { initialize } = useAuthStore();
  const { loadFromDB } = useSettingsStore();
  useEffect(() => {
    initialize();
    loadFromDB();
  }, []);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  return (
    <ErrorBoundary>
    <BrowserRouter basename={base}>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#0f172a' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
        }}
      />
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { OnboardingPage } from './pages/auth/OnboardingPage';
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { DashboardPage } from './pages/user/Dashboard';
import { WhatsAppPage } from './pages/user/WhatsApp';
import { InstagramPage } from './pages/user/Instagram';
import { CallLogsPage } from './pages/user/CallLogs';
import { ContactsPage } from './pages/user/Contacts';
import { TagsPage } from './pages/user/Tags';
import { AudiencesPage } from './pages/user/Audiences';
import { AutomationsPage } from './pages/user/Automations';
import { AutomationBuilderPage } from './pages/user/AutomationBuilder';
import { SettingsPage } from './pages/user/Settings';
import { IntegrationsPage } from './pages/user/Integrations';
import { AdminDashboardPage } from './pages/admin/AdminDashboard';
import { useAuth } from './hooks/useAuth';
import { Skeleton } from './components/ui/skeleton';

function RootRedirect() {
  const { status, session, profile } = useAuth();
  if (status === 'loading') return <div className="p-6"><Skeleton className="h-6 w-48" /></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requiredRole="user">
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute requiredRole="user">
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/whatsapp" element={<WhatsAppPage />} />
        <Route path="/instagram" element={<InstagramPage />} />
        <Route path="/call-logs" element={<CallLogsPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/audiences" element={<AudiencesPage />} />
        <Route path="/automations" element={<AutomationsPage />} />
        <Route path="/automations/:id" element={<AutomationBuilderPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { OnboardingPage } from './pages/auth/OnboardingPage';
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicLayout } from './components/layout/PublicLayout';
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
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicy';
import { TermsOfServicePage } from './pages/legal/TermsOfService';
import { DataDeletionPage } from './pages/legal/DataDeletion';
import { HomePage } from './pages/marketing/HomePage';
import { FeaturesPage } from './pages/marketing/FeaturesPage';
import { PricingPage } from './pages/marketing/PricingPage';
import { AboutPage } from './pages/marketing/AboutPage';
import { ContactPage } from './pages/marketing/ContactPage';
import { useAuth } from './hooks/useAuth';
import { Skeleton } from './components/ui/skeleton';

function RootRedirect() {
  const { status, session, profile } = useAuth();
  if (status === 'loading') return <div className="p-6"><Skeleton className="h-6 w-48" /></div>;
  if (!session) return <HomePage />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing pages wrapped in PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Auth pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Legal pages */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/data-deletion" element={<DataDeletionPage />} />

      {/* Onboarding */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requiredRole="user">
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Authenticated app */}
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

      {/* Admin */}
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

import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SessionExpiredModal } from './components/auth/SessionExpiredModal';
import { UserLayout } from './components/layout/UserLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { useAuth } from './hooks/useAuth';
import { Skeleton } from './components/ui/skeleton';

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const OnboardingPage = lazy(() => import('./pages/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() =>
  import('./pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
);
const AcceptInvitePage = lazy(() =>
  import('./pages/auth/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })),
);
const AdminLayout = lazy(() => import('./components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const DashboardPage = lazy(() => import('./pages/user/Dashboard').then((m) => ({ default: m.DashboardPage })));
const WhatsAppPage = lazy(() => import('./pages/user/WhatsApp').then((m) => ({ default: m.WhatsAppPage })));
const InstagramPage = lazy(() => import('./pages/user/Instagram').then((m) => ({ default: m.InstagramPage })));
const CallLogsPage = lazy(() => import('./pages/user/CallLogs').then((m) => ({ default: m.CallLogsPage })));
const ContactsPage = lazy(() => import('./pages/user/Contacts').then((m) => ({ default: m.ContactsPage })));
const TagsPage = lazy(() => import('./pages/user/Tags').then((m) => ({ default: m.TagsPage })));
const AudiencesPage = lazy(() => import('./pages/user/Audiences').then((m) => ({ default: m.AudiencesPage })));
const AutomationsPage = lazy(() => import('./pages/user/Automations').then((m) => ({ default: m.AutomationsPage })));
const AutomationBuilderPage = lazy(() =>
  import('./pages/user/AutomationBuilder').then((m) => ({ default: m.AutomationBuilderPage })),
);
const SettingsPage = lazy(() => import('./pages/user/Settings').then((m) => ({ default: m.SettingsPage })));
const IntegrationsPage = lazy(() => import('./pages/user/Integrations').then((m) => ({ default: m.IntegrationsPage })));
const CommentsPage = lazy(() => import('./pages/user/Comments').then((m) => ({ default: m.CommentsPage })));
const BroadcastsPage = lazy(() => import('./pages/user/Broadcasts').then((m) => ({ default: m.BroadcastsPage })));
const BroadcastComposerPage = lazy(() =>
  import('./pages/user/BroadcastComposer').then((m) => ({ default: m.BroadcastComposerPage })),
);
const BroadcastDetailPage = lazy(() =>
  import('./pages/user/BroadcastDetail').then((m) => ({ default: m.BroadcastDetailPage })),
);
const WhatsAppTemplatesPage = lazy(() =>
  import('./pages/user/WhatsAppTemplates').then((m) => ({ default: m.WhatsAppTemplatesPage })),
);
const WhatsAppTemplateComposerPage = lazy(() =>
  import('./pages/user/WhatsAppTemplateComposer').then((m) => ({ default: m.WhatsAppTemplateComposerPage })),
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboardPage })),
);
const PrivacyPolicyPage = lazy(() =>
  import('./pages/legal/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicyPage })),
);
const TermsOfServicePage = lazy(() =>
  import('./pages/legal/TermsOfService').then((m) => ({ default: m.TermsOfServicePage })),
);
const DataDeletionPage = lazy(() =>
  import('./pages/legal/DataDeletion').then((m) => ({ default: m.DataDeletionPage })),
);
const HomePage = lazy(() => import('./pages/marketing/HomePage').then((m) => ({ default: m.HomePage })));
const FeaturesPage = lazy(() => import('./pages/marketing/FeaturesPage').then((m) => ({ default: m.FeaturesPage })));
const PricingPage = lazy(() => import('./pages/marketing/PricingPage').then((m) => ({ default: m.PricingPage })));
const AboutPage = lazy(() => import('./pages/marketing/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/marketing/ContactPage').then((m) => ({ default: m.ContactPage })));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-3 w-full max-w-md px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function RootRedirect() {
  const { status, session, profile } = useAuth();
  if (status === 'loading')
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-48" />
      </div>
    );
  if (!session) return <HomePage />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <>
      <SessionExpiredModal />
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

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
            <Route path="/comments" element={<CommentsPage />} />
            <Route path="/call-logs" element={<CallLogsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/audiences" element={<AudiencesPage />} />
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/automations/:id" element={<AutomationBuilderPage />} />
            <Route path="/broadcasts" element={<BroadcastsPage />} />
            <Route path="/broadcasts/new" element={<BroadcastComposerPage />} />
            <Route path="/broadcasts/templates" element={<WhatsAppTemplatesPage />} />
            <Route path="/broadcasts/templates/new" element={<WhatsAppTemplateComposerPage />} />
            <Route path="/broadcasts/:id" element={<BroadcastDetailPage />} />
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
      </Suspense>
    </>
  );
}

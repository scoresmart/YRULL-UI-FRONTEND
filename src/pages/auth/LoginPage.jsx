import { LoginForm } from '../../components/auth/LoginForm';
import { BrandMark } from '../../components/brand/BrandMark';
import { ConnectFacebookButton } from '../../components/integrations/ConnectFacebookButton';
import { PermissionsInfoTooltip } from '../../components/integrations/PermissionsInfoTooltip';
import { Footer } from '../../components/layout/Footer';
import { isAuthConfigured } from '../../lib/env';

export function LoginPage() {
  const authReady = isAuthConfigured();

  return (
    <div className="min-h-screen bg-white" lang="en-US">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-10">
        <div className="relative hidden overflow-hidden bg-[#0F0F0F] text-white lg:col-span-6 lg:block">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex min-h-[240px] flex-col p-8 lg:min-h-screen lg:p-12">
            <div>
              <BrandMark variant="dark" className="text-2xl" />
              <div className="mt-2 max-w-md text-lg text-white/70">
                Connect all your messaging channels in one powerful platform.
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">⚡ Automations</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">📱 WhatsApp Inbox</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">👥 Team Collaboration</span>
            </div>
          </div>
        </div>

        {/* Scroll the whole column so tall warning + form never clips the bottom (Facebook button, links). */}
        <div className="col-span-1 flex min-h-screen flex-col overflow-y-auto lg:col-span-4">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10">
            {!authReady && (
              <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium text-slate-800">Sign-in is temporarily unavailable.</p>
                <p className="mt-1">
                  Sign-in services are not configured for this environment. Please try again later or contact support.
                </p>
              </div>
            )}
            <div className="mb-6">
              <BrandMark variant="light" className="text-sm font-semibold" />
              <div className="mt-3 text-2xl font-semibold text-gray-900">Welcome back</div>
              <div className="mt-1 text-sm text-gray-500">Sign in to your account</div>
            </div>

            {/* Above the form so it stays visible without scrolling past long warnings */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Sign in with Facebook</p>
                <PermissionsInfoTooltip placement="bottom" />
              </div>
              <ConnectFacebookButton className="w-full" size="lg" appearance="facebook" intent="signInWithFacebook" />
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Or sign in with email
                </span>
              </div>
            </div>

            <LoginForm />

            <div className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <a href="/register" className="font-medium text-green-600 hover:text-green-700">
                Sign up
              </a>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

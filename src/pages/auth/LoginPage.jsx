import { LoginForm } from '../../components/auth/LoginForm';
import { LegalFooterLinks } from '../../components/legal/LegalFooterLinks';
import { ENV } from '../../lib/env';

export function LoginPage() {
  const hasSupabaseConfig = ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-10">
        <div className="relative col-span-6 overflow-hidden bg-[#0F0F0F] text-white">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex h-full flex-col p-12">
            <div>
              <div className="text-2xl font-bold tracking-tight">FlowDesk</div>
              <div className="mt-2 max-w-md text-lg text-white/70">
                Connect all your messaging channels in one powerful platform.
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">⚡ Automations</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">📱 WhatsApp Inbox</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">👥 Team Collaboration</span>
            </div>
          </div>
        </div>

        <div className="col-span-4 flex items-center justify-center p-10">
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-sm fade-in">
            {!hasSupabaseConfig && !ENV.USE_MOCK && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>Sign-in is temporarily unavailable. Please try again later.</p>
                {import.meta.env.DEV ? (
                  <p className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600">
                    Dev only: set <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> and{' '}
                    <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> in{' '}
                    <code className="rounded bg-slate-100 px-1">.env</code>, or use{' '}
                    <code className="rounded bg-slate-100 px-1">VITE_USE_MOCK=true</code>.
                  </p>
                ) : null}
              </div>
            )}
            <div className="mb-6">
              <div className="text-sm font-semibold text-gray-900">FlowDesk</div>
              <div className="mt-3 text-2xl font-semibold text-gray-900">Welcome back</div>
              <div className="mt-1 text-sm text-gray-500">Sign in to your account</div>
            </div>
            <LoginForm />
            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <a href="/register" className="font-medium text-green-600 hover:text-green-700">
                Sign up
              </a>
            </div>
            <LegalFooterLinks />
          </div>
        </div>
      </div>
    </div>
  );
}


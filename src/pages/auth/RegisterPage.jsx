import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, Workflow } from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { ConnectFacebookButton } from '../../components/integrations/ConnectFacebookButton';
import { PermissionsInfoTooltip } from '../../components/integrations/PermissionsInfoTooltip';
import { Footer } from '../../components/layout/Footer';

export function RegisterPage() {
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
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                <Instagram className="h-3.5 w-3.5" /> Instagram
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                <Workflow className="h-3.5 w-3.5" /> Automations
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-1 flex min-h-screen flex-col overflow-y-auto lg:col-span-4">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10">
            <div className="mb-6">
              <BrandMark variant="light" className="text-sm font-semibold" />
              <div className="mt-3 text-2xl font-semibold text-gray-900">Create your account</div>
              <div className="mt-1 text-sm text-gray-500">Get started in minutes</div>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Connect your business accounts
                </p>
                <PermissionsInfoTooltip placement="bottom" />
              </div>
              <ConnectFacebookButton className="w-full" size="lg" appearance="facebook" intent="signInWithFacebook" />
              <p className="text-center text-xs leading-relaxed text-gray-500">
                By signing up, you agree to Yrull&apos;s{' '}
                <Link to="/terms" className="font-medium text-[#1877F2] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-medium text-[#1877F2] hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Or sign up with email
                </span>
              </div>
            </div>

            <RegisterForm />

            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-green-600 hover:text-green-700">
                Sign in
              </Link>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

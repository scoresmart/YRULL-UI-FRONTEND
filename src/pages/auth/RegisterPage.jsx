import { Link } from 'react-router-dom';
import { BrandMark } from '../../components/brand/BrandMark';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { ConnectFacebookButton } from '../../components/integrations/ConnectFacebookButton';
import { PermissionsInfoTooltip } from '../../components/integrations/PermissionsInfoTooltip';
import { Footer } from '../../components/layout/Footer';

const SIGNUP_FEATURES = [
  {
    emoji: '📱',
    title: 'WhatsApp Business',
    description: 'Send and receive WhatsApp messages',
  },
  {
    emoji: '📸',
    title: 'Instagram DMs',
    description: 'Manage Instagram direct messages',
  },
  {
    emoji: '💬',
    title: 'Facebook Messenger',
    description: 'Unified Messenger inbox',
  },
  {
    emoji: '🤖',
    title: 'Automations',
    description: 'Set up auto-replies and workflows',
  },
];

function FeatureHighlights() {
  return (
    <ul className="mt-10 space-y-4" lang="en-US">
      {SIGNUP_FEATURES.map((feature) => (
        <li
          key={feature.title}
          className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            {feature.emoji}
          </span>
          <div>
            <div className="text-sm font-semibold text-white">{feature.title}</div>
            <div className="text-sm text-white/65">{feature.description}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-white" lang="en-US">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-10">
        <div className="relative hidden overflow-hidden bg-[#0F0F0F] text-white lg:col-span-6 lg:block">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex h-full flex-col p-8 lg:p-12">
            <div>
              <BrandMark variant="dark" className="text-2xl" />
              <div className="mt-2 max-w-md text-lg text-white/70">
                Connect all your messaging channels in one powerful platform.
              </div>
              <FeatureHighlights />
            </div>

            <div className="flex-1" />
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
              <p className="text-xs leading-relaxed text-gray-500">
                By continuing, you agree to connect your Facebook Pages, Instagram, and WhatsApp Business accounts to
                Yrull.
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

import { Link } from 'react-router-dom';
import { BrandMark } from '../../components/brand/BrandMark';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { Footer } from '../../components/layout/Footer';
import { Instagram, MessageCircle, Workflow } from 'lucide-react';

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-10">
        <div className="relative col-span-6 overflow-hidden bg-[#0F0F0F] text-white">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex h-full flex-col p-12">
            <div>
              <BrandMark variant="dark" className="text-2xl" />
              <div className="mt-2 max-w-md text-lg text-white/70">
                Connect all your messaging channels in one powerful platform.
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
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

        <div className="col-span-4 flex items-center justify-center p-10">
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-sm fade-in">
            <div className="mb-6">
              <BrandMark variant="light" className="text-sm font-semibold" />
              <div className="mt-3 text-2xl font-semibold text-gray-900">Create your account</div>
              <div className="mt-1 text-sm text-gray-500">Get started in minutes</div>
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

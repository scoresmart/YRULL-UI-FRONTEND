import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrandMark } from '../../components/brand/BrandMark';
import { Button } from '../../components/ui/button';
import { Footer } from '../../components/layout/Footer';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function VerifyEmailPage() {
  useDocumentTitle('Verify Email');
  const [params] = useSearchParams();
  const email = params.get('email') || '';

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    if (!email) { toast.error('No email address found'); return; }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setResent(true);
      toast.success('Verification email resent');
    } catch (err) {
      toast.error(err.message || 'Failed to resend email');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <BrandMark variant="light" className="text-sm font-semibold" />

          <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <Mail className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-gray-900">Check your email</h1>
          <p className="mt-2 text-sm text-gray-500">
            We sent a verification link to{' '}
            {email ? <span className="font-medium text-gray-700">{email}</span> : 'your email'}.
            Click it to activate your account.
          </p>

          <div className="mt-8 space-y-3">
            <Button
              variant="outline"
              className="w-full gap-1.5"
              onClick={handleResend}
              disabled={resending || resent}
            >
              {resending && <Loader2 className="h-4 w-4 animate-spin" />}
              {resent ? (
                <><CheckCircle2 className="h-4 w-4 text-green-600" /> Email resent</>
              ) : (
                'Resend email'
              )}
            </Button>

            <Link to="/register">
              <Button variant="ghost" className="w-full text-gray-500">
                Use a different email
              </Button>
            </Link>
          </div>

          <Link to="/login" className="mt-6 block text-sm font-medium text-gray-500 hover:text-gray-900">
            Back to login
          </Link>
          <Footer />
        </div>
      </div>
    </div>
  );
}

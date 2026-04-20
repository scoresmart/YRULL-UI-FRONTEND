import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrandMark } from '../../components/brand/BrandMark';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Footer } from '../../components/layout/Footer';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function ForgotPasswordPage() {
  useDocumentTitle('Reset Password');

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
          <BrandMark variant="light" className="text-sm font-semibold" />

          {sent ? (
            <div className="mt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="mt-4 text-xl font-semibold text-gray-900">Check your email</h1>
              <p className="mt-2 text-sm text-gray-500">
                We sent a password reset link to <span className="font-medium text-gray-700">{email}</span>. Click the
                link in the email to reset your password.
              </p>
              <p className="mt-4 text-xs text-gray-400">Didn't receive it? Check your spam folder, or try again.</p>
              <div className="mt-6 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                  Try a different email
                </Button>
                <Link to="/login" className="block text-center text-sm font-medium text-green-600 hover:text-green-700">
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
                <p className="mt-1 text-sm text-gray-500">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                  {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>

              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to login
              </Link>
            </>
          )}
          <Footer />
        </div>
      </div>
    </div>
  );
}

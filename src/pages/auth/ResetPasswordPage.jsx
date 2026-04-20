import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrandMark } from '../../components/brand/BrandMark';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Footer } from '../../components/layout/Footer';
import { supabase } from '../../lib/supabase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function ResetPasswordPage() {
  useDocumentTitle('Set New Password');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success('Password updated successfully');
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
          <BrandMark variant="light" className="text-sm font-semibold" />

          {done ? (
            <div className="mt-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="mt-4 text-xl font-semibold text-gray-900">Password updated</h1>
              <p className="mt-2 text-sm text-gray-500">Redirecting you to login...</p>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <h1 className="text-2xl font-semibold text-gray-900">Set new password</h1>
                <p className="mt-1 text-sm text-gray-500">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-400">New Password</label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Confirm Password</label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Repeat your password"
                      className="pl-9"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>
                  {confirm && password !== confirm && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || password.length < 8 || password !== confirm}
                >
                  {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </form>

              <Link
                to="/login"
                className="mt-6 block text-center text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Back to login
              </Link>
            </>
          )}
          <Footer />
        </div>
      </div>
    </div>
  );
}

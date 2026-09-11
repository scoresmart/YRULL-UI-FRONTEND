import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { BrandMark } from '../../components/brand/BrandMark';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Footer } from '../../components/layout/Footer';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ENV } from '../../lib/env';
import { supabase } from '../../lib/supabase';

async function validateInvite(token) {
  if (ENV.USE_MOCK) {
    return { valid: true, workspace_name: 'Demo Workspace', role: 'agent', email: 'invited@example.com' };
  }
  const base = ENV.API_BASE_URL;
  const res = await fetch(`${base}/api/workspace/invites/validate?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error('Invalid or expired invite');
  return res.json();
}

async function acceptInvite(token) {
  if (ENV.USE_MOCK) return { success: true };
  const base = ENV.API_BASE_URL;
  const { data } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (data?.session?.access_token) headers['Authorization'] = `Bearer ${data.session.access_token}`;
  const res = await fetch(`${base}/api/workspace/invites/accept`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to accept invite');
  }
  return res.json();
}

export function AcceptInvitePage() {
  useDocumentTitle('Accept Invite');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { session, status } = useAuth();
  const isLoggedIn = !!session;

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invite token found');
      setLoading(false);
      return;
    }
    validateInvite(token)
      .then(setInvite)
      .catch((err) => setError(err.message || 'Invalid invite'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    try {
      await acceptInvite(token);
      setAccepted(true);
      toast.success('Invite accepted!');
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to accept invite');
    } finally {
      setAccepting(false);
    }
  }

  const tokenParam = `invite_token=${encodeURIComponent(token)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <BrandMark variant="light" className="text-sm font-semibold" />

          {loading && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">Validating invite...</p>
            </div>
          )}

          {error && (
            <div className="mt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">Invalid Invite</h2>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <Link to="/login" className="mt-6 block text-sm font-medium text-green-600 hover:text-green-700">
                Go to login
              </Link>
            </div>
          )}

          {accepted && (
            <div className="mt-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">You're in!</h2>
              <p className="mt-2 text-sm text-gray-500">Redirecting to your dashboard...</p>
            </div>
          )}

          {!loading && !error && !accepted && invite && (
            <div className="mt-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">You've been invited</h2>
              <p className="mt-2 text-sm text-gray-500">
                Join <span className="font-semibold text-gray-700">{invite.workspace_name}</span> as{' '}
                <Badge variant="muted" className="ml-0.5">
                  {invite.role || 'agent'}
                </Badge>
              </p>

              {isLoggedIn ? (
                <div className="mt-6 space-y-3">
                  <Button className="w-full" onClick={handleAccept} disabled={accepting}>
                    {accepting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Accept invite
                  </Button>
                  <button
                    onClick={() => navigate('/dashboard', { replace: true })}
                    className="block w-full text-center text-sm text-gray-500 hover:text-gray-900"
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <Link to={`/register?${tokenParam}`}>
                    <Button className="w-full">Sign up to accept</Button>
                  </Link>
                  <Link
                    to={`/login?${tokenParam}`}
                    className="block text-center text-sm font-medium text-gray-500 hover:text-gray-900"
                  >
                    Already have an account? Log in
                  </Link>
                </div>
              )}
            </div>
          )}
          <Footer />
        </div>
      </div>
    </div>
  );
}

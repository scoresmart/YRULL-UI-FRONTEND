import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { BrandMark } from '../../components/brand/BrandMark';

const ERROR_MESSAGES = {
  user_create_failed: 'We could not create your account. Please try again.',
  workspace_create_failed: 'We could not set up your workspace. Please try again.',
  session_failed: 'Could not sign you in. Please try email login.',
  email_missing: 'Facebook did not share an email. Grant the email permission and try again.',
  token_exchange_failed: 'Facebook rejected the sign-in. Please try again.',
  profile_fetch_failed: 'Could not read your Facebook profile. Please try again.',
  state_invalid: 'This sign-in link expired. Please start again from the login page.',
  server_misconfigured: 'Facebook login is not configured on the server yet.',
  access_denied: 'You cancelled the Facebook sign-in.',
  invalid_response: 'Facebook returned an invalid response. Please try again.',
};

function parseHashParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  return new URLSearchParams(hash);
}

export function AuthFacebookCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Connecting your Facebook account…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const hashParams = parseHashParams();

      const errCode = hashParams.get('error') || hashParams.get('error_description');
      if (hashParams.get('status') === 'error' || errCode) {
        if (!cancelled) {
          setStatus('error');
          setMessage(ERROR_MESSAGES[errCode] || `Sign-in failed (${errCode || 'unknown'}).`);
          setTimeout(() => navigate('/login', { replace: true }), 4000);
        }
        return;
      }

      // Login success — Supabase magic link puts tokens in the URL hash.
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (cancelled) return;
        if (error) {
          setStatus('error');
          setMessage('Could not finalise your session. Please try again.');
          setTimeout(() => navigate('/login', { replace: true }), 4000);
          return;
        }
        window.history.replaceState({}, document.title, '/auth/facebook/callback');
        await useAuthStore.getState().fetchProfile();
        setStatus('success');
        setMessage('Signed in with Facebook. Your Meta channels are being connected…');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
        return;
      }

      // Connect mode — user was already signed in; backend attached FB/IG/WA to workspace.
      if (hashParams.get('status') === 'success' && hashParams.get('mode') === 'connect') {
        if (cancelled) return;
        const pages = hashParams.get('pages') || '0';
        const ig = hashParams.get('instagram_accounts') || '0';
        const wa = hashParams.get('whatsapp_numbers') || '0';
        window.history.replaceState({}, document.title, '/auth/facebook/callback');
        setStatus('success');
        setMessage(
          `Facebook connected — ${pages} page(s), ${ig} Instagram account(s), ${wa} WhatsApp number(s).`,
        );
        setTimeout(() => navigate('/integrations', { replace: true }), 1800);
        return;
      }

      // Supabase detectSessionInUrl may still be processing — give it a moment.
      await new Promise((r) => setTimeout(r, 800));
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data?.session) {
        await useAuthStore.getState().fetchProfile();
        setStatus('success');
        setMessage('Signed in with Facebook. Redirecting…');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
        return;
      }

      if (!cancelled) {
        setStatus('error');
        setMessage('No Facebook sign-in in progress. Redirecting to login…');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0F0F0F] px-6 text-white">
      <BrandMark variant="dark" className="mb-8 text-xl" />
      {status === 'loading' && (
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-[#1877F2] border-t-transparent"
          aria-hidden="true"
        />
      )}
      {status === 'success' && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-2xl text-green-400">
          ✓
        </div>
      )}
      {status === 'error' && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-2xl text-red-400">
          ✕
        </div>
      )}
      <p className="mt-6 max-w-md text-center text-lg leading-relaxed text-white/90">{message}</p>
    </div>
  );
}

import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { facebookIntegrationApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const DEFAULT_NO_WORKSPACE_MSG = 'Sign in first, then connect Instagram from Integrations or the Instagram page.';

/**
 * - `linkWorkspace` (default): unified Facebook OAuth (all 18 Meta scopes) — needs a signed-in workspace.
 * - `signInWithFacebook`: same unified flow in login mode — use on /login or /register.
 */
const LABEL_SIGN_IN = 'Continue with Facebook';
const LABEL_LINK_INSTAGRAM = 'Connect to Facebook ✨';

// Official Facebook 'f' glyph — fixed brand blue so the mark stays recognizable
// on the white outlined button per Meta's brand guidelines.
function FacebookLogo({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fill="#1877F2"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      />
    </svg>
  );
}

export function ConnectFacebookButton({
  className,
  size = 'default',
  appearance = 'instagram',
  intent = 'linkWorkspace',
  whenNoWorkspace = 'disabled',
  noWorkspaceMessage = DEFAULT_NO_WORKSPACE_MSG,
  /** Override button label. Defaults depend on `intent` (sign-in vs Instagram/Railway OAuth). */
  children,
}) {
  const profile = useAuthStore((s) => s.profile);
  const loginWithFacebook = useAuthStore((s) => s.loginWithFacebook);
  const workspaceId = profile?.workspace_id ?? profile?.workspace?.id ?? null;

  const handleActivate = async () => {
    if (intent === 'signInWithFacebook') {
      try {
        await loginWithFacebook();
      } catch (e) {
        const msg =
          e?.message === 'Facebook sign-in is not available in mock mode.'
            ? e.message
            : (e?.message ?? 'Unable to start Facebook sign-in. Check VITE_API_BASE_URL and backend deployment.');
        toast.error(msg);
      }
      return;
    }

    // linkWorkspace — unified Facebook connect (all Meta scopes)
    let effectiveWorkspaceId = workspaceId ?? (await useAuthStore.getState().resolveWorkspaceIdForInstagram());

    if (!effectiveWorkspaceId) {
      if (whenNoWorkspace === 'toast') {
        toast(noWorkspaceMessage, { id: 'yrull-no-workspace', duration: 5000 });
        return;
      }
      toast.error('Workspace not found. Try signing in again.', { id: 'yrull-no-workspace' });
      return;
    }

    try {
      const url = await facebookIntegrationApi.startConnect();
      window.location.assign(url);
    } catch (e) {
      toast.error(
        e?.message ||
          'Failed to start Facebook connection. Check VITE_API_BASE_URL and that the backend is deployed.',
        { duration: 6000 },
      );
    }
  };

  // Allow click when workspace might exist after refresh (toast mode); only hard-disable when policy is disabled.
  const disableButton = intent === 'linkWorkspace' && !workspaceId && whenNoWorkspace === 'disabled';

  let variant = 'default';
  if (appearance === 'instagram') variant = 'instagram';
  else if (appearance === 'facebook') variant = 'facebook';

  const label = children ?? (intent === 'signInWithFacebook' ? LABEL_SIGN_IN : LABEL_LINK_INSTAGRAM);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={disableButton}
      onClick={(e) => {
        e.preventDefault();
        handleActivate();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn('relative z-[100] touch-manipulation active:!scale-100', className)}
    >
      {appearance === 'facebook' ? <FacebookLogo className="h-5 w-5 shrink-0" /> : null}
      <span>{label}</span>
    </Button>
  );
}

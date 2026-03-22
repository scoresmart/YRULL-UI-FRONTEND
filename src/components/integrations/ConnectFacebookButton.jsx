import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { getInstagramOAuthAuthorizeUrl } from '../../lib/oauth';
import { useAuthStore } from '../../store/authStore';

const DEFAULT_NO_WORKSPACE_MSG =
  'Sign in first, then connect Instagram from Integrations or the Instagram page.';

/**
 * - `linkWorkspace` (default): Instagram Business OAuth on the API — needs a logged-in workspace.
 * - `signInWithFacebook`: Supabase Auth Facebook Login — no workspace; use on /login or /register.
 */
export function ConnectFacebookButton({
  className,
  size = 'default',
  appearance = 'instagram',
  intent = 'linkWorkspace',
  whenNoWorkspace = 'disabled',
  noWorkspaceMessage = DEFAULT_NO_WORKSPACE_MSG,
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
            : e?.message ?? 'Unable to start Facebook sign-in. Enable the Facebook provider in Supabase (Auth → Providers).';
        toast.error(msg);
      }
      return;
    }

    if (!workspaceId) {
      if (whenNoWorkspace === 'toast') {
        toast(noWorkspaceMessage);
        return;
      }
      toast.error('Workspace not found. Try signing in again.');
      return;
    }
    const url = getInstagramOAuthAuthorizeUrl(workspaceId);
    if (!url) {
      toast.error(
        'Set VITE_API_BASE_URL in Vercel to your backend URL (the server that runs /oauth/instagram/authorize), then redeploy. Same-domain /oauth does not work on static hosting.',
        { duration: 6000 },
      );
      return;
    }
    window.location.assign(url);
  };

  const disableButton =
    intent === 'linkWorkspace' && !workspaceId && whenNoWorkspace === 'disabled';

  const variant = appearance === 'instagram' ? 'instagram' : 'default';

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
      className={cn(
        'relative z-[100] touch-manipulation active:!scale-100',
        className,
      )}
    >
      Connect to Facebook ✨
    </Button>
  );
}

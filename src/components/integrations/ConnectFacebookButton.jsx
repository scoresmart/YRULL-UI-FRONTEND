import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { getInstagramOAuthAuthorizeUrl } from '../../lib/oauth';
import { useAuthStore } from '../../store/authStore';

const DEFAULT_NO_WORKSPACE_MSG =
  'Sign in first, then connect Instagram from Integrations or the Instagram page.';

/**
 * Starts Meta / Instagram OAuth for the current workspace.
 * @param {'disabled' | 'toast'} whenNoWorkspace — `toast` is for public pages (e.g. login) where there is no workspace yet.
 */
export function ConnectFacebookButton({
  className,
  size = 'default',
  appearance = 'instagram',
  whenNoWorkspace = 'disabled',
  noWorkspaceMessage = DEFAULT_NO_WORKSPACE_MSG,
}) {
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id);

  const handleClick = () => {
    if (!workspaceId) {
      if (whenNoWorkspace === 'toast') {
        toast(noWorkspaceMessage);
        return;
      }
      toast.error('Workspace not found. Try signing in again.');
      return;
    }
    const url = getInstagramOAuthAuthorizeUrl(workspaceId);
    if (url) window.location.href = url;
  };

  const disableButton = !workspaceId && whenNoWorkspace === 'disabled';

  return (
    <Button
      type="button"
      size={size}
      variant={appearance === 'instagram' ? 'instagram' : 'default'}
      onClick={handleClick}
      disabled={disableButton}
      className={className}
    >
      Connect to Facebook ✨
    </Button>
  );
}

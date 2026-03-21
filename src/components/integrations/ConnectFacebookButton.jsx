import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { getInstagramOAuthAuthorizeUrl } from '../../lib/oauth';
import { useAuthStore } from '../../store/authStore';

/**
 * Starts Meta / Instagram OAuth for the current workspace.
 */
export function ConnectFacebookButton({ className, size = 'default', appearance = 'instagram' }) {
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id);

  const handleClick = () => {
    if (!workspaceId) {
      toast.error('Workspace not found. Try signing in again.');
      return;
    }
    const url = getInstagramOAuthAuthorizeUrl(workspaceId);
    if (url) window.location.href = url;
  };

  return (
    <Button
      type="button"
      size={size}
      variant={appearance === 'instagram' ? 'instagram' : 'default'}
      onClick={handleClick}
      disabled={!workspaceId}
      className={className}
    >
      Connect to Facebook ✨
    </Button>
  );
}

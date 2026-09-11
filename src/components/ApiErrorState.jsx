import { ErrorState } from './ErrorState';
import { ConnectFacebookButton } from './integrations/ConnectFacebookButton';
import { isMetaAuthError } from '../lib/api';

/**
 * Error state for a failed API query.
 *
 * Renders the backend's own message rather than a generic placeholder, and
 * when the failure is Meta rejecting our stored access token (OAuthException
 * code 190) it swaps the useless "Try again" for the reconnect flow — a retry
 * can only ever repeat the same 400.
 */
export function ApiErrorState({ title, error, onRetry }) {
  if (isMetaAuthError(error)) {
    return (
      <ErrorState
        title="WhatsApp connection expired"
        description="Meta's access token for this workspace is no longer valid. Reconnect Facebook to restore access."
        action={
          <ConnectFacebookButton intent="linkWorkspace" appearance="facebook" size="sm" whenNoWorkspace="toast" />
        }
      />
    );
  }

  return <ErrorState title={title} description={error?.message || 'Please try again.'} onRetry={onRetry} />;
}

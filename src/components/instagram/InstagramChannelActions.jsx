import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Unplug } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { instagramApi } from '../../lib/api';
import { getInstagramOAuthAuthorizeUrl } from '../../lib/oauth';
import { useAuthStore } from '../../store/authStore';

/**
 * Disconnect / Reconnect (OAuth) for Instagram — Railway `POST /oauth/instagram/disconnect`
 * and OAuth authorize for a fresh Meta permission flow.
 *
 * Only renders when `GET /instagram/status` reports connected (same query key as Instagram page).
 */
export function InstagramChannelActions({ compact = false, showHelpText, className }) {
  const help = showHelpText !== undefined ? showHelpText : !compact;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['instagram_status'],
    queryFn: () => instagramApi.getStatus(),
    staleTime: 60_000,
  });

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Instagram from Yrull? You can connect again anytime to grant new permissions.')) return;
    setBusy(true);
    try {
      await instagramApi.disconnect();
      await queryClient.invalidateQueries({ queryKey: ['instagram_status'] });
      await queryClient.invalidateQueries({ queryKey: ['instagram_contacts'] });
      toast.success('Instagram disconnected');
    } catch (err) {
      toast.error(err?.message || 'Failed to disconnect');
    } finally {
      setBusy(false);
    }
  };

  const handleReconnect = async () => {
    const wsId = useAuthStore.getState().profile?.workspace_id ?? useAuthStore.getState().profile?.workspace?.id;
    if (!wsId) {
      toast.error('Workspace not found. Refresh the page or sign in again.');
      return;
    }
    const url = getInstagramOAuthAuthorizeUrl(wsId);
    if (!url) {
      toast.error('Set VITE_API_BASE_URL to your API (Vercel env), then redeploy.');
      return;
    }
    setBusy(true);
    try {
      await instagramApi.disconnect();
      await queryClient.invalidateQueries({ queryKey: ['instagram_status'] });
      window.location.assign(url);
    } catch (err) {
      toast.error(err?.message || 'Failed to start reconnect');
      setBusy(false);
    }
  };

  if (!status?.connected) return null;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className={cn('gap-1.5', compact && 'h-8 text-xs')}
          onClick={handleReconnect}
          disabled={busy}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
          Reconnect
        </Button>
        <Button
          type="button"
          variant="ghost"
          size={compact ? 'sm' : 'default'}
          className={cn('gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700', compact && 'h-8 text-xs')}
          onClick={handleDisconnect}
          disabled={busy}
        >
          <Unplug className="h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>
      {help ? (
        <p className={cn('text-gray-500', compact ? 'text-[11px] leading-snug' : 'text-xs')}>
          Reconnect opens Meta to approve permissions again. Disconnect revokes the link in Yrull.
        </p>
      ) : null}
    </div>
  );
}

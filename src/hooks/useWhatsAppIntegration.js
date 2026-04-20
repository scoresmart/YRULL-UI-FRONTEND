import { useState, useEffect, useCallback, useRef } from 'react';
import { whatsappIntegrationApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/**
 * Per-workspace WhatsApp integration hook.
 * Exposes connection status, connect/disconnect flows, and OAuth return handling.
 */
export function useWhatsAppIntegration() {
  const profile = useAuthStore((s) => s.profile);
  const workspaceId = profile?.workspace_id;

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const didHandleOAuth = useRef(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await whatsappIntegrationApi.getStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message || 'Failed to load WhatsApp status');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  // Handle OAuth return via URL hash
  useEffect(() => {
    if (didHandleOAuth.current) return;
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.slice(1));
    const oauthStatus = params.get('status');
    if (!oauthStatus) return;

    didHandleOAuth.current = true;

    if (oauthStatus === 'whatsapp_connected') {
      toast.success('WhatsApp Business account connected successfully!', { duration: 5000, id: 'wa-oauth-success' });
      refresh();
    } else if (oauthStatus === 'error') {
      const errorMsg = params.get('error') || 'Connection failed';
      toast.error(`WhatsApp connection failed: ${errorMsg}`, { duration: 7000, id: 'wa-oauth-error' });
      setError(errorMsg);
    }

    // Clean hash so refreshes don't replay
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [refresh]);

  const connect = useCallback(async () => {
    if (!workspaceId) {
      toast.error('No workspace found. Please sign in again.');
      return;
    }
    try {
      const url = await whatsappIntegrationApi.startAuthorize();
      window.location.href = url;
    } catch (err) {
      toast.error(err.message || 'Failed to start WhatsApp connection', { id: 'wa-connect' });
    }
  }, [workspaceId]);

  const disconnect = useCallback(async () => {
    if (!workspaceId) return;

    const previous = status;
    setDisconnecting(true);

    // Optimistic update
    setStatus((prev) => (prev ? { ...prev, connected: false } : prev));

    try {
      await whatsappIntegrationApi.disconnect();
      toast.success('WhatsApp disconnected', { id: 'wa-disconnect' });
      await refresh();
    } catch (err) {
      // Rollback on failure
      setStatus(previous);
      toast.error(err.message || 'Failed to disconnect WhatsApp', { id: 'wa-disconnect' });
    } finally {
      setDisconnecting(false);
    }
  }, [workspaceId, status, refresh]);

  return {
    status,
    loading,
    error,
    connected: Boolean(status?.connected),
    disconnecting,
    workspaceId,
    connect,
    disconnect,
    refresh,
  };
}

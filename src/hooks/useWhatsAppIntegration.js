import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch, whatsappIntegrationApi } from '../lib/api';
import { ENV } from '../lib/env';
import { connectWhatsApp } from '../lib/whatsappConnect';
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
  const [chooseNumberState, setChooseNumberState] = useState(null);
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
      setChooseNumberState(null);
      refresh();
    } else if (oauthStatus === 'choose_number') {
      const numbersParam = params.get('numbers') || '';
      const wsId = params.get('workspace_id') || '';
      try {
        const normalized = numbersParam.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const json = atob(padded);
        const availableNumbers = JSON.parse(json);
        setChooseNumberState({ numbers: availableNumbers, workspaceId: wsId });
      } catch {
        toast.error('Failed to parse available numbers. Please reconnect.');
      }
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
    setLoading(true);
    try {
      const result = await connectWhatsApp(authFetch, ENV.API_BASE_URL);
      toast.success(`WhatsApp connected! ${result.verified_name || result.display_phone || ''}`.trim());
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to connect WhatsApp');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, refresh]);

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

  const selectNumber = useCallback(
    async (phoneNumberId) => {
      setLoading(true);
      try {
        const result = await whatsappIntegrationApi.registerNumber(phoneNumberId);
        setChooseNumberState(null);
        toast.success(`Connected: ${result.display_phone}`);
        await refresh();
      } catch (err) {
        toast.error(err.message || 'Failed to connect number');
      } finally {
        setLoading(false);
      }
    },
    [refresh],
  );

  return {
    status,
    loading,
    error,
    connected: Boolean(status?.connected),
    disconnecting,
    workspaceId,
    chooseNumberState,
    connect,
    selectNumber,
    disconnect,
    refresh,
  };
}

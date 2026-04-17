import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { subscribeToTableMulti } from '../lib/realtime';

export function useRealtime({ enabled, onMessage, onContactUpdate }) {
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id);

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    const cleanupMessages = subscribeToTableMulti({
      table: 'whatsapp_messages',
      workspaceId,
      listeners: [
        { event: 'INSERT', callback: (payload) => onMessage?.(payload) },
      ],
    });

    const cleanupContacts = subscribeToTableMulti({
      table: 'whatsapp_contacts',
      workspaceId,
      listeners: [
        { event: 'INSERT', callback: (payload) => onContactUpdate?.(payload) },
        { event: 'UPDATE', callback: (payload) => onContactUpdate?.(payload) },
      ],
    });

    return () => {
      cleanupMessages();
      cleanupContacts();
    };
  }, [enabled, workspaceId, onMessage, onContactUpdate]);
}

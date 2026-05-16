import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { subscribeToTableMulti } from '../lib/realtime';

export function useRealtime({ enabled, onMessage, onContactUpdate }) {
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id);

  // Callers typically pass inline arrow functions, so onMessage/onContactUpdate
  // get a new identity every render. Stash them in refs so the subscription
  // effect can read the latest handler without re-subscribing each render —
  // otherwise the channel was being torn down and re-created in a tight loop,
  // each cycle invalidating queries and re-rendering the page.
  const onMessageRef = useRef(onMessage);
  const onContactUpdateRef = useRef(onContactUpdate);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    onContactUpdateRef.current = onContactUpdate;
  }, [onContactUpdate]);

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    const cleanupMessages = subscribeToTableMulti({
      table: 'whatsapp_messages',
      workspaceId,
      listeners: [{ event: 'INSERT', callback: (payload) => onMessageRef.current?.(payload) }],
    });

    const cleanupContacts = subscribeToTableMulti({
      table: 'whatsapp_contacts',
      workspaceId,
      listeners: [
        { event: 'INSERT', callback: (payload) => onContactUpdateRef.current?.(payload) },
        { event: 'UPDATE', callback: (payload) => onContactUpdateRef.current?.(payload) },
      ],
    });

    return () => {
      cleanupMessages();
      cleanupContacts();
    };
  }, [enabled, workspaceId]);
}

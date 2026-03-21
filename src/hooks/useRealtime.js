import { useEffect } from 'react';
import { ENV } from '../lib/env';
import { supabase } from '../lib/supabase';

// Realtime hook for whatsapp_messages and whatsapp_contacts
export function useRealtime({ enabled, onMessage, onContactUpdate }) {
  useEffect(() => {
    if (!enabled || ENV.USE_MOCK) return;
    
    // Check if supabase has channel method (might not exist in mock mode)
    if (!supabase || typeof supabase.channel !== 'function') {
      console.warn('Supabase channel method not available, skipping real-time subscription');
      return;
    }
    
    try {
      const channel = supabase
        .channel('whatsapp-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
          (payload) => {
            try {
              onMessage?.(payload);
            } catch (error) {
              console.error('Error in onMessage callback:', error);
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'whatsapp_contacts' },
          (payload) => {
            try {
              onContactUpdate?.(payload);
            } catch (error) {
              console.error('Error in onContactUpdate callback:', error);
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'whatsapp_contacts' },
          (payload) => {
            try {
              onContactUpdate?.(payload);
            } catch (error) {
              console.error('Error in onContactUpdate callback:', error);
            }
          },
        )
        .subscribe();

      return () => {
        try {
          if (supabase && typeof supabase.removeChannel === 'function') {
            supabase.removeChannel(channel);
          }
        } catch (error) {
          console.error('Error removing channel:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
    }
  }, [enabled, onMessage, onContactUpdate]);
}


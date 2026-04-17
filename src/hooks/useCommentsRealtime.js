import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ENV } from '../lib/env';
import { supabase } from '../lib/supabase';

export function useCommentsRealtime({ enabled, workspaceId }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !workspaceId || ENV.USE_MOCK) return;
    if (!supabase || typeof supabase.channel !== 'function') return;

    const channelName = `comments-workspace-${workspaceId}`;

    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'instagram_comments' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['instagram_comments'] });
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'instagram_comments' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['instagram_comments'] });
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'instagram_comments' },
          () => {
            queryClient.invalidateQueries({ queryKey: ['instagram_comments'] });
          },
        )
        .subscribe();

      return () => {
        if (supabase && typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(channel);
        }
      };
    } catch (err) {
      console.error('Error setting up comments realtime subscription:', err);
    }
  }, [enabled, workspaceId, queryClient]);
}

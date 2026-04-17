import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToTable } from '../lib/realtime';

export function useCommentsRealtime({ enabled, workspaceId }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    return subscribeToTable({
      table: 'instagram_comments',
      workspaceId,
      event: '*',
      callback: () => {
        queryClient.invalidateQueries({ queryKey: ['instagram_comments'] });
      },
    });
  }, [enabled, workspaceId, queryClient]);
}

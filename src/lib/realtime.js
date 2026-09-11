import { supabase } from './supabase';
import { ENV } from './env';

/**
 * Subscribe to a Supabase Realtime postgres_changes channel,
 * scoped to a specific workspace to prevent cross-tenant data leakage.
 *
 * Returns a cleanup function that removes the channel.
 */
export function subscribeToTable({ table, workspaceId, event = '*', callback }) {
  if (ENV.USE_MOCK || !workspaceId) return () => {};
  if (!supabase || typeof supabase.channel !== 'function') return () => {};

  const channelName = `${table}-workspace-${workspaceId}`;

  try {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          try {
            callback(payload);
          } catch (err) {
            console.error(`Realtime callback error [${table}]:`, err);
          }
        },
      )
      .subscribe();

    return () => {
      try {
        if (supabase && typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(channel);
        }
      } catch (err) {
        console.error(`Error removing channel [${channelName}]:`, err);
      }
    };
  } catch (err) {
    console.error(`Error subscribing to [${channelName}]:`, err);
    return () => {};
  }
}

/**
 * Subscribe to multiple events on a single table using one channel.
 * Each entry in `listeners` has { event, callback }.
 */
export function subscribeToTableMulti({ table, workspaceId, listeners = [] }) {
  if (ENV.USE_MOCK || !workspaceId) return () => {};
  if (!supabase || typeof supabase.channel !== 'function') return () => {};

  const channelName = `${table}-workspace-${workspaceId}`;

  try {
    let ch = supabase.channel(channelName);

    for (const { event = '*', callback } of listeners) {
      ch = ch.on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          try {
            callback(payload);
          } catch (err) {
            console.error(`Realtime callback error [${table}/${event}]:`, err);
          }
        },
      );
    }

    ch.subscribe();

    return () => {
      try {
        if (supabase && typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(ch);
        }
      } catch (err) {
        console.error(`Error removing channel [${channelName}]:`, err);
      }
    };
  } catch (err) {
    console.error(`Error subscribing to [${channelName}]:`, err);
    return () => {};
  }
}

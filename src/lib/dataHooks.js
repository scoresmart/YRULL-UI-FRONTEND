import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ENV } from './env';
import { supabase } from './supabase';
import { mockDb } from './mockData';
import { tagsApi, instagramApi } from './api';
import { useAuthStore } from '../store/authStore';

async function fromSupabase(table, opts = {}) {
  const q = supabase.from(table).select(opts.select ?? '*');
  const { data, error } = opts.limit ? await q.limit(opts.limit) : await q;
  if (error) throw error;
  return data;
}

export function useProfiles({ limit } = {}) {
  return useQuery({
    queryKey: ['profiles', limit],
    queryFn: async () =>
      ENV.USE_MOCK ? mockDb.profiles.slice(0, limit ?? mockDb.profiles.length) : fromSupabase('profiles', { limit }),
  });
}

export function useActivityLogs({ limit } = {}) {
  return useQuery({
    queryKey: ['activity_logs', limit],
    queryFn: async () =>
      ENV.USE_MOCK
        ? mockDb.activity_logs.slice(0, limit ?? mockDb.activity_logs.length)
        : fromSupabase('activity_logs', { limit }),
  });
}

export function useAutomations() {
  return useQuery({
    queryKey: ['automations'],
    queryFn: async () => (ENV.USE_MOCK ? mockDb.automations : fromSupabase('automations')),
  });
}

export function useRules() {
  return useQuery({
    queryKey: ['rules'],
    queryFn: async () => (ENV.USE_MOCK ? mockDb.rules : fromSupabase('rules')),
  });
}

export function useContacts() {
  return useQuery({
    queryKey: ['whatsapp_contacts'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return mockDb.contacts;
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .order('last_seen', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => (ENV.USE_MOCK ? mockDb.tags : tagsApi.list()),
  });
}

export function useContactTags() {
  return useQuery({
    queryKey: ['contact_tags'],
    queryFn: async () => (ENV.USE_MOCK ? mockDb.contact_tags : tagsApi.listContactTags()),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const wsId = useAuthStore.getState().profile?.workspace_id;
      if (!wsId) throw new Error('Workspace is not available for this session');

      if (ENV.USE_MOCK) {
        const record = {
          id: crypto.randomUUID(),
          workspace_id: wsId,
          phone: payload.phone,
          first_name: payload.first_name || null,
          last_name: payload.last_name || null,
          email: payload.email || null,
          notes: payload.notes || null,
          status: 'active',
          created_at: new Date().toISOString(),
          last_active_at: null,
        };
        mockDb.contacts.unshift(record);
        return record;
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          workspace_id: wsId,
          phone: payload.phone,
          first_name: payload.first_name || null,
          last_name: payload.last_name || null,
          email: payload.email || null,
          notes: payload.notes || null,
          status: 'active',
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      toast.success('Contact saved');
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Failed to save contact';
      toast.error(msg);
    },
  });
}

export function useAudiences() {
  return useQuery({
    queryKey: ['audiences'],
    queryFn: async () => (ENV.USE_MOCK ? mockDb.audiences : fromSupabase('audiences')),
  });
}

// Removed useConversations() - no conversations table exists

export function useMessages(waId) {
  return useQuery({
    queryKey: ['whatsapp_messages', waId],
    enabled: Boolean(waId),
    // Real-time subscription handles new messages instantly via useRealtime.
    // Only poll as a safety fallback every 30s.
    refetchInterval: 30000,
    refetchIntervalInBackground: false, // Don't poll when tab is in background
    staleTime: 10000,
    gcTime: 300000, // Keep in cache for 5 minutes
    queryFn: async () => {
      if (!waId) return [];
      if (ENV.USE_MOCK) return mockDb.messages.filter((m) => m.wa_id === waId);

      // Fetch ALL messages for this contact (both inbound and outbound, including automated)
      // No direction filter - we want to see all messages sent/received/automated
      // Also fetch messages that might have different direction values (automated, system, etc.)
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('wa_id', waId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }

      // Ultra-aggressive deduplication: handle backend sending duplicates
      if (!data) return [];

      // Use a Map to track all possible duplicate keys
      const seen = new Map();
      const result = [];

      data.forEach((msg) => {
        // Include ALL messages - don't filter out automated messages or messages without body
        // Some automated messages might not have a body initially, or might have different structure

        // Create multiple keys to catch duplicates even if IDs differ
        const idKey = msg.id ? `id:${msg.id}` : null;
        // Use empty string for body if null/undefined to ensure messages without body are still included
        const bodyContent = (msg.body || '').trim() || '[no body]';
        const contentKey = `content:${bodyContent}_${msg.created_at}_${msg.direction}_${msg.wa_id}`;
        const timestampKey = `time:${msg.created_at}_${bodyContent}_${msg.direction}_${msg.wa_id}`;

        // Check if we've seen this message by any key
        let isDuplicate = false;
        if (idKey && seen.has(idKey)) isDuplicate = true;
        if (!isDuplicate && seen.has(contentKey)) isDuplicate = true;
        if (!isDuplicate && seen.has(timestampKey)) isDuplicate = true;

        if (!isDuplicate) {
          // Mark all keys as seen
          if (idKey) seen.set(idKey, msg);
          seen.set(contentKey, msg);
          seen.set(timestampKey, msg);
          result.push(msg);
        }
      });

      return result;
    },
  });
}

export function useInstagramContacts() {
  return useQuery({
    queryKey: ['instagram_contacts'],
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      return instagramApi.getConversations(50);
    },
  });
}

export function useInstagramMessages(igUserId) {
  return useQuery({
    queryKey: ['instagram_messages', igUserId],
    enabled: Boolean(igUserId),
    refetchInterval: 30000,
    staleTime: 10000,
    queryFn: async () => {
      if (!igUserId) return [];
      if (ENV.USE_MOCK) return [];
      return instagramApi.getMessages(igUserId);
    },
  });
}

// -- Instagram Comments hooks -------------------------------------------------

export function useComments({ postId, status } = {}) {
  return useQuery({
    queryKey: ['instagram_comments', postId, status],
    staleTime: 15000,
    refetchInterval: 60000,
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const result = await instagramApi.listComments({ post_id: postId, status });
      return Array.isArray(result) ? result : (result?.data ?? []);
    },
  });
}

export function useMentions() {
  return useQuery({
    queryKey: ['instagram_mentions'],
    staleTime: 15000,
    refetchInterval: 60000,
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const result = await instagramApi.listMentions();
      return Array.isArray(result) ? result : (result?.data ?? []);
    },
  });
}

export function useInstagramPosts() {
  return useQuery({
    queryKey: ['instagram_posts'],
    staleTime: 60000,
    queryFn: async () => {
      if (ENV.USE_MOCK) return [];
      const result = await instagramApi.listPosts();
      return Array.isArray(result) ? result : (result?.data ?? []);
    },
  });
}

export function useReplyToComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commentId, message }) => instagramApi.replyToComment({ commentId, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instagram_comments'] });
      toast.success('Reply sent');
    },
    onError: (err) => toast.error(err.message || 'Failed to send reply'),
  });
}

export function useHideComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => instagramApi.hideComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instagram_comments'] });
      toast.success('Comment hidden');
    },
    onError: (err) => toast.error(err.message || 'Failed to hide comment'),
  });
}

export function useUnhideComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => instagramApi.unhideComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instagram_comments'] });
      toast.success('Comment unhidden');
    },
    onError: (err) => toast.error(err.message || 'Failed to unhide comment'),
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId) => instagramApi.deleteComment(commentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instagram_comments'] });
      toast.success('Comment deleted');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete comment'),
  });
}

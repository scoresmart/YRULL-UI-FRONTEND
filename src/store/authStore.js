import { create } from 'zustand';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { ENV } from '../lib/env';
import { mockProfiles } from '../lib/mockData';

/** PostgREST / supabase-js sometimes returns scalar UUIDs in odd shapes — normalize for truthiness checks. */
function normalizeRpcWorkspaceId(data) {
  if (data == null) return null;
  if (typeof data === 'string' && data.length > 0) return data;
  if (Array.isArray(data) && data.length > 0) return normalizeRpcWorkspaceId(data[0]);
  if (typeof data === 'object') {
    const first = Object.values(data).find((v) => typeof v === 'string' && v.length > 0);
    if (first) return first;
  }
  return null;
}

export const useAuthStore = create((set, get) => ({
  session: null,
  profile: null,
  status: 'idle', // idle | loading | authed | guest

  hydrate: async () => {
    if (ENV.USE_MOCK) {
      const current = get();
      if (current.status === 'idle') {
        set({ status: 'guest' });
      }
      return;
    }
    set({ status: 'loading' });
    const { data } = await supabase.auth.getSession();
    set({ session: data?.session ?? null, status: data?.session ? 'authed' : 'guest' });
  },

  fetchProfile: async () => {
    if (ENV.USE_MOCK) {
      const profile = mockProfiles.find((p) => p.role === 'user') ?? mockProfiles[0];
      set({ profile });
      return profile;
    }
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId) {
        console.warn('No user ID found');
        set({ profile: null });
        return null;
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId,
        });
        set({ profile: null });
        return null;
      }
      
      if (!profile) {
        console.warn('Profile not found for user:', userId);
        set({ profile: null });
        return null;
      }

      // Fetch workspace info if profile has workspace_id
      if (profile.workspace_id) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id, name, slug')
          .eq('id', profile.workspace_id)
          .maybeSingle();
        if (workspace) {
          profile.workspace = workspace;
        }
      }

      set({ profile });

      // OAuth / third-party sign-in: profile row exists (DB trigger) but no workspace — email sign-up creates one in app code.
      if (!ENV.USE_MOCK && !profile.workspace_id) {
        const ensured = await get().ensureDefaultWorkspaceForUser(profile, userId);
        if (ensured) return ensured;
      }

      return profile;
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
      set({ profile: null });
      return null;
    }
  },

  /**
   * Create a workspace and attach it to the profile when missing (e.g. Facebook OAuth users).
   */
  ensureDefaultWorkspaceForUser: async (profile, userId) => {
    if (!profile || profile.workspace_id) return null;

    // Prefer DB RPC (SECURITY DEFINER) — bypasses RLS when client inserts are blocked.
    const { data: rpcRaw, error: rpcError } = await supabase.rpc('ensure_workspace_for_current_user');
    const rpcId = normalizeRpcWorkspaceId(rpcRaw);
    const rpcMissing =
      rpcError &&
      (String(rpcError.message || '').includes('Could not find the function') ||
        String(rpcError.message || '').includes('function public.ensure_workspace_for_current_user') ||
        rpcError.code === 'PGRST202');

    if (!rpcError && rpcId) {
      const { data: wsRow } = await supabase
        .from('workspaces')
        .select('id, name, slug')
        .eq('id', rpcId)
        .maybeSingle();
      const merged = {
        ...profile,
        workspace_id: rpcId,
        workspace: wsRow ?? { id: rpcId, name: profile.full_name || 'Workspace', slug: null },
      };
      set({ profile: merged });
      return merged;
    }

    if (rpcError && !rpcMissing) {
      console.error('ensureDefaultWorkspaceForUser: RPC failed', rpcError);
      toast.error(`Could not create workspace (RPC): ${rpcError.message}. Re-run supabase/rpc_ensure_workspace.sql in SQL Editor.`, {
        duration: 10000,
        id: 'yrull-ws-rpc',
      });
      return null;
    }

    const email = profile.email || '';
    const localPart = email.split('@')[0] || 'account';
    const workspaceName = profile.full_name?.trim()
      ? `${profile.full_name.trim()}'s workspace`
      : `${localPart}'s workspace`;

    const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: workspaceName, slug: `${slug}-${Date.now()}`, owner_id: userId })
      .select()
      .single();
    if (wsError) {
      console.error('ensureDefaultWorkspaceForUser: workspace insert failed', wsError);
      toast.error(
        `Could not create workspace: ${wsError.message}. Run supabase/rpc_ensure_workspace.sql in Supabase SQL Editor (recommended), or fix RLS with supabase/rls_bootstrap_workspace.sql.`,
        { duration: 10000 },
      );
      return null;
    }

    const { error: upError } = await supabase
      .from('profiles')
      .update({ workspace_id: workspace.id })
      .eq('id', userId);
    if (upError) {
      console.error('ensureDefaultWorkspaceForUser: profile update failed', upError);
      toast.error(
        `Could not link workspace to profile: ${upError.message}. Check RLS allows updating your own profile row.`,
        { duration: 9000 },
      );
      return null;
    }

    const merged = {
      ...profile,
      workspace_id: workspace.id,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      },
    };
    set({ profile: merged });
    return merged;
  },

  /**
   * Refetch profile and run workspace bootstrap, then return workspace id for Instagram OAuth.
   * Call this right before linking Instagram so RLS/SQL fixes apply without a full page reload.
   */
  resolveWorkspaceIdForInstagram: async () => {
    if (ENV.USE_MOCK) {
      const p = mockProfiles.find((x) => x.workspace_id) ?? mockProfiles[0];
      return p?.workspace_id ?? null;
    }

    // Call RPC before fetchProfile so DB is updated first; avoids stale in-memory profile skipping bootstrap.
    const { data: rpcRaw, error: rpcErr } = await supabase.rpc('ensure_workspace_for_current_user');
    const rpcFirst = normalizeRpcWorkspaceId(rpcRaw);
    if (!rpcErr && rpcFirst) {
      await get().fetchProfile();
      return get().profile?.workspace_id ?? rpcFirst;
    }
    if (rpcErr) {
      const msg = String(rpcErr.message || '');
      const missing =
        msg.includes('Could not find the function') || msg.includes('ensure_workspace_for_current_user') || rpcErr.code === 'PGRST202';
      if (!missing) {
        console.error('resolveWorkspaceIdForInstagram RPC:', rpcErr);
        toast.error(`Workspace setup: ${msg}`, { duration: 12000, id: 'yrull-ws-rpc' });
      }
    }

    const p = await get().fetchProfile();
    const fromState = get().profile;
    return (
      p?.workspace_id ??
      p?.workspace?.id ??
      fromState?.workspace_id ??
      fromState?.workspace?.id ??
      null
    );
  },

  loginWithPassword: async ({ email, password }) => {
    set({ status: 'loading' });
    if (ENV.USE_MOCK) {
      // Simple mock auth: role by email hint
      const isAdmin = String(email).toLowerCase().includes('admin');
      const profile =
        mockProfiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase()) ??
        (isAdmin ? mockProfiles.find((p) => p.role === 'admin') : mockProfiles.find((p) => p.role === 'user'));
      set({
        status: 'authed',
        session: { access_token: 'mock', user: { id: profile?.id ?? 'mock_user', email } },
        profile: profile ?? null,
      });
      return { profile };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ status: 'guest', session: null, profile: null });
      throw error;
    }
    set({ session: data.session, status: 'authed' });
    const profile = await get().fetchProfile();
    return { profile };
  },

  /**
   * Facebook Login via Supabase Auth (identity). Separate from Instagram Business OAuth on the API.
   * Enable Authentication → Providers → Facebook in the Supabase project and add the redirect URL.
   */
  loginWithFacebook: async () => {
    if (ENV.USE_MOCK) {
      set({ status: 'guest' });
      throw new Error('Facebook sign-in is not available in mock mode.');
    }
    set({ status: 'loading' });
    // Space-separated Facebook Login permissions. Default `public_profile` only — if Meta shows
    // "Invalid Scopes: email", your app doesn't have `email` enabled yet (Use Cases in Meta console).
    // After enabling email, set VITE_FACEBOOK_OAUTH_SCOPES=public_profile email and redeploy.
    const facebookScopes =
      (import.meta.env.VITE_FACEBOOK_OAUTH_SCOPES || '').trim() || 'public_profile';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: facebookScopes,
      },
    });
    if (error) {
      set({ status: 'guest' });
      throw error;
    }
    if (data?.url) {
      window.location.assign(data.url);
      return { profile: null };
    }
    set({ status: 'guest' });
    throw new Error('Facebook sign-in did not return a redirect URL.');
  },

  signUp: async ({ email, password, fullName, workspaceName }) => {
    set({ status: 'loading' });
    if (ENV.USE_MOCK) {
      const profile = { id: 'mock_new', email, full_name: fullName, role: 'user', workspace_id: 'ws_new', workspace: { id: 'ws_new', name: workspaceName } };
      set({ status: 'authed', session: { access_token: 'mock', user: { id: 'mock_new', email } }, profile });
      return { profile };
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (authError) {
      set({ status: 'guest' });
      throw authError;
    }

    // If email confirmation is required, no session is returned
    if (!authData.session) {
      set({ status: 'guest' });
      return { needsConfirmation: true };
    }

    // 2. Set session
    set({ session: authData.session, status: 'authed' });

    const userId = authData.user?.id;

    // 3. Create workspace
    const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: workspaceName, slug: `${slug}-${Date.now()}`, owner_id: userId })
      .select()
      .single();
    if (wsError) throw wsError;

    // 4. Link profile to workspace
    await supabase
      .from('profiles')
      .update({ workspace_id: workspace.id, full_name: fullName })
      .eq('id', userId);

    // 5. Fetch full profile
    const profile = await get().fetchProfile();
    return { profile, workspace };
  },

  logout: async () => {
    if (!ENV.USE_MOCK) await supabase.auth.signOut();
    set({ session: null, profile: null, status: 'guest' });
    const { useChatStore } = await import('./chatStore');
    useChatStore.getState().reset();
  },
}));


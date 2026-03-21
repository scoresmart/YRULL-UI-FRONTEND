import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ENV } from '../lib/env';
import { mockProfiles } from '../lib/mockData';

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
      return profile;
    } catch (err) {
      console.error('Unexpected error in fetchProfile:', err);
      set({ profile: null });
      return null;
    }
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


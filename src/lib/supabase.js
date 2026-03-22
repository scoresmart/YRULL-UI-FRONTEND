import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';
import {
  getSupabaseCredentials,
  isSupabaseCredentialsPresent,
  useRealSupabaseClient,
} from './authConfig';

let client;

const useRealClient = useRealSupabaseClient();

if (!useRealClient) {
  if (ENV.DEV) {
    console.warn('⚠️ Supabase client:', {
      credentials: isSupabaseCredentialsPresent() ? '✅' : '❌',
      USE_MOCK: ENV.USE_MOCK,
      mode: useRealClient ? 'live' : 'stub',
    });
  }
  function notConfiguredError() {
    return new Error('Sign-in is temporarily unavailable. Please try again later.');
  }
  client = {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async signInWithPassword() {
        return {
          data: { session: null },
          error: notConfiguredError(),
        };
      },
      async signUp() {
        return {
          data: { user: null, session: null },
          error: notConfiguredError(),
        };
      },
    },
    from() {
      return {
        select() {
          return Promise.resolve({ data: [], error: null });
        },
        insert() {
          return Promise.resolve({ data: null, error: notConfiguredError() });
        },
        update() {
          return Promise.resolve({ data: null, error: notConfiguredError() });
        },
      };
    },
    channel() {
      return {
        on() {
          return this;
        },
        subscribe() {
          return { status: 'SUBSCRIBED' };
        },
      };
    },
    removeChannel() {
      return { status: 'ok' };
    },
  };
} else {
  const { url, anonKey } = getSupabaseCredentials();
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = client;

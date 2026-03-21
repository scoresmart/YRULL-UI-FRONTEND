import { createClient } from '@supabase/supabase-js';
import { ENV } from './env';

let client;

// In mock mode we don't need a real Supabase instance, but other modules
// import `supabase`, so provide a very small no-op client to avoid crashes
// when env vars are not configured yet.
// Check for both undefined and empty strings
const hasSupabaseConfig = ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY && 
  ENV.SUPABASE_URL.trim() !== '' && ENV.SUPABASE_ANON_KEY.trim() !== '';

if (!hasSupabaseConfig) {
  // Debug: log what we're getting (only in dev)
  if (ENV.DEV) {
    console.warn('⚠️ Supabase env vars:', {
      SUPABASE_URL: ENV.SUPABASE_URL ? '✅ Set' : '❌ Missing',
      SUPABASE_ANON_KEY: ENV.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
      USE_MOCK: ENV.USE_MOCK,
    });
  }
  client = {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async signInWithPassword() {
        return {
          data: { session: null },
          // Generic copy: never expose backend vendor or config filenames in production UI
          error: new Error('Sign-in is temporarily unavailable. Please try again later.'),
        };
      },
    },
    from() {
      return {
        select() {
          return Promise.resolve({ data: [], error: null });
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
  client = createClient(ENV.SUPABASE_URL.trim(), ENV.SUPABASE_ANON_KEY.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = client;


// Debug: Log what Vite is reading (only in dev, and only once)
if (import.meta.env.DEV && !window.__ENV_CHECKED__) {
  window.__ENV_CHECKED__ = true;
  console.debug('🔍 Vite env check:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Missing',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing',
  });
}

export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  // Read mock mode from env: set VITE_USE_MOCK=false to use real Supabase auth.
  USE_MOCK: import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK === true,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
};

export { isAuthConfigured } from './authConfig';

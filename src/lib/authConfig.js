/**
 * Single source of truth for Supabase / mock auth flags (avoids drift with supabase.js).
 */

export function getSupabaseCredentials() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  return { url, anonKey };
}

export function isSupabaseCredentialsPresent() {
  const { url, anonKey } = getSupabaseCredentials();
  return !!(url && anonKey);
}

export function isMockAuthEnabled() {
  return import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK === true;
}

/** Whether to use the real Supabase JS client (not the in-memory stub). */
export function isRealSupabaseClient() {
  return isSupabaseCredentialsPresent() && !isMockAuthEnabled();
}

/** User can attempt sign-in: real Supabase is configured, or mock mode is on. */
export function isAuthConfigured() {
  return isSupabaseCredentialsPresent() || isMockAuthEnabled();
}

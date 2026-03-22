import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
// Vite only exposes env vars prefixed with VITE_ to the client by default.
// Many hosts (e.g. Vercel) use SUPABASE_URL / SUPABASE_ANON_KEY without the prefix.
// We map those at build time so auth works when names match Supabase docs.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const supabaseUrl = (
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();

  const supabaseAnon = (
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  const useMockRaw = env.VITE_USE_MOCK ?? env.USE_MOCK ?? 'false';
  const useMock = String(useMockRaw).toLowerCase() === 'true' ? 'true' : 'false';

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
      'import.meta.env.VITE_USE_MOCK': JSON.stringify(useMock),
    },
  };
});

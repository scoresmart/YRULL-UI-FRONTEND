const REQUIRED_VARS = [
  { key: 'VITE_SUPABASE_URL', label: 'Supabase URL' },
  { key: 'VITE_SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
];

const OPTIONAL_VARS = [
  { key: 'VITE_API_BASE_URL', label: 'API Base URL' },
  { key: 'VITE_USE_MOCK', label: 'Mock mode flag' },
  { key: 'VITE_SENTRY_DSN', label: 'Sentry DSN' },
  { key: 'VITE_FACEBOOK_APP_ID', label: 'Facebook App ID' },
  { key: 'VITE_FACEBOOK_CONFIG_ID', label: 'Facebook Config ID' },
  { key: 'VITE_FACEBOOK_OAUTH_SCOPES', label: 'Facebook OAuth Scopes' },
];

/**
 * Validate required environment variables on app startup.
 * Returns { ok, missing[] } — never reveals actual values.
 */
export function checkEnvVars() {
  const isMock =
    import.meta.env.VITE_USE_MOCK === 'true' || import.meta.env.VITE_USE_MOCK === true;

  if (isMock) return { ok: true, missing: [], warnings: [] };

  const missing = [];
  for (const v of REQUIRED_VARS) {
    const val = import.meta.env[v.key];
    if (!val || (typeof val === 'string' && !val.trim())) {
      missing.push(v);
    }
  }

  const warnings = [];
  for (const v of OPTIONAL_VARS) {
    const val = import.meta.env[v.key];
    if (!val || (typeof val === 'string' && !val.trim())) {
      warnings.push(v);
    }
  }

  if (import.meta.env.DEV && warnings.length > 0) {
    console.warn(
      '⚠️ Optional env vars not set:',
      warnings.map((w) => w.key).join(', '),
    );
  }

  return { ok: missing.length === 0, missing, warnings };
}

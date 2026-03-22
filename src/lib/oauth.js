import { ENV } from './env';

/**
 * Backend OAuth start URL for Instagram / Meta Login.
 * Requires VITE_API_BASE_URL (or API_BASE_URL via vite.config) in production.
 * A relative `/oauth/...` URL on Vercel is rewritten to the SPA — OAuth never hits your API.
 */
export function getInstagramOAuthAuthorizeUrl(workspaceId) {
  if (!workspaceId) return '';
  const base = (ENV.API_BASE_URL || '').trim().replace(/\/$/, '');
  const path = `/oauth/instagram/authorize?workspace_id=${encodeURIComponent(workspaceId)}`;
  if (!base) {
    // Dev: allow same-origin if you use Vite proxy to backend; prod must set API URL.
    if (import.meta.env.DEV) return path;
    return '';
  }
  return `${base}${path}`;
}

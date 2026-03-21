import { ENV } from './env';

/**
 * Backend OAuth start URL for Instagram / Meta Login.
 * Uses VITE_API_BASE_URL when set; otherwise same-origin `/oauth/...` (e.g. Vite proxy).
 */
export function getInstagramOAuthAuthorizeUrl(workspaceId) {
  if (!workspaceId) return '';
  const base = (ENV.API_BASE_URL || '').replace(/\/$/, '');
  const path = `/oauth/instagram/authorize?workspace_id=${encodeURIComponent(workspaceId)}`;
  return base ? `${base}${path}` : path;
}

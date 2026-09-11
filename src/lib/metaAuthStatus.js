/**
 * Tracks whether Meta has rejected our stored access token.
 *
 * The backend's /whatsapp/status is served from cached DB rows, so it keeps
 * reporting `connected: true` long after the Meta token has expired. Any live
 * Graph call (templates, send, etc.) fails with OAuthException code 190 first,
 * so we latch that here and let the UI stop claiming the channel is healthy.
 *
 * Cleared on a successful reconnect — see clearMetaAuthError().
 */
let expired = false;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

/** Called by apiJSON whenever a request fails Meta's token check. */
export function markMetaAuthError() {
  if (expired) return;
  expired = true;
  emit();
}

/** Called after a successful reconnect / status refresh that proves the token works. */
export function clearMetaAuthError() {
  if (!expired) return;
  expired = false;
  emit();
}

export function isMetaTokenExpired() {
  return expired;
}

export function subscribeMetaAuthStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

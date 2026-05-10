export async function connectWhatsApp(authFetch, apiBase) {
  const returnOrigin = window.location.origin;
  const url = `${apiBase}/oauth/whatsapp/authorize?return_origin=${encodeURIComponent(returnOrigin)}`;

  const res = await authFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.auth_url) {
    throw new Error(data.error || 'Failed to start WhatsApp OAuth');
  }

  window.location.href = data.auth_url;

  return new Promise(() => {});
}

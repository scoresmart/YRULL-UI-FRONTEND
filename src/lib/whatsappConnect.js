export async function connectWhatsApp(authFetch, apiBase) {
  const returnOrigin = window.location.origin;
  const path = `/oauth/whatsapp/authorize?return_origin=${encodeURIComponent(returnOrigin)}`;
  const url = `${apiBase}${path}`;

  const res = await authFetch(url, { method: 'GET' });
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok || !data.auth_url) {
    console.error(`API GET ${path} → ${res.status}`, data);
    throw new Error(data.error || data.message || `${res.status} ${res.statusText || 'Failed to start WhatsApp OAuth'}`);
  }

  window.location.href = data.auth_url;

  return new Promise(() => {});
}

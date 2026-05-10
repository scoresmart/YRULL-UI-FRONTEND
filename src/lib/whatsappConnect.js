export async function connectWhatsApp(authFetch, apiBase) {
  const res = await authFetch(`${apiBase}/oauth/whatsapp/connect-direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to connect WhatsApp');
  return data;
}

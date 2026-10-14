import { supabase } from './supabase';
import { getSupabaseCredentials } from './authConfig';

/**
 * LMS support tickets live in the LMS Supabase project, not Yrull's. The
 * `yrull-support-bridge` edge function there verifies our Yrull session and
 * only answers if the signed-in email is an LMS admin.
 */
const LMS_SUPABASE_URL = (
  import.meta.env.VITE_LMS_SUPABASE_URL?.trim() || 'https://sepzceaicoldqhyxxzff.supabase.co'
).replace(/\/$/, '');
const BRIDGE_URL = `${LMS_SUPABASE_URL}/functions/v1/yrull-support-bridge`;

async function call(action, params = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not signed in');
  const res = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-yrull-token': token,
      'x-yrull-apikey': getSupabaseCredentials().anonKey,
    },
    body: JSON.stringify({ action, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body?.error || `${res.status} Request failed`);
    error.status = res.status;
    throw error;
  }
  return body;
}

export const supportTicketsApi = {
  access: () => call('access'),
  list: ({ status, search } = {}) => call('list', { status, search }),
  get: (ticketId) => call('get', { ticket_id: ticketId }),
  reply: (ticketId, body, { resolve = false } = {}) => call('reply', { ticket_id: ticketId, body, resolve }),
  setStatus: (ticketId, status) => call('set_status', { ticket_id: ticketId, status }),
};

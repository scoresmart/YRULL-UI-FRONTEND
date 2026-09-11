import { ENV } from './env';
import toast from 'react-hot-toast';
import { supabase } from './supabase';
import { markMetaAuthError } from './metaAuthStatus';

/**
 * Authenticated fetch wrapper - attaches Supabase JWT + workspace context.
 */
export async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!headers['Content-Type'] && options.body) headers['Content-Type'] = 'application/json';
  try {
    const { useAuthStore } = await import('../store/authStore');
    const wsId = useAuthStore.getState().profile?.workspace_id;
    if (wsId) headers['X-Workspace-Id'] = wsId;
  } catch {
    /* ignore */
  }
  return fetch(url, { ...options, headers });
}

/**
 * Wrapper that performs an authFetch, parses JSON, and on failure logs the raw
 * response body to the console and throws an Error carrying the backend's
 * own error/message field (never the generic placeholder). This is the only
 * sanctioned way to talk to our API — never swallow with `.catch(() => ({}))`.
 */
async function apiJSON(method, path, init = {}) {
  const url = `${ENV.API_BASE_URL}${path}`;
  const response = await authFetch(url, { method, ...init });
  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  } else {
    body = {};
  }
  if (!response.ok) {
    console.error(`API ${method} ${path} → ${response.status}`, body);
    const msg =
      (body && (body.error || body.message || body.detail)) ||
      `${response.status} ${response.statusText || 'Request failed'}`;
    const error = new ApiError(msg, { status: response.status, body, method, path });
    // A live Graph call is the only thing that actually proves the token state,
    // so latch it here — /whatsapp/status reads cached rows and can't tell us.
    if (isMetaAuthError(error)) markMetaAuthError();
    throw error;
  }
  return body;
}

/**
 * Error thrown by apiJSON. Carries the HTTP status and the parsed body so
 * callers can branch on *why* a call failed (e.g. an expired Meta token)
 * instead of only having a message string to pattern-match.
 */
export class ApiError extends Error {
  constructor(message, { status, body, method, path } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.method = method;
    this.path = path;
  }
}

/**
 * True when a failure is Meta rejecting our stored WhatsApp/Facebook access
 * token (OAuthException code 190 — expired, revoked, or password changed).
 * Retrying can never fix this; the workspace has to reconnect Facebook.
 */
export function isMetaAuthError(error) {
  const meta = error?.body?.meta_error;
  if (meta && (meta.code === 190 || meta.type === 'OAuthException')) return true;
  return /token has expired|session has been invalidated|OAuthException/i.test(error?.message ?? '');
}

// -- Unified Facebook OAuth (login + connect, all Meta scopes) ----------------

export const facebookIntegrationApi = {
  /** Public login/signup — no JWT. Backend requests all 18 Meta scopes. */
  async startLogin() {
    const returnOrigin = window.location.origin;
    const qs = `?mode=login&return_origin=${encodeURIComponent(returnOrigin)}`;
    const response = await fetch(`${ENV.API_BASE_URL}/oauth/facebook/authorize${qs}`);
    let body = {};
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
    if (!response.ok) {
      const msg = body.error || body.message || `${response.status} Failed to start Facebook login`;
      throw new Error(msg);
    }
    if (!body.auth_url) throw new Error('Backend did not return an auth_url');
    return body.auth_url;
  },

  /** Dashboard reconnect — requires signed-in user + workspace. */
  async startConnect() {
    const returnOrigin = window.location.origin;
    const qs = `?mode=connect&return_origin=${encodeURIComponent(returnOrigin)}`;
    const data = await apiJSON('GET', `/oauth/facebook/authorize${qs}`);
    if (!data.auth_url) throw new Error('Backend did not return an auth_url');
    return data.auth_url;
  },

  disconnect: () => apiJSON('POST', '/oauth/facebook/disconnect'),
};

// -- WhatsApp Integration (workspace-scoped) ----------------------------------

export const whatsappIntegrationApi = {
  getStatus: () => apiJSON('GET', '/whatsapp/status'),

  async startAuthorize() {
    const returnOrigin = window.location.origin;
    const qs = `?return_origin=${encodeURIComponent(returnOrigin)}`;
    const data = await apiJSON('GET', `/oauth/whatsapp/authorize${qs}`);
    if (!data.auth_url) throw new Error('Backend did not return an auth_url');
    return data.auth_url;
  },

  disconnect: () => apiJSON('POST', '/oauth/whatsapp/disconnect'),

  registerNumber: (phoneNumberId) =>
    apiJSON('POST', '/whatsapp/register-number', {
      body: JSON.stringify({ phone_number_id: phoneNumberId }),
    }),
};

// -- WhatsApp API -------------------------------------------------------------

export const whatsappApi = {
  async sendMessage({ to, message }) {
    try {
      return await apiJSON('POST', '/whatsapp/send', { body: JSON.stringify({ to, message }) });
    } catch (error) {
      toast.error(error.message || 'Failed to send message');
      throw error;
    }
  },

  async sendCallButton({ to, message, displayText }) {
    try {
      const body = { to };
      if (message) body.message = message;
      if (displayText) body.display_text = displayText;
      return await apiJSON('POST', '/whatsapp/call-button', { body: JSON.stringify(body) });
    } catch (error) {
      toast.error(error.message || 'Failed to send call button');
      throw error;
    }
  },

  async getCallHistory({ limit = 50, direction } = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (direction) params.set('direction', direction);
    try {
      return await apiJSON('GET', `/whatsapp/calls?${params}`);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch call history');
      throw error;
    }
  },

  // Pending calls endpoint requires X-Workspace-Id (backend @require_workspace).
  // authFetch already attaches the header, so callers don't need to thread it.
  getPendingCalls: () => apiJSON('GET', '/whatsapp/calls/pending'),

  acceptCall: ({ call_id, sdp, sdp_type = 'answer' }) =>
    apiJSON('POST', '/whatsapp/call/accept', { body: JSON.stringify({ call_id, sdp, sdp_type }) }),

  rejectCall: (call_id) =>
    apiJSON('POST', '/whatsapp/call/reject', { body: JSON.stringify({ call_id }) }),

  hangupCall: (call_id) =>
    apiJSON('POST', '/whatsapp/call/hangup', { body: JSON.stringify({ call_id }) }),

  // -- Outbound calling ------------------------------------------------------
  // WhatsApp refuses a business-initiated call unless the contact has granted
  // permission, so check before dialling instead of surfacing Meta's refusal.
  // state is one of: never_asked | granted | granted_permanent | expired | declined
  getCallPermission: (waId) =>
    apiJSON('GET', `/whatsapp/call/permission-status?wa_id=${encodeURIComponent(waId)}`),

  async requestCallPermission({ to, text }) {
    try {
      const body = { to };
      if (text) body.text = text;
      return await apiJSON('POST', '/whatsapp/call/permission', { body: JSON.stringify(body) });
    } catch (error) {
      toast.error(error.message || 'Failed to request call permission');
      throw error;
    }
  },

  // Places the call. The response wraps Meta's, so the id lands at
  // result.calls[0].id — every later action on the call needs it.
  placeCall: ({ to, sdp, sdp_type = 'offer' }) =>
    apiJSON('POST', '/whatsapp/call/action', {
      body: JSON.stringify({ action: 'connect', to, sdp, sdp_type }),
    }),

  // The callee's SDP answer does NOT come back in the connect response. Meta
  // delivers it to the backend webhook, which parks it here for ~120 seconds.
  getAnsweredCalls: (callId) =>
    apiJSON('GET', `/whatsapp/calls/answered?call_id=${encodeURIComponent(callId)}`),

  async sendAudio({ to, audioBlob }) {
    const form = new FormData();
    form.append('to', to);
    form.append('audio', audioBlob, `voice-${Date.now()}.ogg`);
    try {
      // Build auth headers manually — do NOT set Content-Type (browser sets it with boundary for FormData)
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      let wsId;
      try {
        const { useAuthStore } = await import('../store/authStore');
        wsId = useAuthStore.getState().profile?.workspace_id;
      } catch { /* ignore */ }
      if (wsId) headers['X-Workspace-Id'] = wsId;

      const res = await fetch(`${ENV.API_BASE_URL}/whatsapp/send-audio`, { method: 'POST', headers, body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      return res.json();
    } catch (error) {
      toast.error(error.message || 'Failed to send voice message');
      throw error;
    }
  },
};

// -- Conversations API --------------------------------------------------------

export const conversationsApi = {
  list: () => apiJSON('GET', '/whatsapp/conversations'),
};

// -- Automations API ----------------------------------------------------------

export const automationsApi = {
  list: () => apiJSON('GET', '/api/automations'),
  get: (id) => apiJSON('GET', `/api/automations/${id}`),
  create: (data) => apiJSON('POST', '/api/automations', { body: JSON.stringify(data) }),
  update: (id, data) => apiJSON('PUT', `/api/automations/${id}`, { body: JSON.stringify(data) }),
  delete: (id) => apiJSON('DELETE', `/api/automations/${id}`),
  getRuns: (id, limit = 50) => apiJSON('GET', `/api/automations/${id}/runs?limit=${limit}`),
  getLogs: (id, limit = 100) => apiJSON('GET', `/api/automations/${id}/logs?limit=${limit}`),
  trigger: (id, waId) =>
    apiJSON('POST', `/api/automations/${id}/trigger`, { body: JSON.stringify({ wa_id: waId }) }),
  stopRun: (runId) => apiJSON('POST', `/api/automations/runs/${runId}/stop`),
};

// -- Integrations API ---------------------------------------------------------

export const integrationsApi = {
  list: () => apiJSON('GET', '/api/integrations'),
  update: (key, values) => apiJSON('PUT', `/api/integrations/${key}`, { body: JSON.stringify(values) }),
};

// -- Workspace Members API ----------------------------------------------------

export const workspaceMembersApi = {
  list: () => apiJSON('GET', '/api/workspace/members'),
  invite: ({ email, role }) =>
    apiJSON('POST', '/api/workspace/invites', { body: JSON.stringify({ email, role }) }),
  revokeInvite: (inviteId) => apiJSON('DELETE', `/api/workspace/invites/${inviteId}`),
  resendInvite: (inviteId) => apiJSON('POST', `/api/workspace/invites/${inviteId}/resend`),
  changeRole: (memberId, role) =>
    apiJSON('PATCH', `/api/workspace/members/${memberId}/role`, { body: JSON.stringify({ role }) }),
  removeMember: (memberId) => apiJSON('DELETE', `/api/workspace/members/${memberId}`),
};

// -- Notification Preferences API ---------------------------------------------

export const notificationPrefsApi = {
  get: () => apiJSON('GET', '/api/notification-preferences'),
  update: (key, enabled) =>
    apiJSON('PUT', '/api/notification-preferences', { body: JSON.stringify({ key, enabled }) }),
};

// -- Analytics API ------------------------------------------------------------

export const analyticsApi = {
  getDashboard: () => apiJSON('GET', '/api/analytics/dashboard'),
};

// -- Broadcasts API -----------------------------------------------------------

export const broadcastsApi = {
  list: ({ status } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return apiJSON('GET', `/api/broadcasts?${params}`);
  },
  get: (id) => apiJSON('GET', `/api/broadcasts/${id}`),
  create: (data) => apiJSON('POST', '/api/broadcasts', { body: JSON.stringify(data) }),
  update: (id, data) => apiJSON('PATCH', `/api/broadcasts/${id}`, { body: JSON.stringify(data) }),
  delete: (id) => apiJSON('DELETE', `/api/broadcasts/${id}`),
  send: (id) => apiJSON('POST', `/api/broadcasts/${id}/send`),
  cancel: (id) => apiJSON('POST', `/api/broadcasts/${id}/cancel`),
  estimateAudience: (filter) =>
    apiJSON('POST', '/api/broadcasts/estimate', { body: JSON.stringify(filter) }),
};

// -- WhatsApp Templates API ---------------------------------------------------

export const templatesApi = {
  list: () => apiJSON('GET', '/api/whatsapp/templates'),
  get: (id) => apiJSON('GET', `/api/whatsapp/templates/${id}`),
  create: (data) => apiJSON('POST', '/api/whatsapp/templates', { body: JSON.stringify(data) }),
  delete: (id) => apiJSON('DELETE', `/api/whatsapp/templates/${id}`),
  // language is required — backend may try alternates but the frontend should
  // always send the actual template language, never a guessed default.
  sendTest: ({ to, template_name, language, components = [] }) => {
    if (!language) throw new Error('templatesApi.sendTest: language is required');
    return apiJSON('POST', '/api/whatsapp/send-template', {
      body: JSON.stringify({ to, template_name, language, components }),
    });
  },
};

// -- Account API --------------------------------------------------------------

export const accountApi = {
  deleteAccount: () => apiJSON('DELETE', '/auth/account'),
};

// -- Workspace Integrations API (multi-tenant) --------------------------------

export const workspaceIntegrationsApi = {
  list: () => apiJSON('GET', '/api/workspace/integrations'),
  update: (key, config) =>
    apiJSON('PUT', `/api/workspace/integrations/${key}`, { body: JSON.stringify(config) }),
  listChannels: () => apiJSON('GET', '/api/workspace/channels'),
};

// -- Claude Prompt API --------------------------------------------------------

export const claudePromptApi = {
  get: () => apiJSON('GET', '/api/claude-prompt'),
  update: (prompt) => apiJSON('PUT', '/api/claude-prompt', { body: JSON.stringify({ prompt }) }),
};

// -- Tags API -----------------------------------------------------------------

export const tagsApi = {
  list: () => apiJSON('GET', '/api/tags'),
  create: ({ name, color, description }) =>
    apiJSON('POST', '/api/tags', { body: JSON.stringify({ name, color, description }) }),
  update: (id, { name, color, description }) =>
    apiJSON('PUT', `/api/tags/${id}`, { body: JSON.stringify({ name, color, description }) }),
  delete: (id) => apiJSON('DELETE', `/api/tags/${id}`),
  applyToContact: (waId, tagId) =>
    apiJSON('POST', `/api/tags/${tagId}/apply`, { body: JSON.stringify({ wa_id: waId }) }),
  removeFromContact: (waId, tagId) =>
    apiJSON('POST', `/api/tags/${tagId}/remove`, { body: JSON.stringify({ wa_id: waId }) }),
  listContactTags: () => apiJSON('GET', '/api/contact-tags'),
};

// -- Notes API ----------------------------------------------------------------

export const notesApi = {
  list: (waId) => apiJSON('GET', `/api/notes/${waId}`),
  create: (waId, note) =>
    apiJSON('POST', `/api/notes/${waId}`, { body: JSON.stringify({ note }) }),
  delete: (waId, noteId) => apiJSON('DELETE', `/api/notes/${waId}/${noteId}`),
};

// -- Instagram API ------------------------------------------------------------

export const instagramApi = {
  getStatus: () => apiJSON('GET', '/instagram/status'),
  sendMessage: ({ to, message }) =>
    apiJSON('POST', '/instagram/send', { body: JSON.stringify({ to, message }) }),
  getConversations: (limit = 20) => apiJSON('GET', `/instagram/conversations?limit=${limit}`),
  getMessages: (igUserId, limit = 50) =>
    apiJSON('GET', `/instagram/messages/${igUserId}?limit=${limit}`),
  disconnect: () => apiJSON('POST', '/oauth/instagram/disconnect'),
  replyToComment: ({ commentId, message }) =>
    apiJSON('POST', '/instagram/comment/reply', {
      body: JSON.stringify({ comment_id: commentId, message }),
    }),
  listComments: ({ post_id, status, cursor } = {}) => {
    const params = new URLSearchParams();
    if (post_id) params.set('post_id', post_id);
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    return apiJSON('GET', `/instagram/comments?${params}`);
  },
  getComment: (commentId) => apiJSON('GET', `/instagram/comments/${commentId}`),
  hideComment: (commentId) => apiJSON('POST', `/instagram/comments/${commentId}/hide`),
  unhideComment: (commentId) => apiJSON('POST', `/instagram/comments/${commentId}/unhide`),
  deleteComment: (commentId) => apiJSON('DELETE', `/instagram/comments/${commentId}`),
  listMentions: ({ cursor } = {}) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    return apiJSON('GET', `/instagram/mentions?${params}`);
  },
  listPosts: ({ cursor } = {}) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    return apiJSON('GET', `/instagram/media?${params}`);
  },
};

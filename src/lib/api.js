import { ENV } from './env';
import toast from 'react-hot-toast';
import { supabase } from './supabase';

/**
 * Authenticated fetch wrapper - attaches Supabase JWT + workspace context.
 */
async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!headers['Content-Type'] && options.body) headers['Content-Type'] = 'application/json';
  try {
    const { useAuthStore } = await import('../store/authStore');
    const wsId = useAuthStore.getState().profile?.workspace_id;
    if (wsId) headers['X-Workspace-Id'] = wsId;
  } catch { /* ignore */ }
  return fetch(url, { ...options, headers });
}

// -- WhatsApp Integration (workspace-scoped) ----------------------------------

export const whatsappIntegrationApi = {
  async getStatus() {
    const response = await authFetch(`${ENV.API_BASE_URL}/whatsapp/status`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch WhatsApp status');
    }
    return response.json();
  },

  getAuthorizeUrl(workspaceId) {
    const returnOrigin = window.location.origin;
    return `${ENV.API_BASE_URL}/oauth/whatsapp/authorize?workspace_id=${encodeURIComponent(workspaceId)}&return_origin=${encodeURIComponent(returnOrigin)}`;
  },

  async disconnect() {
    const response = await authFetch(`${ENV.API_BASE_URL}/oauth/whatsapp/disconnect`, {
      method: 'POST',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to disconnect WhatsApp');
    }
    return response.json();
  },
};

// -- WhatsApp API -------------------------------------------------------------

export const whatsappApi = {
  async sendMessage({ to, message }) {
    try {
      const response = await authFetch(`${ENV.API_BASE_URL}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send message');
      return data;
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
      const response = await authFetch(`${ENV.API_BASE_URL}/whatsapp/call-button`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send call button');
      return data;
    } catch (error) {
      toast.error(error.message || 'Failed to send call button');
      throw error;
    }
  },

  async getCallHistory({ limit = 50, direction } = {}) {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (direction) params.set('direction', direction);
      const response = await authFetch(`${ENV.API_BASE_URL}/whatsapp/calls?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch call history');
      return data;
    } catch (error) {
      toast.error(error.message || 'Failed to fetch call history');
      throw error;
    }
  },

  async getPendingCalls() {
    const response = await authFetch(`${ENV.API_BASE_URL}/whatsapp/calls/pending`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  },

  async acceptCall({ call_id, sdp, sdp_type = 'answer' }) {
    const response = await authFetch(`${ENV.API_BASE_URL}/whatsapp/call/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_id, sdp, sdp_type }),
    });
    return response.json();
  },

  async rejectCall(call_id) {
    const response = await authFetch(`${ENV.API_BASE_URL}/whatsapp/call/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_id }),
    });
    return response.json();
  },

  async hangupCall(call_id) {
    const response = await authFetch(`${ENV.API_BASE_URL}/whatsapp/call/hangup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_id }),
    });
    return response.json();
  },
};

// -- Automations API ----------------------------------------------------------

export const automationsApi = {
  async list() {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations`);
    if (!response.ok) throw new Error('Failed to fetch automations');
    return response.json();
  },

  async get(id) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations/${id}`);
    if (!response.ok) throw new Error('Failed to fetch automation');
    return response.json();
  },

  async create(data) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create automation');
    return response.json();
  },

  async update(id, data) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update automation');
    return response.json();
  },

  async delete(id) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete automation');
    return response.json();
  },

  async getRuns(id, limit = 50) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations/${id}/runs?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch runs');
    return response.json();
  },

  async getLogs(id, limit = 100) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations/${id}/logs?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return response.json();
  },

  async trigger(id, waId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations/${id}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_id: waId }),
    });
    if (!response.ok) throw new Error('Failed to trigger automation');
    return response.json();
  },

  async stopRun(runId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/automations/runs/${runId}/stop`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to stop run');
    return response.json();
  },
};

// -- Integrations API ---------------------------------------------------------

export const integrationsApi = {
  async list() {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/integrations`);
    if (!response.ok) throw new Error('Failed to fetch integrations');
    return response.json();
  },

  async update(key, values) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/integrations/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (!response.ok) throw new Error('Failed to update integration');
    return response.json();
  },
};

// -- Workspace Integrations API (multi-tenant) --------------------------------

export const workspaceIntegrationsApi = {
  async list() {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/workspace/integrations`);
    if (!response.ok) throw new Error('Failed to fetch workspace integrations');
    return response.json();
  },

  async update(key, config) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/workspace/integrations/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to update workspace integration');
    return response.json();
  },

  async listChannels() {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/workspace/channels`);
    if (!response.ok) throw new Error('Failed to fetch channels');
    return response.json();
  },
};

// -- Claude Prompt API --------------------------------------------------------

export const claudePromptApi = {
  async get() {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/claude-prompt`);
    if (!response.ok) throw new Error('Failed to fetch Claude prompt');
    return response.json();
  },

  async update(prompt) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/claude-prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('Failed to update Claude prompt');
    return response.json();
  },
};

// -- Tags API -----------------------------------------------------------------

export const tagsApi = {
  async list() {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/tags`);
    if (!response.ok) throw new Error('Failed to fetch tags');
    return response.json();
  },

  async create({ name, color, description }) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, description }),
    });
    if (!response.ok) throw new Error('Failed to create tag');
    return response.json();
  },

  async delete(id) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/tags/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete tag');
    return response.json();
  },

  async applyToContact(waId, tagId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/tags/${tagId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_id: waId }),
    });
    if (!response.ok) throw new Error('Failed to apply tag');
    return response.json();
  },

  async removeFromContact(waId, tagId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/tags/${tagId}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_id: waId }),
    });
    if (!response.ok) throw new Error('Failed to remove tag');
    return response.json();
  },

  async listContactTags() {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/contact-tags`);
    if (!response.ok) throw new Error('Failed to fetch contact tags');
    return response.json();
  },
};

// -- Notes API ----------------------------------------------------------------

export const notesApi = {
  async list(waId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/notes/${waId}`);
    if (!response.ok) throw new Error('Failed to fetch notes');
    return response.json();
  },

  async create(waId, note) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/notes/${waId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!response.ok) throw new Error('Failed to create note');
    return response.json();
  },

  async delete(waId, noteId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/api/notes/${waId}/${noteId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete note');
    return response.json();
  },
};

// -- Instagram API ------------------------------------------------------------

export const instagramApi = {
  async getStatus() {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/status`);
    return response.json();
  },

  async sendMessage({ to, message }) {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send message');
    return data;
  },

  async getConversations(limit = 20) {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/conversations?limit=${limit}`);
    return response.json();
  },

  async getMessages(igUserId, limit = 50) {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/messages/${igUserId}?limit=${limit}`);
    return response.json();
  },

  async disconnect() {
    const response = await authFetch(`${ENV.API_BASE_URL}/oauth/instagram/disconnect`, {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to disconnect');
    return data;
  },

  async replyToComment({ commentId, message }) {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/comment/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId, message }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to reply to comment');
    return data;
  },

  // TODO: backend endpoint — GET /instagram/comments
  async listComments({ post_id, status, cursor } = {}) {
    const params = new URLSearchParams();
    if (post_id) params.set('post_id', post_id);
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/comments?${params}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch comments');
    }
    return response.json();
  },

  // TODO: backend endpoint — GET /instagram/comments/:id
  async getComment(commentId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/comments/${commentId}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch comment');
    }
    return response.json();
  },

  // TODO: backend endpoint — POST /instagram/comments/:id/hide
  async hideComment(commentId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/comments/${commentId}/hide`, {
      method: 'POST',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to hide comment');
    }
    return response.json();
  },

  // TODO: backend endpoint — POST /instagram/comments/:id/unhide
  async unhideComment(commentId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/comments/${commentId}/unhide`, {
      method: 'POST',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to unhide comment');
    }
    return response.json();
  },

  // TODO: backend endpoint — DELETE /instagram/comments/:id
  async deleteComment(commentId) {
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete comment');
    }
    return response.json();
  },

  // TODO: backend endpoint — GET /instagram/mentions
  async listMentions({ cursor } = {}) {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/mentions?${params}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch mentions');
    }
    return response.json();
  },

  // TODO: backend endpoint — GET /instagram/media
  async listPosts({ cursor } = {}) {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    const response = await authFetch(`${ENV.API_BASE_URL}/instagram/media?${params}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch posts');
    }
    return response.json();
  },
};

import { authFetch } from './api';
import { ENV } from './env';

/** Workspace phone number row from Meta / WABA listing */
export interface WhatsAppNumberRecord {
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
  code_verification_status?: string;
  status?: string;
  phone_number_id: string;
  id?: string;
}

export interface RegisterNumberPayload {
  phone_number_id: string;
  pin?: string;
}

export interface RegisterNumberResponse {
  success?: boolean;
  message?: string;
}

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type TemplateStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED'
  | string;

export interface TemplateButtonInput {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  /** URL for URL type, E.164-ish for PHONE_NUMBER */
  value?: string;
}

export type HeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface TemplateComponentPayload {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: HeaderFormat;
  text?: string;
  buttons?: TemplateButtonInput[];
}

export interface CreateTemplatePayload {
  name: string;
  category: TemplateCategory;
  language: string;
  components: TemplateComponentPayload[];
  /** Optional hints for variable substitution in previews / backend */
  variable_examples?: Record<string, string>;
}

export interface WhatsAppTemplateListItem {
  id: string;
  name: string;
  category?: string;
  language?: string;
  status: TemplateStatus;
  body?: string;
  components?: unknown;
  footer?: string;
  header_type?: string;
  header?: string;
  buttons?: TemplateButtonInput[];
  updated_at?: string;
  created_at?: string;
  rejection_reason?: string;
}

export interface TemplateMutationResponse {
  id?: string;
  status?: TemplateStatus;
  message?: string;
}

type ApiListEnvelope<T> = {
  data?: T[];
  numbers?: T[];
  templates?: T[];
};

type ApiMutationEnvelope<T> = T & {
  data?: T;
};

function makeUrl(path: string): string {
  const base = (ENV.API_BASE_URL || '').trim();
  return `${base}${path}`;
}

async function authFetchWithFallback(paths: string[], init?: RequestInit): Promise<Response> {
  let lastError: unknown = null;
  let lastTriedUrl = '';
  for (const path of paths) {
    try {
      const url = makeUrl(path);
      lastTriedUrl = url;
      const response = await authFetch(url, init);
      if (response.ok) return response;
      if (response.status !== 404) return response;
      lastError = new Error(`Endpoint not found: ${path}`);
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError instanceof TypeError) {
    const urlHint = lastTriedUrl || makeUrl(paths[0] || '');
    throw new Error(`Cannot reach backend API (${urlHint}). Check deployment URL, backend uptime, and CORS.`);
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error('Failed to reach backend API');
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string; detail?: string };
    return data.error || data.message || data.detail || fallback;
  } catch {
    return fallback;
  }
}

function normalizeNumbersPayload(raw: unknown): WhatsAppNumberRecord[] {
  if (Array.isArray(raw)) return raw as WhatsAppNumberRecord[];
  if (raw && typeof raw === 'object') {
    const o = raw as ApiListEnvelope<WhatsAppNumberRecord>;
    if (Array.isArray(o.data)) return o.data as WhatsAppNumberRecord[];
    if (Array.isArray(o.numbers)) return o.numbers as WhatsAppNumberRecord[];
  }
  return [];
}

function normalizeTemplatesPayload(raw: unknown): WhatsAppTemplateListItem[] {
  if (Array.isArray(raw)) return raw as WhatsAppTemplateListItem[];
  if (raw && typeof raw === 'object') {
    const o = raw as ApiListEnvelope<WhatsAppTemplateListItem>;
    if (Array.isArray(o.data)) return o.data as WhatsAppTemplateListItem[];
    if (Array.isArray(o.templates)) return o.templates as WhatsAppTemplateListItem[];
  }
  return [];
}

function normalizeMutationPayload<T extends object>(raw: unknown): T {
  if (raw && typeof raw === 'object') {
    const envelope = raw as ApiMutationEnvelope<T>;
    if (envelope.data && typeof envelope.data === 'object') {
      return envelope.data;
    }
    return envelope as T;
  }
  return {} as T;
}

export const whatsappManagerApi = {
  async getNumbers(): Promise<WhatsAppNumberRecord[]> {
    const response = await authFetchWithFallback(['/api/whatsapp/numbers', '/whatsapp/numbers']);
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Failed to load WhatsApp numbers'));
    }
    const json = await response.json();
    return normalizeNumbersPayload(json);
  },

  async registerNumber(payload: RegisterNumberPayload): Promise<RegisterNumberResponse> {
    const response = await authFetchWithFallback(['/api/whatsapp/register-number', '/whatsapp/register-number'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Failed to register number'));
    }
    const json = await response.json().catch(() => ({}));
    return normalizeMutationPayload<RegisterNumberResponse>(json);
  },

  async listTemplates(refresh?: boolean): Promise<WhatsAppTemplateListItem[]> {
    const qs = refresh ? '?refresh=1' : '';
    const response = await authFetchWithFallback([
      `/api/templates/list${qs}`,
      '/api/whatsapp/templates',
    ]);
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Failed to load templates'));
    }
    const json = await response.json();
    return normalizeTemplatesPayload(json);
  },

  async createTemplate(payload: CreateTemplatePayload): Promise<TemplateMutationResponse> {
    const response = await authFetchWithFallback(['/api/templates/create'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Failed to create template'));
    }
    const json = await response.json().catch(() => ({}));
    return normalizeMutationPayload<TemplateMutationResponse>(json);
  },

  async editTemplate(id: string, payload: CreateTemplatePayload): Promise<TemplateMutationResponse> {
    const response = await authFetchWithFallback([`/api/templates/${encodeURIComponent(id)}/edit`], {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Failed to save template'));
    }
    const json = await response.json().catch(() => ({}));
    return normalizeMutationPayload<TemplateMutationResponse>(json);
  },

  async deleteTemplate(id: string, _name?: string): Promise<void> {
    const response = await authFetchWithFallback([`/api/templates/${encodeURIComponent(id)}`], {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Failed to delete template'));
    }
  },
};

import type {
  CreateTemplatePayload,
  HeaderFormat,
  TemplateButtonInput,
  TemplateCategory,
  TemplateComponentPayload,
  WhatsAppTemplateListItem,
} from '../../lib/whatsappManagerApi';

export type HeaderKind = 'none' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface BuilderFormState {
  name: string;
  category: TemplateCategory;
  language: string;
  headerKind: HeaderKind;
  headerText: string;
  body: string;
  footer: string;
  buttons: TemplateButtonInput[];
}

export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'es', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (BR)' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh_CN', label: 'Chinese (CN)' },
];

function pullSlots(text: string, slots: Set<number>) {
  const re = /\{\{(\d+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    slots.add(Number(m[1]));
  }
}

export function collectVariableSlots(body: string, headerText: string): number[] {
  const slots = new Set<number>();
  pullSlots(body, slots);
  pullSlots(headerText, slots);
  return [...slots].sort((a, b) => a - b);
}

export function normalizeTemplateName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function parseComponentsArray(components: unknown): Partial<BuilderFormState> {
  const out: Partial<BuilderFormState> = {};
  if (!Array.isArray(components)) return out;
  for (const raw of components) {
    const c = raw as { type?: string; format?: string; text?: string; buttons?: TemplateButtonInput[] };
    if (c.type === 'BODY' && typeof c.text === 'string') out.body = c.text;
    if (c.type === 'FOOTER' && typeof c.text === 'string') out.footer = c.text;
    if (c.type === 'HEADER') {
      const fmt = (c.format || 'TEXT') as HeaderFormat;
      if (fmt === 'TEXT') {
        out.headerKind = 'TEXT';
        out.headerText = c.text ?? '';
      } else if (fmt === 'IMAGE' || fmt === 'VIDEO' || fmt === 'DOCUMENT') {
        out.headerKind = fmt;
        out.headerText = '';
      }
    }
    if (c.type === 'BUTTONS' && Array.isArray(c.buttons)) {
      out.buttons = c.buttons.map((b) => ({
        type: b.type,
        text: b.text || '',
        value: b.value,
      }));
    }
  }
  return out;
}

export function listItemToBuilderState(t: WhatsAppTemplateListItem): BuilderFormState {
  const fromComponents = parseComponentsArray(t.components);
  if (!fromComponents.body && t.body) fromComponents.body = t.body;
  const headerType = (t.header_type || '').toUpperCase();
  let headerKind: HeaderKind = fromComponents.headerKind ?? 'none';
  let headerText = fromComponents.headerText ?? '';
  if (!fromComponents.body && t.body) fromComponents.body = t.body;
  if (!fromComponents.footer && t.footer) fromComponents.footer = t.footer;
  if (headerKind === 'none' && headerType === 'TEXT') {
    headerKind = 'TEXT';
    headerText = t.header ?? '';
  } else if (headerKind === 'none' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
    headerKind = headerType as HeaderKind;
  }
  const buttons: TemplateButtonInput[] =
    fromComponents.buttons ?? (Array.isArray(t.buttons) ? (t.buttons as TemplateButtonInput[]) : []);
  return {
    name: t.name,
    category: (t.category as TemplateCategory) || 'MARKETING',
    language: t.language || 'en',
    headerKind,
    headerText,
    body: fromComponents.body ?? '',
    footer: fromComponents.footer ?? '',
    buttons,
  };
}

export function validateStep1(s: BuilderFormState): Record<string, string> {
  const err: Record<string, string> = {};
  if (!/^[a-z0-9_]+$/.test(s.name) || !s.name) err.name = 'Use lowercase letters, numbers, and underscores only.';
  if (!['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(s.category)) err.category = 'Pick a valid category.';
  if (!s.language.trim()) err.language = 'Language is required.';
  return err;
}

export function validateStep2(s: BuilderFormState): Record<string, string> {
  const err: Record<string, string> = {};
  const components = buildComponentsPayload(s);
  const hasBody = components.some((c) => c.type === 'BODY' && (c.text || '').trim().length > 0);
  if (!hasBody) err.body = 'Body is required.';
  if (s.headerKind === 'TEXT' && !(s.headerText || '').trim()) err.headerText = 'Header text is required for a text header.';
  if (s.buttons.length > 3) err.buttons = 'Maximum three buttons.';
  s.buttons.forEach((b, i) => {
    if (!(b.text || '').trim()) err[`btn_${i}_text`] = 'Button label required';
    if (b.type === 'URL') {
      const u = (b.value || '').trim();
      if (!/^https:\/\//i.test(u)) err[`btn_${i}_val`] = 'URL must start with https://';
    }
    if (b.type === 'PHONE_NUMBER') {
      const p = (b.value || '').trim();
      if (p.length < 6) err[`btn_${i}_val`] = 'Enter a valid phone number';
    }
  });
  return err;
}

export function validateStep3(s: BuilderFormState, examples: Record<string, string>): Record<string, string> {
  const err: Record<string, string> = {};
  const slots = collectVariableSlots(s.body, s.headerKind === 'TEXT' ? s.headerText : '');
  for (const n of slots) {
    const key = String(n);
    if (!(examples[key] || '').trim()) err[`var_${key}`] = `Example for {{${key}}} is required`;
  }
  return err;
}

export function buildComponentsPayload(s: BuilderFormState): TemplateComponentPayload[] {
  const components: TemplateComponentPayload[] = [];
  if (s.headerKind === 'TEXT') {
    components.push({ type: 'HEADER', format: 'TEXT', text: s.headerText || '' });
  } else if (s.headerKind === 'IMAGE' || s.headerKind === 'VIDEO' || s.headerKind === 'DOCUMENT') {
    components.push({ type: 'HEADER', format: s.headerKind as HeaderFormat });
  }
  components.push({ type: 'BODY', text: s.body });
  if (s.footer.trim()) components.push({ type: 'FOOTER', text: s.footer.trim() });
  if (s.buttons.length > 0) components.push({ type: 'BUTTONS', buttons: s.buttons });
  return components;
}

export function buildCreatePayload(s: BuilderFormState, examples: Record<string, string>): CreateTemplatePayload {
  return {
    name: s.name,
    category: s.category,
    language: s.language,
    components: buildComponentsPayload(s),
    variable_examples: Object.keys(examples).length ? examples : undefined,
  };
}

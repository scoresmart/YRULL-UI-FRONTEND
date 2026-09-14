// Helpers for WhatsApp message templates.
//
// The backend returns templates in two shapes depending on whether they came
// straight from the Meta Graph API (a `components` array) or from our own
// table (flat `body` / `header` / `footer` columns). Everything in the UI reads
// the normalized shape produced here so neither page has to care.

export const TEMPLATE_CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];

export const TEMPLATE_LANGUAGES = [
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

export function languageLabel(code) {
  return TEMPLATE_LANGUAGES.find((l) => l.code === code)?.label ?? code ?? '—';
}

function findComponent(components, type) {
  return (components ?? []).find((c) => (c.type ?? '').toUpperCase() === type);
}

/** Highest variable index used in a template body, e.g. "Hi {{1}} at {{2}}" -> 2. */
export function countParams(text) {
  const matches = (text ?? '').match(/\{\{\s*\d+\s*\}\}/g);
  if (!matches) return 0;
  return Math.max(...matches.map((m) => parseInt(m.replace(/[^\d]/g, ''), 10)), 0);
}

/** Turn either API shape into the single shape the UI renders. */
export function normalizeTemplate(t) {
  const components = t?.components ?? [];
  const headerComp = findComponent(components, 'HEADER');
  const bodyComp = findComponent(components, 'BODY');
  const footerComp = findComponent(components, 'FOOTER');
  const buttonsComp = findComponent(components, 'BUTTONS');

  const headerType = (t?.header_type ?? headerComp?.format ?? '').toUpperCase();
  const body = t?.body ?? bodyComp?.text ?? '';

  const buttons = (t?.buttons ?? buttonsComp?.buttons ?? []).map((b) => ({
    type: (b.type ?? 'QUICK_REPLY').toUpperCase(),
    text: b.text ?? '',
    value: b.value ?? b.url ?? b.phone_number ?? '',
  }));

  return {
    id: t?.id,
    name: t?.name ?? '',
    category: (t?.category ?? '').toUpperCase(),
    language: t?.language ?? '',
    status: (t?.status ?? 'PENDING').toUpperCase(),
    createdAt: t?.created_at ?? null,
    rejectionReason: t?.rejection_reason ?? '',
    headerType,
    header: t?.header ?? headerComp?.text ?? '',
    body,
    footer: t?.footer ?? footerComp?.text ?? '',
    buttons,
    paramCount: countParams(body),
  };
}

/**
 * Build the payload the composer starts from when duplicating a template.
 * Meta rejects a template whose name collides with an existing one, so the
 * copy gets a distinct suffixed name the user can edit.
 */
export function templateToDraft(template) {
  const t = normalizeTemplate(template);
  return {
    name: t.name ? `${t.name}_copy`.slice(0, 512) : '',
    category: TEMPLATE_CATEGORIES.includes(t.category) ? t.category : 'MARKETING',
    language: t.language || 'en',
    headerType: t.headerType,
    header: t.header,
    body: t.body,
    footer: t.footer,
    buttons: t.buttons,
  };
}


// Meta takes a template as an ordered list of typed components, and the
// backend forwards this array to the Graph API untouched. The form used to post
// its own flat shape (header_type/header/body/footer/buttons), which carried
// the same information but under names Meta has never heard of -- so every
// submission came back "components array is required" before it reached Meta.
export function buildComponents({ headerType, header, body, footer, buttons }) {
  const components = [];

  // Any {{1}} in the text needs a sample value alongside it or Meta rejects the
  // template outright. The placeholder number is the best sample we have here.
  const samplesFor = (text) => {
    const found = [...String(text || "").matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1]));
    if (!found.length) return null;
    const highest = Math.max(...found);
    return Array.from({ length: highest }, (_, i) => `sample ${i + 1}`);
  };

  if (headerType === "TEXT" && header?.trim()) {
    const component = { type: "HEADER", format: "TEXT", text: header.trim() };
    const samples = samplesFor(header);
    if (samples) component.example = { header_text: samples };
    components.push(component);
  } else if (headerType && headerType !== "NONE" && headerType !== "TEXT") {
    // Media headers carry a handle rather than text; Meta needs the format even
    // when the sample is supplied later.
    components.push({ type: "HEADER", format: headerType });
  }

  const bodyComponent = { type: "BODY", text: String(body || "").trim() };
  const bodySamples = samplesFor(body);
  if (bodySamples) bodyComponent.example = { body_text: [bodySamples] };
  components.push(bodyComponent);

  if (footer?.trim()) {
    components.push({ type: "FOOTER", text: footer.trim() });
  }

  const usable = (buttons || []).filter((b) => b?.text?.trim());
  if (usable.length) {
    components.push({
      type: "BUTTONS",
      buttons: usable.map((b) =>
        b.type === "URL"
          ? { type: "URL", text: b.text.trim(), url: (b.value || "").trim() }
          : { type: "QUICK_REPLY", text: b.text.trim() },
      ),
    });
  }

  return components;
}

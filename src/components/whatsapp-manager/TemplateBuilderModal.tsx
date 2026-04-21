import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Image, Video, FileText, File, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { whatsappManagerApi, type TemplateButtonInput, type WhatsAppTemplateListItem } from '../../lib/whatsappManagerApi';
import {
  LANGUAGES,
  buildCreatePayload,
  collectVariableSlots,
  listItemToBuilderState,
  normalizeTemplateName,
  validateStep1,
  validateStep2,
  validateStep3,
  type BuilderFormState,
  type HeaderKind,
} from './templateBuilderUtils';

const CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const;

const defaultForm = (): BuilderFormState => ({
  name: '',
  category: 'MARKETING',
  language: 'en',
  headerKind: 'none',
  headerText: '',
  body: '',
  footer: '',
  buttons: [],
});

function applyPreview(text: string, examples: Record<string, string>) {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => examples[n]?.trim() || `[${n}]`);
}

function ChatPreview({ form, examples }: { form: BuilderFormState; examples: Record<string, string> }) {
  const body = applyPreview(form.body, examples);
  const header = form.headerKind === 'TEXT' ? applyPreview(form.headerText, examples) : '';
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b141a] p-4">
      <div className="mb-2 text-center text-[10px] font-medium uppercase tracking-widest text-gray-500">Preview</div>
      <div className="mx-auto max-w-[280px] rounded-lg bg-[#005c4b] px-3 py-2.5 text-[13px] leading-snug text-white shadow-lg">
        {form.headerKind === 'IMAGE' && (
          <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-black/25 text-[11px] text-white/70">
            <Image className="mr-1 h-4 w-4" /> Image header
          </div>
        )}
        {form.headerKind === 'VIDEO' && (
          <div className="mb-2 flex h-28 items-center justify-center rounded-md bg-black/25 text-[11px] text-white/70">
            <Video className="mr-1 h-4 w-4" /> Video header
          </div>
        )}
        {form.headerKind === 'DOCUMENT' && (
          <div className="mb-2 flex h-12 items-center justify-center rounded-md bg-black/25 text-[11px] text-white/70">
            <File className="mr-1 h-4 w-4" /> Document
          </div>
        )}
        {form.headerKind === 'TEXT' && header && <div className="mb-1 font-semibold">{header}</div>}
        <div className="whitespace-pre-wrap">{body || 'Your body text…'}</div>
        {form.footer.trim() && <div className="mt-2 text-[11px] text-white/70">{form.footer}</div>}
        {form.buttons.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-white/15 pt-2">
            {form.buttons.map((b, i) => (
              <div key={i} className="rounded bg-white/10 py-1 text-center text-[11px] font-medium text-emerald-100">
                {b.text || 'Button'}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-gray-500">WhatsApp-style bubble (approximate)</p>
    </div>
  );
}

export function TemplateBuilderModal({
  open,
  onOpenChange,
  mode,
  template,
  duplicateFrom,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'create' | 'edit';
  template?: WhatsAppTemplateListItem | null;
  duplicateFrom?: WhatsAppTemplateListItem | null;
  onSuccess: (opts: { mode: 'create' | 'edit' }) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BuilderFormState>(defaultForm);
  const [examples, setExamples] = useState<Record<string, string>>({});
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setForm(defaultForm());
      setExamples({});
      setFieldErr({});
      setSubmitting(false);
      return;
    }
    if (mode === 'edit' && template) {
      setForm(listItemToBuilderState(template));
    } else if (duplicateFrom) {
      const base = listItemToBuilderState(duplicateFrom);
      const dupName = normalizeTemplateName(`${base.name}_copy`.slice(0, 512));
      setForm({ ...base, name: dupName });
    } else {
      setForm(defaultForm());
    }
    setExamples({});
    setStep(1);
  }, [open, mode, template, duplicateFrom]);

  const slots = useMemo(
    () => collectVariableSlots(form.body, form.headerKind === 'TEXT' ? form.headerText : ''),
    [form.body, form.headerText, form.headerKind],
  );

  const isSubmitInvalid = useMemo(() => {
    const e1 = validateStep1(form);
    const e2 = validateStep2(form);
    const e3 = validateStep3(form, examples);
    return Object.keys({ ...e1, ...e2, ...e3 }).length > 0;
  }, [form, examples]);

  function patchForm(p: Partial<BuilderFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function insertVar(n: number) {
    const token = `{{${n}}}`;
    setForm((f) => ({ ...f, body: `${f.body}${token}` }));
  }

  function addButton(type: TemplateButtonInput['type']) {
    setForm((f) => {
      if (f.buttons.length >= 3) return f;
      return { ...f, buttons: [...f.buttons, { type, text: '', value: '' }] };
    });
  }

  function updateButton(i: number, patch: Partial<TemplateButtonInput>) {
    setForm((f) => ({
      ...f,
      buttons: f.buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)),
    }));
  }

  function removeButton(i: number) {
    setForm((f) => ({ ...f, buttons: f.buttons.filter((_, idx) => idx !== i) }));
  }

  function runValidation(forStep: number): boolean {
    if (forStep === 1) {
      const e = validateStep1(form);
      setFieldErr(e);
      return Object.keys(e).length === 0;
    }
    if (forStep === 2) {
      const e = validateStep2(form);
      setFieldErr(e);
      return Object.keys(e).length === 0;
    }
    if (forStep === 3) {
      const e = validateStep3(form, examples);
      setFieldErr(e);
      return Object.keys(e).length === 0;
    }
    return true;
  }

  function next() {
    if (!runValidation(step)) {
      toast.error('Fix the highlighted fields to continue');
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function back() {
    setFieldErr({});
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit() {
    if (!runValidation(1) || !runValidation(2) || !runValidation(3)) {
      toast.error('Fix validation errors before submitting');
      return;
    }
    const payload = buildCreatePayload(form, examples);
    setSubmitting(true);
    const tid = toast.loading(mode === 'edit' ? 'Saving template…' : 'Submitting template…');
    try {
      if (mode === 'edit' && template?.id) {
        await whatsappManagerApi.editTemplate(template.id, payload);
        toast.success('Changes saved — status may show as pending until Meta syncs', { id: tid });
      } else {
        await whatsappManagerApi.createTemplate(payload);
        toast.success('Template submitted for review', { id: tid });
      }
      onSuccess({ mode });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      toast.error(msg, { id: tid });
    } finally {
      setSubmitting(false);
    }
  }

  const headerKinds: { value: HeaderKind; label: string; icon?: typeof FileText }[] = [
    { value: 'none', label: 'None' },
    { value: 'TEXT', label: 'Text', icon: FileText },
    { value: 'IMAGE', label: 'Image', icon: Image },
    { value: 'VIDEO', label: 'Video', icon: Video },
    { value: 'DOCUMENT', label: 'Document', icon: File },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(92vh,880px)] w-full max-w-3xl border border-white/10 bg-[#161B22] p-0 text-gray-100 lg:max-w-4xl',
          '[&>button]:text-gray-400 [&>button]:hover:bg-white/10 [&>button]:hover:text-white',
        )}
      >
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="border-b border-white/10 p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg text-white">
                {mode === 'edit' ? 'Edit template' : duplicateFrom ? 'Duplicate template' : 'Create template'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Build a WhatsApp message template. Meta reviews all submissions before approval.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    step >= s ? 'bg-[#00D4AA]' : 'bg-white/10',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="grid max-h-[min(70vh,640px)] grid-cols-1 gap-0 overflow-hidden lg:grid-cols-12">
            <div className="max-h-[min(70vh,640px)] overflow-y-auto px-5 py-4 sm:px-6 lg:col-span-7">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="t1"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Name</label>
                      <Input
                        value={form.name}
                        onChange={(e) => patchForm({ name: normalizeTemplateName(e.target.value) })}
                        placeholder="order_confirmation"
                        disabled={mode === 'edit'}
                        className="border-white/10 bg-[#0D1117] font-mono text-sm text-white"
                      />
                      {fieldErr.name && <p className="mt-1 text-xs text-red-400">{fieldErr.name}</p>}
                      <p className="mt-1 text-[11px] text-gray-500">Lowercase, numbers, underscores only.</p>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Category</label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => patchForm({ category: c })}
                            className={cn(
                              'rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition',
                              form.category === c
                                ? 'border-[#00D4AA]/60 bg-[#00D4AA]/15 text-[#00D4AA]'
                                : 'border-white/10 text-gray-300 hover:border-white/20',
                            )}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                      {fieldErr.category && <p className="mt-1 text-xs text-red-400">{fieldErr.category}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Language</label>
                      <select
                        value={form.language}
                        onChange={(e) => patchForm({ language: e.target.value })}
                        aria-label="Template language"
                        title="Template language"
                        className="h-10 w-full rounded-lg border border-white/10 bg-[#0D1117] px-3 text-sm text-white"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                      {fieldErr.language && <p className="mt-1 text-xs text-red-400">{fieldErr.language}</p>}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="t2"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="space-y-4"
                  >
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Header</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {headerKinds.map((h) => (
                          <button
                            key={h.value}
                            type="button"
                            onClick={() => patchForm({ headerKind: h.value, headerText: h.value === 'TEXT' ? form.headerText : '' })}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                              form.headerKind === h.value
                                ? 'border-[#00D4AA]/60 bg-[#00D4AA]/10 text-white'
                                : 'border-white/10 text-gray-300 hover:border-white/20',
                            )}
                          >
                            {h.icon && <h.icon className="h-3.5 w-3.5" />}
                            {h.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {form.headerKind === 'TEXT' && (
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Header text</label>
                        <Input
                          value={form.headerText}
                          onChange={(e) => patchForm({ headerText: e.target.value })}
                          className="border-white/10 bg-[#0D1117] text-white"
                        />
                        {fieldErr.headerText && <p className="mt-1 text-xs text-red-400">{fieldErr.headerText}</p>}
                      </div>
                    )}
                    <div>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Body (required)</label>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => insertVar(n)}
                              className="rounded border border-white/10 px-2 py-0.5 font-mono text-[11px] text-[#00D4AA] hover:bg-white/5"
                            >
                              {`{{${n}}}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={form.body}
                        onChange={(e) => patchForm({ body: e.target.value })}
                        rows={6}
                        className={cn(
                          'w-full resize-y rounded-lg border bg-[#0D1117] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00D4AA]/40',
                          fieldErr.body ? 'border-red-500/50' : 'border-white/10',
                        )}
                        placeholder={'Hello {{1}}, your order {{2}} is ready.'}
                      />
                      {fieldErr.body && <p className="mt-1 text-xs text-red-400">{fieldErr.body}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Footer (optional)</label>
                      <Input
                        value={form.footer}
                        onChange={(e) => patchForm({ footer: e.target.value.slice(0, 60) })}
                        className="border-white/10 bg-[#0D1117] text-white"
                      />
                      <p className="mt-0.5 text-right text-[10px] text-gray-500">{form.footer.length}/60</p>
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Buttons (max 3)</span>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-white/15 bg-transparent text-xs text-gray-200"
                            onClick={() => addButton('QUICK_REPLY')}
                            disabled={form.buttons.length >= 3}
                          >
                            <Plus className="h-3 w-3" /> Quick reply
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-white/15 bg-transparent text-xs text-gray-200"
                            onClick={() => addButton('URL')}
                            disabled={form.buttons.length >= 3}
                          >
                            <Plus className="h-3 w-3" /> URL
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-white/15 bg-transparent text-xs text-gray-200"
                            onClick={() => addButton('PHONE_NUMBER')}
                            disabled={form.buttons.length >= 3}
                          >
                            <Plus className="h-3 w-3" /> Phone
                          </Button>
                        </div>
                      </div>
                      {fieldErr.buttons && <p className="mb-2 text-xs text-red-400">{fieldErr.buttons}</p>}
                      <div className="space-y-2">
                        {form.buttons.map((b, i) => (
                          <div key={i} className="rounded-xl border border-white/10 bg-[#0D1117] p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase text-gray-500">{b.type}</span>
                              <button
                                type="button"
                                onClick={() => removeButton(i)}
                                className="text-gray-500 hover:text-red-400"
                                aria-label="Remove button"
                                title="Remove button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <Input
                              value={b.text}
                              onChange={(e) => updateButton(i, { text: e.target.value })}
                              placeholder="Button label"
                              className="border-white/10 bg-[#161B22] text-sm text-white"
                            />
                            {fieldErr[`btn_${i}_text`] && <p className="mt-1 text-xs text-red-400">{fieldErr[`btn_${i}_text`]}</p>}
                            {(b.type === 'URL' || b.type === 'PHONE_NUMBER') && (
                              <>
                                <Input
                                  value={b.value || ''}
                                  onChange={(e) => updateButton(i, { value: e.target.value })}
                                  placeholder={b.type === 'URL' ? 'https://example.com' : '+15551234567'}
                                  className="mt-2 border-white/10 bg-[#161B22] text-sm text-white"
                                />
                                {fieldErr[`btn_${i}_val`] && <p className="mt-1 text-xs text-red-400">{fieldErr[`btn_${i}_val`]}</p>}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="t3"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-gray-400 lg:hidden">
                      Preview is below. Provide example values for each variable in your header and body.
                    </p>
                    <p className="hidden text-sm text-gray-400 lg:block">
                      Provide example values for each variable — preview updates on the right.
                    </p>
                    {slots.length === 0 ? (
                      <p className="text-sm text-gray-500">No variables in header/body — you can continue.</p>
                    ) : (
                      slots.map((n) => (
                        <div key={n}>
                          <label className="mb-1 block text-xs text-gray-500">{`Example for {{${n}}}`}</label>
                          <Input
                            value={examples[String(n)] || ''}
                            onChange={(e) => setExamples((ex) => ({ ...ex, [String(n)]: e.target.value }))}
                            className="border-white/10 bg-[#0D1117] text-white"
                          />
                          {fieldErr[`var_${n}`] && <p className="mt-1 text-xs text-red-400">{fieldErr[`var_${n}`]}</p>}
                        </div>
                      ))
                    )}
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="t4"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="space-y-3 text-sm text-gray-300"
                  >
                    <p>Ready to {mode === 'edit' ? 'save changes to' : 'submit'} template:</p>
                    <ul className="list-inside list-disc space-y-1 text-gray-400">
                      <li>
                        <span className="font-medium text-white">{form.name}</span> · {form.category} · {form.language}
                      </li>
                      <li>Components include a BODY block and optional header, footer, and buttons.</li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden border-l border-white/10 bg-[#0D1117]/80 p-4 lg:col-span-5 lg:block lg:overflow-y-auto">
              {(step === 2 || step === 3 || step === 4) && <ChatPreview form={form} examples={examples} />}
              {step === 1 && (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-gray-500">
                  Preview appears once you add a body in step 2.
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-4 lg:col-span-12 lg:hidden">
              {step >= 2 && <ChatPreview form={form} examples={examples} />}
            </div>
          </div>

          <div className="flex justify-between gap-3 border-t border-white/10 p-4 sm:p-5">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-transparent text-gray-200 hover:bg-white/10"
              onClick={step === 1 ? () => onOpenChange(false) : back}
              disabled={submitting}
            >
              <ChevronLeft className="h-4 w-4" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={next} className="bg-[#00D4AA] text-[#0D1117] hover:bg-[#1D9E75] hover:text-white">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={submit}
                disabled={submitting || isSubmitInvalid}
                className="bg-[#00D4AA] text-[#0D1117] hover:bg-[#1D9E75] hover:text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Working…
                  </>
                ) : mode === 'edit' ? (
                  'Save changes'
                ) : (
                  'Submit template'
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

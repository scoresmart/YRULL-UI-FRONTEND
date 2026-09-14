import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Loader2, AlertTriangle, FileText, Image, Video, File } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { TemplateBubble } from '../../components/templates/TemplateBubble';
import { templatesApi } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn } from '../../lib/utils';
import { TEMPLATE_CATEGORIES, TEMPLATE_LANGUAGES, templateToDraft, buildComponents } from '../../lib/templates';
import toast from 'react-hot-toast';

const HEADER_TYPES = [
  { value: '', label: 'None' },
  { value: 'TEXT', label: 'Text', icon: FileText },
  { value: 'IMAGE', label: 'Image', icon: Image },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'DOCUMENT', label: 'Document', icon: File },
];

const BUTTON_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'quick_reply', label: 'Quick Reply' },
  { value: 'cta', label: 'Call to Action' },
];

/** Reverse of the composer's button model, so a duplicated template lands on the right tab. */
function buttonTypeFor(buttons) {
  if (!buttons?.length) return 'none';
  return buttons[0].type === 'QUICK_REPLY' ? 'quick_reply' : 'cta';
}

export function WhatsAppTemplateComposerPage() {
  useDocumentTitle('New template');
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Arrives when the user duplicates an existing template from the list.
  const [draft] = useState(() => (location.state?.duplicate ? templateToDraft(location.state.duplicate) : null));

  const [name, setName] = useState(draft?.name ?? '');
  const [category, setCategory] = useState(draft?.category ?? 'MARKETING');
  const [language, setLanguage] = useState(draft?.language ?? 'en');
  const [headerType, setHeaderType] = useState(draft?.headerType ?? '');
  const [header, setHeader] = useState(draft?.header ?? '');
  const [body, setBody] = useState(draft?.body ?? '');
  const [footer, setFooter] = useState(draft?.footer ?? '');
  const [buttonType, setButtonType] = useState(buttonTypeFor(draft?.buttons));
  const [buttons, setButtons] = useState(draft?.buttons ?? []);

  const nameValid = /^[a-z0-9_]+$/.test(name) && name.length > 0;
  const bodyValid = body.trim().length > 0;

  const createMut = useMutation({
    mutationFn: (data) => templatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] });
      toast.success('Template submitted for approval');
      navigate('/templates');
    },
    onError: (e) => toast.error(e.message || 'Failed to submit template'),
  });

  function addButton() {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type: buttonType === 'quick_reply' ? 'QUICK_REPLY' : 'URL', text: '', value: '' }]);
  }

  function updateButton(i, field, val) {
    setButtons(buttons.map((b, idx) => (idx === i ? { ...b, [field]: val } : b)));
  }

  function removeButton(i) {
    setButtons(buttons.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!nameValid || !bodyValid) return;
    createMut.mutate({
      name,
      category,
      language,
      components: buildComponents({ headerType, header, body, footer, buttons }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/templates">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Templates
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">{draft ? 'Duplicate template' : 'New template'}</h1>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <div className="flex items-start gap-2 text-sm text-yellow-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
          Templates are reviewed by Meta. Approval typically takes 24–48 hours.
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-5 lg:col-span-7">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Template name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. weekly_promo"
                className={cn(!name ? '' : nameValid ? 'border-green-300' : 'border-red-300')}
              />
              <p className="mt-1 text-xs text-gray-400">Lowercase letters, numbers, and underscores only.</p>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      category === c
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {TEMPLATE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Header */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Header (optional)</label>
              <div className="flex flex-wrap gap-2">
                {HEADER_TYPES.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => {
                      setHeaderType(h.value);
                      setHeader('');
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      headerType === h.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              {headerType === 'TEXT' && (
                <Input
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  placeholder="Header text"
                  className="mt-2"
                />
              )}
            </div>

            {/* Body */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Body (required)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm focus:ring-1',
                  bodyValid
                    ? 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                    : 'border-red-300 focus:border-red-500 focus:ring-red-500',
                )}
                placeholder={'Hello {{1}}, thank you for contacting us!\n\nUse {{1}}, {{2}} for variables.'}
              />
              <p className="mt-1 text-xs text-gray-400">
                Use {'{{1}}'}, {'{{2}}'}, etc. for dynamic variables.
              </p>
            </div>

            {/* Footer */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Footer (optional)</label>
              <Input
                value={footer}
                onChange={(e) => setFooter(e.target.value.slice(0, 60))}
                placeholder="e.g. Reply STOP to opt out"
              />
              <p className="mt-1 text-right text-xs text-gray-400">{footer.length}/60</p>
            </div>

            {/* Buttons */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Buttons (optional)</label>
              <div className="mb-3 flex flex-wrap gap-2">
                {BUTTON_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => {
                      setButtonType(bt.value);
                      setButtons([]);
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      buttonType === bt.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {bt.label}
                  </button>
                ))}
              </div>
              {buttonType !== 'none' && (
                <div className="space-y-3">
                  {buttons.map((btn, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-gray-200 p-3">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={btn.text}
                          onChange={(e) => updateButton(i, 'text', e.target.value)}
                          placeholder="Button text"
                          className="text-sm"
                        />
                        {buttonType === 'cta' && (
                          <Input
                            value={btn.value}
                            onChange={(e) => updateButton(i, 'value', e.target.value)}
                            placeholder={btn.type === 'URL' ? 'https://...' : '+61...'}
                            className="text-sm"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeButton(i)}
                        className="p-1 text-red-400 hover:text-red-600"
                        aria-label={`Remove button ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {buttons.length < 3 && (
                    <Button type="button" variant="outline" size="sm" onClick={addButton} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Add button
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button type="submit" disabled={!nameValid || !bodyValid || createMut.isPending} className="gap-1.5">
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit for approval
              </Button>
              <Link to="/templates">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <Card className="sticky top-6 p-4">
              <div className="mb-2 text-xs font-medium text-gray-500">WhatsApp Preview</div>
              <TemplateBubble
                header={header}
                headerType={headerType}
                body={body}
                footer={footer}
                buttons={buttons}
              />
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

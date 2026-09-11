import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ApiErrorState } from '../../components/ApiErrorState';
import { TemplateBubble } from '../../components/templates/TemplateBubble';
import { templatesApi } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn, formatRelativeTime } from '../../lib/utils';
import { languageLabel, normalizeTemplate } from '../../lib/templates';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  APPROVED: { variant: 'success', icon: CheckCircle2, label: 'Approved' },
  PENDING: { variant: 'warning', icon: Clock, label: 'Pending' },
  REJECTED: { variant: 'danger', icon: XCircle, label: 'Rejected' },
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REJECTED', label: 'Rejected' },
];

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" /> {config.label}
    </Badge>
  );
}

function StatTile({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-gray-900',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold', tones[tone])}>{value}</div>
    </Card>
  );
}

/** Slide-over showing the full template with its metadata and actions. */
function TemplateDetailPanel({ template, onClose, onDuplicate, onSendTest, onDelete }) {
  const canSendTest = template.status === 'APPROVED';
  const canDelete = template.status !== 'APPROVED';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">{template.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={template.status} />
              <Badge variant="muted">{template.category || 'UNCATEGORIZED'}</Badge>
              <Badge variant="secondary">{languageLabel(template.language)}</Badge>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {template.status === 'REJECTED' && template.rejectionReason && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <div className="font-medium">Rejected by Meta</div>
                <div className="mt-0.5 text-xs">{template.rejectionReason}</div>
              </div>
            </div>
          )}

          <TemplateBubble
            header={template.header}
            headerType={template.headerType}
            body={template.body}
            footer={template.footer}
            buttons={template.buttons}
          />

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Variables</dt>
              <dd className="font-medium text-gray-900">{template.paramCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Buttons</dt>
              <dd className="font-medium text-gray-900">{template.buttons.length}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Created</dt>
              <dd className="font-medium text-gray-900">
                {template.createdAt ? formatRelativeTime(template.createdAt) : '—'}
              </dd>
            </div>
          </dl>

          <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            Approved templates can't be edited here — Meta locks their content once reviewed. Duplicate this template to
            start a new version, then submit it for approval.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-100 p-5">
          <Button variant="outline" className="gap-1.5" onClick={() => onDuplicate(template)}>
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          {canSendTest && (
            <Button className="gap-1.5" onClick={() => onSendTest(template)}>
              <Send className="h-4 w-4" /> Send test
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              className="ml-auto gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onDelete(template)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}

/** Dialog that collects a recipient plus one value per {{n}} variable. */
function SendTestDialog({ template, isPending, onCancel, onSend }) {
  const [number, setNumber] = useState('');
  const [params, setParams] = useState([]);

  const paramsFilled =
    template.paramCount === 0 ||
    Array.from({ length: template.paramCount }, (_, i) => params[i]).every((v) => (v ?? '').trim().length > 0);
  const canSend = number.trim().length > 0 && paramsFilled && !isPending;

  function handleSend() {
    if (!template.language) {
      toast.error('Template is missing a language; cannot send.');
      return;
    }
    const components =
      template.paramCount > 0
        ? [
            {
              type: 'body',
              parameters: Array.from({ length: template.paramCount }, (_, i) => ({
                type: 'text',
                text: (params[i] ?? '').trim(),
              })),
            },
          ]
        : [];
    onSend({ to: number.trim(), template_name: template.name, language: template.language, components });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900">Send "{template.name}"</h2>
            <p className="mt-1 text-sm text-gray-500">
              {languageLabel(template.language)}
              {template.paramCount > 0
                ? ` · ${template.paramCount} variable${template.paramCount > 1 ? 's' : ''}`
                : ''}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <TemplateBubble
          className="mt-3 p-3"
          header={template.header}
          headerType={template.headerType}
          body={template.body}
          footer={template.footer}
          buttons={template.buttons}
          sample={params}
        />

        <div className="mt-4 space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Recipient number</label>
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="61451271549 or 0451271549"
              autoFocus
            />
          </div>

          {Array.from({ length: template.paramCount }, (_, i) => (
            <div key={i} className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{`Variable {{${i + 1}}}`}</label>
              <Input
                value={params[i] ?? ''}
                onChange={(e) => {
                  const next = [...params];
                  next[i] = e.target.value;
                  setParams(next);
                }}
                placeholder={`Value for {{${i + 1}}}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!canSend} onClick={handleSend}>
            {isPending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppTemplatesPage() {
  useDocumentTitle('Templates');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [detailId, setDetailId] = useState(null);
  const [sendTarget, setSendTarget] = useState(null);

  const templatesQ = useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: () => templatesApi.list(),
  });

  const templates = useMemo(() => (templatesQ.data ?? []).map(normalizeTemplate), [templatesQ.data]);

  const deleteMut = useMutation({
    mutationFn: (id) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] });
      setDetailId(null);
      toast.success('Template deleted');
    },
    onError: (e) => toast.error(e.message || 'Failed to delete template'),
  });

  const sendMut = useMutation({
    mutationFn: (vars) => templatesApi.sendTest(vars),
    onSuccess: (_data, vars) => {
      toast.success(`Sent "${vars.template_name}" to ${vars.to}`);
      setSendTarget(null);
    },
    onError: (e) => toast.error(e.message || 'Failed to send template'),
  });

  const counts = useMemo(
    () => ({
      all: templates.length,
      APPROVED: templates.filter((t) => t.status === 'APPROVED').length,
      PENDING: templates.filter((t) => t.status === 'PENDING').length,
      REJECTED: templates.filter((t) => t.status === 'REJECTED').length,
    }),
    [templates],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (tab !== 'all' && t.status !== tab) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q);
    });
  }, [templates, search, tab]);

  const detail = detailId ? templates.find((t) => t.id === detailId) : null;

  function handleDuplicate(template) {
    navigate('/templates/new', { state: { duplicate: template } });
  }

  function handleDelete(template) {
    if (window.confirm(`Delete template "${template.name}"? This can't be undone.`)) {
      deleteMut.mutate(template.id);
    }
  }

  if (templatesQ.error) {
    return (
      <ApiErrorState
        title="Failed to load templates"
        error={templatesQ.error}
        onRetry={() => templatesQ.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage the WhatsApp message templates used by broadcasts and automations
          </p>
        </div>
        <Link to="/templates/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> New template
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total" value={counts.all} />
        <StatTile label="Approved" value={counts.APPROVED} tone="success" />
        <StatTile label="Pending" value={counts.PENDING} tone="warning" />
        <StatTile label="Rejected" value={counts.REJECTED} tone="danger" />
      </div>

      <div className="flex flex-col gap-3 border-b border-gray-200 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-gray-400">{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className="pb-2 sm:ml-auto">
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              placeholder="Search templates..."
            />
          </div>
        </div>
      </div>

      {templatesQ.isLoading ? (
        <Card className="p-0">
          <div className="divide-y divide-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            templates.length === 0
              ? 'No templates yet'
              : search
                ? 'No templates match your search'
                : `No ${tab.toLowerCase()} templates`
          }
          description={
            templates.length === 0
              ? 'WhatsApp requires Meta-approved templates to start conversations. Create your first one to get started.'
              : search
                ? 'Try a different search term.'
                : 'Switch tabs to see templates in another state.'
          }
          actionLabel={templates.length === 0 ? 'Create template' : undefined}
          actionHref={templates.length === 0 ? '/templates/new' : undefined}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => setDetailId(t.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{t.name}</div>
                      {t.body && <div className="mt-0.5 max-w-xs truncate text-xs text-gray-400">{t.body}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{languageLabel(t.language)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                      {t.status === 'REJECTED' && t.rejectionReason && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                          <AlertTriangle className="h-3 w-3" /> {t.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {t.createdAt ? formatRelativeTime(t.createdAt) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          onClick={() => setDetailId(t.id)}
                          aria-label={`Preview ${t.name}`}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          onClick={() => handleDuplicate(t)}
                          aria-label={`Duplicate ${t.name}`}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {t.status === 'APPROVED' && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-green-500 hover:bg-green-50 hover:text-green-700"
                            onClick={() => setSendTarget(t)}
                            aria-label={`Send test of ${t.name}`}
                            title="Send test"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {t.status !== 'APPROVED' && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleDelete(t)}
                            aria-label={`Delete ${t.name}`}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {detail && (
        <TemplateDetailPanel
          template={detail}
          onClose={() => setDetailId(null)}
          onDuplicate={handleDuplicate}
          onSendTest={setSendTarget}
          onDelete={handleDelete}
        />
      )}

      {sendTarget && (
        <SendTestDialog
          key={sendTarget.id}
          template={sendTarget}
          isPending={sendMut.isPending}
          onCancel={() => setSendTarget(null)}
          onSend={(vars) => sendMut.mutate(vars)}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft, FileText, Search, CheckCircle2, Clock, XCircle, AlertTriangle, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { templatesApi } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn, formatRelativeTime } from '../../lib/utils';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  APPROVED: { variant: 'success', icon: CheckCircle2, label: 'Approved' },
  PENDING: { variant: 'default', icon: Clock, label: 'Pending' },
  REJECTED: { variant: 'danger', icon: XCircle, label: 'Rejected' },
};

export function WhatsAppTemplatesPage() {
  useDocumentTitle('WhatsApp Templates');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sendTarget, setSendTarget] = useState(null); // template object
  const [sendNumber, setSendNumber] = useState('');

  const templatesQ = useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: () => templatesApi.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] });
      toast.success('Template deleted');
    },
    onError: () => toast.error('Failed to delete template'),
  });

  const sendMut = useMutation({
    mutationFn: ({ to, template_name, language }) =>
      templatesApi.sendTest({ to, template_name, language }),
    onSuccess: (_data, vars) => {
      toast.success(`Sent "${vars.template_name}" to ${vars.to}`);
      setSendTarget(null);
      setSendNumber('');
    },
    onError: (e) => toast.error(e.message || 'Failed to send template'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = templatesQ.data ?? [];
    if (!q) return list;
    return list.filter((t) => t.name.toLowerCase().includes(q));
  }, [templatesQ.data, search]);

  if (templatesQ.error) {
    return <ErrorState title="Failed to load templates" onRetry={() => templatesQ.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/broadcasts">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Broadcasts
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Templates</h1>
            <p className="text-sm text-gray-500">Manage message templates for WhatsApp broadcasts</p>
          </div>
        </div>
        <Link to="/broadcasts/templates/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" /> Submit new template
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          placeholder="Search templates..."
        />
      </div>

      {templatesQ.isLoading ? (
        <Card>
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? 'No templates match your search' : 'No WhatsApp templates yet'}
          description={
            search
              ? 'Try a different search term.'
              : 'WhatsApp requires approved message templates for broadcasts. Create your first template to get started.'
          }
          actionLabel={search ? undefined : 'Create template'}
          actionHref={search ? undefined : '/broadcasts/templates/new'}
        />
      ) : (
        <Card>
          <div className="overflow-hidden rounded-xl">
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
                {filtered.map((t) => {
                  const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.PENDING;
                  const SIcon = sc.icon;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{t.name}</div>
                        {t.body && <div className="mt-0.5 max-w-xs truncate text-xs text-gray-400">{t.body}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{t.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{t.language}</td>
                      <td className="px-4 py-3">
                        <Badge variant={sc.variant} className="gap-1">
                          <SIcon className="h-3 w-3" /> {sc.label}
                        </Badge>
                        {t.status === 'REJECTED' && t.rejection_reason && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                            <AlertTriangle className="h-3 w-3" /> {t.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {t.created_at ? formatRelativeTime(t.created_at) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {t.status === 'APPROVED' && (
                            <button
                              type="button"
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                              onClick={() => setSendTarget(t)}
                              aria-label="Send test"
                            >
                              <Send className="h-3.5 w-3.5" /> Send test
                            </button>
                          )}
                          {(t.status === 'PENDING' || t.status === 'REJECTED') && (
                            <button
                              type="button"
                              className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => {
                                if (window.confirm('Delete this template?')) deleteMut.mutate(t.id);
                              }}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {sendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Send "{sendTarget.name}"</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Sends the {sendTarget.language || 'en_US'} template to one number.
                </p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => { setSendTarget(null); setSendNumber(''); }}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-gray-700">Recipient number</label>
              <Input
                value={sendNumber}
                onChange={(e) => setSendNumber(e.target.value)}
                placeholder="61451271549 or 0451271549"
                autoFocus
              />
              <p className="text-xs text-gray-400">Include country code, no + or spaces.</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => { setSendTarget(null); setSendNumber(''); }}
              >
                Cancel
              </Button>
              <Button
                disabled={!sendNumber.trim() || sendMut.isPending}
                onClick={() => sendMut.mutate({
                  to: sendNumber.trim(),
                  template_name: sendTarget.name,
                  language: sendTarget.language || 'en_US',
                })}
              >
                {sendMut.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, ArrowLeft, FileText, Search,
  CheckCircle2, Clock, XCircle, AlertTriangle,
} from 'lucide-react';
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

  const templatesQ = useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: () => templatesApi.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => templatesApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] }); toast.success('Template deleted'); },
    onError: () => toast.error('Failed to delete template'),
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
            <Button variant="ghost" size="sm" className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Broadcasts</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">WhatsApp Templates</h1>
            <p className="text-sm text-gray-500">Manage message templates for WhatsApp broadcasts</p>
          </div>
        </div>
        <Link to="/broadcasts/templates/new">
          <Button className="gap-1.5"><Plus className="h-4 w-4" /> Submit new template</Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search templates..." />
      </div>

      {templatesQ.isLoading ? (
        <Card>
          <div className="space-y-1">{[1,2,3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}</div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search ? 'No templates match your search' : 'No WhatsApp templates yet'}
          description={search ? 'Try a different search term.' : 'WhatsApp requires approved message templates for broadcasts. Create your first template to get started.'}
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
                      <td className="px-4 py-3 text-sm text-gray-500">{t.created_at ? formatRelativeTime(t.created_at) : '—'}</td>
                      <td className="px-4 py-3">
                        {(t.status === 'PENDING' || t.status === 'REJECTED') && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"
                            onClick={() => { if (window.confirm('Delete this template?')) deleteMut.mutate(t.id); }}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

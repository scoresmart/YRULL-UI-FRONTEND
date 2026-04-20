import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  MoreHorizontal,
  Megaphone,
  Copy,
  Trash2,
  XCircle,
  MessageCircle,
  Instagram,
  Facebook,
  Search,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { broadcastsApi } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn, formatRelativeTime } from '../../lib/utils';
import toast from 'react-hot-toast';

const TABS = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'sent', label: 'Sent' },
  { key: 'cancelled', label: 'Cancelled' },
];

const CHANNEL_ICON = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
};

const STATUS_VARIANT = {
  draft: 'muted',
  scheduled: 'default',
  sending: 'default',
  sent: 'success',
  cancelled: 'danger',
  failed: 'danger',
};

function ActionMenu({ broadcast, onDuplicate, onDelete, onCancel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
                setOpen(false);
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            {broadcast.status === 'scheduled' && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                  setOpen(false);
                }}
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setOpen(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function BroadcastsPage() {
  useDocumentTitle('Broadcasts');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('');
  const [search, setSearch] = useState('');

  const broadcastsQ = useQuery({
    queryKey: ['broadcasts', tab],
    queryFn: () => broadcastsApi.list({ status: tab || undefined }),
  });

  const cancelMut = useMutation({
    mutationFn: (id) => broadcastsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      toast.success('Broadcast cancelled');
    },
    onError: () => toast.error('Failed to cancel broadcast'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => broadcastsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
      toast.success('Broadcast deleted');
    },
    onError: () => toast.error('Failed to delete broadcast'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = broadcastsQ.data ?? [];
    if (!q) return list;
    return list.filter((b) => (b.name ?? '').toLowerCase().includes(q));
  }, [broadcastsQ.data, search]);

  function handleDelete(b) {
    if (!window.confirm('This will remove all delivery data. Continue?')) return;
    deleteMut.mutate(b.id);
  }

  function handleCancel(b) {
    if (!window.confirm('Cancel this scheduled broadcast?')) return;
    cancelMut.mutate(b.id);
  }

  function handleDuplicate(b) {
    navigate('/broadcasts/new', { state: { duplicate: b } });
  }

  if (broadcastsQ.error) {
    return <ErrorState title="Failed to load broadcasts" onRetry={() => broadcastsQ.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Broadcasts</h1>
          <p className="mt-1 text-sm text-gray-500">Send messages to lists of contacts across channels</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/broadcasts/templates">
            <Button variant="outline" className="gap-1.5">
              <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Templates</span>
            </Button>
          </Link>
          <Link to="/broadcasts/new">
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" /> New broadcast
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-gray-200">
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
          </button>
        ))}
        <div className="ml-auto pb-2">
          <div className="relative w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              placeholder="Search broadcasts..."
            />
          </div>
        </div>
      </div>

      {broadcastsQ.isLoading ? (
        <Card>
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={search ? 'No broadcasts match your search' : 'Create your first broadcast to reach your audience'}
          description={
            search
              ? 'Try a different search term.'
              : 'Broadcasts let you send messages to groups of contacts on WhatsApp, Instagram, or Facebook Messenger.'
          }
          actionLabel={search ? undefined : 'New broadcast'}
          actionHref={search ? undefined : '/broadcasts/new'}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-gray-50/50">
                <tr className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-3 sm:px-4">Name</th>
                  <th className="px-3 py-3 sm:px-4">Channel</th>
                  <th className="px-3 py-3 sm:px-4">Audience</th>
                  <th className="hidden px-4 py-3 md:table-cell">Scheduled</th>
                  <th className="px-3 py-3 sm:px-4">Sent</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Delivered</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Read</th>
                  <th className="px-3 py-3 sm:px-4">Status</th>
                  <th className="px-3 py-3 sm:px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((b) => {
                  const ChIcon = CHANNEL_ICON[b.channel] || MessageCircle;
                  return (
                    <tr
                      key={b.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => navigate(`/broadcasts/${b.id}`)}
                    >
                      <td className="px-3 py-3 sm:px-4">
                        <div className="text-sm font-medium text-gray-900">{b.name}</div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <ChIcon className="h-3.5 w-3.5" /> {b.channel}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 sm:px-4">
                        {(b.audience_size ?? 0).toLocaleString()}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-gray-500 md:table-cell">
                        {b.scheduled_at ? formatRelativeTime(b.scheduled_at) : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 sm:px-4">{b.sent_count ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-sm text-gray-600 lg:table-cell">
                        {b.delivered_count ?? '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-gray-600 lg:table-cell">{b.read_count ?? '—'}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <Badge variant={STATUS_VARIANT[b.status] || 'muted'}>{b.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ActionMenu
                          broadcast={b}
                          onDuplicate={() => handleDuplicate(b)}
                          onDelete={() => handleDelete(b)}
                          onCancel={() => handleCancel(b)}
                        />
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

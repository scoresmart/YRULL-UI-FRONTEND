import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Send, CheckCircle2, Eye, XCircle, AlertTriangle,
  Copy, Trash2, MessageCircle, Instagram, Facebook, Clock, Search,
  MailWarning, Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ErrorState';
import { broadcastsApi } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn, formatRelativeTime } from '../../lib/utils';
import toast from 'react-hot-toast';

const CHANNEL_ICON = { whatsapp: MessageCircle, instagram: Instagram, facebook: Facebook };
const STATUS_VARIANT = { draft: 'muted', scheduled: 'default', sending: 'default', sent: 'success', completed: 'success', cancelled: 'danger', failed: 'danger' };

function MetricCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color ?? 'bg-gray-100')}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-semibold text-gray-900">{value ?? '—'}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function OverviewTab({ broadcast }) {
  const total = broadcast.audience_size ?? 0;
  const sent = broadcast.sent_count ?? 0;
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;

  const timeline = [
    { label: 'Created', time: broadcast.created_at, done: true },
    { label: 'Scheduled', time: broadcast.scheduled_at, done: !!broadcast.scheduled_at },
    { label: 'Sending', time: broadcast.sent_at, done: broadcast.status === 'sending' || broadcast.status === 'sent' || broadcast.status === 'completed' },
    { label: 'Completed', time: broadcast.completed_at, done: broadcast.status === 'sent' || broadcast.status === 'completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Sent" value={broadcast.sent_count ?? 0} icon={Send} color="bg-blue-500" />
        <MetricCard label="Delivered" value={broadcast.delivered_count ?? 0} icon={CheckCircle2} color="bg-green-500" />
        <MetricCard label="Read" value={broadcast.read_count ?? 0} icon={Eye} color="bg-purple-500" />
        <MetricCard label="Failed" value={broadcast.failed_count ?? 0} icon={XCircle} color="bg-red-500" />
        <MetricCard label="Opted out" value={broadcast.opted_out_count ?? 0} icon={MailWarning} color="bg-yellow-500" />
      </div>

      {(broadcast.status === 'sending') && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Sending progress</span>
            <span className="text-gray-500">{sent.toLocaleString()} of {total.toLocaleString()} ({pct}%)</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold text-gray-900">Timeline</div>
        <div className="relative ml-3 border-l-2 border-gray-200 pl-6 space-y-5">
          {timeline.map((t) => (
            <div key={t.label} className="relative">
              <div className={cn(
                'absolute -left-[31px] h-3 w-3 rounded-full border-2',
                t.done ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white',
              )} />
              <div className="text-sm font-medium text-gray-800">{t.label}</div>
              <div className="text-xs text-gray-400">{t.time ? formatRelativeTime(t.time) : '—'}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RecipientsTab({ broadcast }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const recipients = broadcast.recipients ?? [];

  const filtered = useMemo(() => {
    let list = recipients;
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => (r.name ?? r.phone ?? '').toLowerCase().includes(q));
    return list;
  }, [recipients, statusFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search recipients..." />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="read">Read</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <Card>
        <div className="overflow-hidden rounded-xl">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr className="text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No recipients found</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id ?? i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.name ?? r.phone ?? 'Unknown'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === 'delivered' || r.status === 'read' ? 'success' : r.status === 'failed' ? 'danger' : 'muted'}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{r.timestamp ? formatRelativeTime(r.timestamp) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-red-500">{r.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MessageTab({ broadcast }) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-3 text-sm font-semibold text-gray-900">Message sent</div>
        {broadcast.channel === 'whatsapp' && broadcast.template_name && (
          <div className="mb-2 text-xs text-gray-400">Template: {broadcast.template_name}</div>
        )}
        <div className="rounded-xl bg-green-50 p-4 text-sm text-gray-800">
          {broadcast.message_body ?? broadcast.message?.text ?? '(No message content)'}
        </div>
        {broadcast.message?.variables && Object.keys(broadcast.message.variables).length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-500">Variables used</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.entries(broadcast.message.variables).map(([k, v]) => (
                <Badge key={k} variant="muted">{k} = {v}</Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export function BroadcastDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  const broadcastQ = useQuery({
    queryKey: ['broadcast', id],
    queryFn: () => broadcastsApi.get(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'sending' ? 5000 : false;
    },
  });

  useDocumentTitle(broadcastQ.data?.name ?? 'Broadcast Detail');

  const cancelMut = useMutation({
    mutationFn: () => broadcastsApi.cancel(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['broadcast', id] }); toast.success('Broadcast cancelled'); },
    onError: () => toast.error('Failed to cancel'),
  });

  const deleteMut = useMutation({
    mutationFn: () => broadcastsApi.delete(id),
    onSuccess: () => { navigate('/broadcasts'); toast.success('Broadcast deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  if (broadcastQ.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-5 gap-4">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (broadcastQ.error) {
    return <ErrorState title="Failed to load broadcast" onRetry={() => broadcastQ.refetch()} />;
  }

  const b = broadcastQ.data;
  const ChIcon = CHANNEL_ICON[b.channel] || MessageCircle;
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'recipients', label: 'Recipients' },
    { key: 'message', label: 'Message' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/broadcasts')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Broadcasts
          </Button>
          <div className="flex items-center gap-2">
            <ChIcon className="h-5 w-5 text-gray-500" />
            <h1 className="text-xl font-semibold text-gray-900">{b.name}</h1>
            <Badge variant={STATUS_VARIANT[b.status] || 'muted'}>{b.status}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {b.status === 'scheduled' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-yellow-700" disabled={cancelMut.isPending} onClick={() => { if (window.confirm('Cancel this scheduled broadcast?')) cancelMut.mutate(); }}>
              {cancelMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />} Cancel
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/broadcasts/new', { state: { duplicate: b } })}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-red-600" disabled={deleteMut.isPending} onClick={() => { if (window.confirm('Delete this broadcast and all delivery data?')) deleteMut.mutate(); }}>
            {deleteMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'border-b-2 px-4 pb-3 text-sm font-medium transition-colors',
              activeTab === t.key ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab broadcast={b} />}
      {activeTab === 'recipients' && <RecipientsTab broadcast={b} />}
      {activeTab === 'message' && <MessageTab broadcast={b} />}
    </div>
  );
}

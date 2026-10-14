import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, LifeBuoy, Loader2, Mail, Paperclip, RotateCcw, Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { supportTicketsApi } from '../../lib/supportTicketsApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { cn, formatRelativeTime, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/EmptyState';

const STATUS_TABS = {
  all: 'All',
  open: 'Open',
  waiting_student: 'Waiting on student',
  resolved: 'Resolved',
};

const STATUS_BADGE = {
  open: { label: 'Open', variant: 'warning' },
  waiting_student: { label: 'Waiting on student', variant: 'muted' },
  resolved: { label: 'Resolved', variant: 'success' },
};

// Messages carry inline attachment links as "text|https://…"; the LMS strips them the same way.
function cleanBody(body) {
  return (body || '').replace(/\|https?:\/\/\S+/g, '').trim();
}

function inlineLinks(body) {
  return [...(body || '').matchAll(/\|(https?:\/\/\S+)/g)].map((m) => m[1]);
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || { label: status, variant: 'default' };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function SupportTicketsPage() {
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const listQ = useQuery({
    queryKey: ['support-tickets', status, debouncedSearch],
    queryFn: () => supportTicketsApi.list({ status, search: debouncedSearch }),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    retry: (count, err) => err?.status !== 403 && err?.status !== 401 && count < 2,
  });

  const tickets = listQ.data?.tickets ?? [];
  const counts = listQ.data?.counts ?? {};

  if (listQ.error?.status === 403 || listQ.error?.status === 401) {
    return (
      <EmptyState
        icon={LifeBuoy}
        title="No access to LMS support tickets"
        description="Sign in with an email that is an admin on the ScoreSmart LMS portal to view and reply to tickets."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold text-gray-900">Support Tickets</div>
        <div className="mt-1 text-sm text-gray-500">
          Tickets raised by students on the ScoreSmart LMS portal. Replies here are emailed to the student and
          appear in their portal.
        </div>
      </div>

      <div className="grid min-h-[70vh] grid-cols-1 overflow-hidden rounded-xl border border-gray-200 bg-white lg:grid-cols-[380px_1fr]">
        {/* Ticket list */}
        <div className={cn('flex min-w-0 flex-col border-gray-200 lg:border-r', selectedId && 'hidden lg:flex')}>
          <div className="space-y-3 border-b border-gray-200 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket #, student, subject…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(STATUS_TABS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    status === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {label}
                  {counts[key] != null && <span className="ml-1 opacity-70">{counts[key]}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {listQ.isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : listQ.error ? (
              <div className="p-4 text-sm text-red-600">
                {listQ.error.message}{' '}
                <button type="button" className="underline" onClick={() => listQ.refetch()}>
                  Retry
                </button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={LifeBuoy} title="No tickets" description="Nothing matches this filter." />
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {tickets.map((t) => {
                  const name = t.student?.name || t.student?.email || 'Student';
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                          selectedId === t.id && 'bg-gray-50',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            pastelClassFromString(t.student?.email || name),
                          )}
                        >
                          {initialsFromName(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-gray-900">{name}</span>
                            <span className="shrink-0 text-[11px] text-gray-400">
                              {formatRelativeTime(t.last_message_at)}
                            </span>
                          </div>
                          <div className="truncate text-xs text-gray-600">
                            <span className="font-mono text-gray-400">{t.ticket_number}</span> · {t.title}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <StatusBadge status={t.status} />
                            {t.priority === 'high' && <Badge variant="danger">High</Badge>}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Ticket detail */}
        <div className={cn('min-w-0', !selectedId && 'hidden lg:block')}>
          {selectedId ? (
            <TicketDetail ticketId={selectedId} onBack={() => setSelectedId(null)} />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={LifeBuoy}
                title="Select a ticket"
                description="Pick a ticket on the left to read the conversation and reply."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketDetail({ ticketId, onBack }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const endRef = useRef(null);

  const detailQ = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => supportTicketsApi.get(ticketId),
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const messages = detailQ.data?.messages ?? [];
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  useEffect(() => setReply(''), [ticketId]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
    qc.invalidateQueries({ queryKey: ['support-tickets'] });
  };

  const replyM = useMutation({
    mutationFn: ({ resolve }) => supportTicketsApi.reply(ticketId, reply, { resolve }),
    onSuccess: (data) => {
      setReply('');
      toast.success(data.emailed ? 'Reply sent and emailed to the student' : 'Reply saved');
      invalidate();
    },
    onError: (err) => toast.error(err.message || 'Failed to send reply'),
  });

  const statusM = useMutation({
    mutationFn: (status) => supportTicketsApi.setStatus(ticketId, status),
    onSuccess: (_, status) => {
      toast.success(status === 'resolved' ? 'Ticket resolved' : 'Ticket reopened');
      invalidate();
    },
    onError: (err) => toast.error(err.message || 'Failed to update ticket'),
  });

  if (detailQ.isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-3/4" />
      </div>
    );
  }
  if (detailQ.error) {
    return <div className="p-6 text-sm text-red-600">{detailQ.error.message}</div>;
  }

  const { ticket, student, attachments = [] } = detailQ.data;
  const attachmentsByMessage = attachments.reduce((acc, a) => {
    (acc[a.message_id || 'ticket'] ||= []).push(a);
    return acc;
  }, {});
  const busy = replyM.isPending || statusM.isPending;

  return (
    <div className="flex h-full max-h-[80vh] flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 rounded-lg p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Back to tickets"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-gray-400">{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              {ticket.priority === 'high' && <Badge variant="danger">High priority</Badge>}
            </div>
            <div className="mt-1 truncate text-base font-semibold text-gray-900">{ticket.title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
              <span>{student?.name || 'Student'}</span>
              {student?.email && (
                <a href={`mailto:${student.email}`} className="inline-flex items-center gap-1 hover:underline">
                  <Mail className="h-3 w-3" />
                  {student.email}
                </a>
              )}
              {student?.phone && <span>{student.phone}</span>}
            </div>
          </div>
        </div>
        {ticket.status === 'resolved' ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => statusM.mutate('open')}>
            <RotateCcw className="h-4 w-4" />
            Reopen
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => statusM.mutate('resolved')}>
            <CheckCircle2 className="h-4 w-4" />
            Resolve
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/60 p-4">
        <Bubble
          staff={false}
          name={student?.name || 'Student'}
          when={ticket.created_at}
          body={ticket.description}
          attachments={attachmentsByMessage.ticket}
          label="Opened ticket"
        />
        {messages
          // The first message usually repeats the ticket description.
          .filter((m, i) => !(i === 0 && !m.is_staff && cleanBody(m.body) === cleanBody(ticket.description)))
          .map((m) => (
            <Bubble
              key={m.id}
              staff={m.is_staff}
              name={m.sender_name}
              when={m.created_at}
              body={m.body}
              attachments={attachmentsByMessage[m.id]}
              label={m.source === 'email' ? 'via email' : null}
            />
          ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-gray-200 p-4">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a reply to the student…"
          className="min-h-[88px]"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && reply.trim() && !busy) {
              replyM.mutate({ resolve: false });
            }
          }}
        />
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {ticket.status !== 'resolved' && (
            <Button
              variant="outline"
              disabled={!reply.trim() || busy}
              onClick={() => replyM.mutate({ resolve: true })}
            >
              Reply &amp; resolve
            </Button>
          )}
          <Button disabled={!reply.trim() || busy} onClick={() => replyM.mutate({ resolve: false })}>
            {replyM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send reply
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ staff, name, when, body, attachments = [], label }) {
  const links = inlineLinks(body);
  return (
    <div className={cn('flex', staff ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-3 text-sm shadow-sm',
          staff ? 'bg-emerald-50 ring-1 ring-emerald-100' : 'bg-white ring-1 ring-gray-200',
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{name}</span>
          <span>{formatRelativeTime(when)}</span>
          {label && <span className="text-gray-400">· {label}</span>}
        </div>
        <div className="whitespace-pre-wrap break-words text-gray-900">{cleanBody(body)}</div>
        {(attachments.length > 0 || links.length > 0) && (
          <div className="mt-2 space-y-1">
            {attachments.map((a) =>
              a.url ? (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                >
                  <Paperclip className="h-3 w-3" />
                  {a.filename || a.type}
                </a>
              ) : null,
            )}
            {links.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 truncate text-xs text-blue-600 hover:underline"
              >
                <Paperclip className="h-3 w-3 shrink-0" />
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

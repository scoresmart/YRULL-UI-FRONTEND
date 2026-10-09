import { useMemo, useState } from 'react';
import { Check, CheckCheck, Clock, Info, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn, formatPhone, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { whatsappApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { UNPAID_BILL_CODE, messagePreview } from './messageHelpers';

// WhatsApp lets you forward to five chats at a time.
const MAX_FORWARD = 5;

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Pick up to five chats and forward the message to them. */
export function ForwardDialog({ msg, contacts, onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);
  const preview = messagePreview(msg);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...(contacts || [])]
      .filter((c) => c.wa_id && (!q || `${c.name || ''} ${c.wa_id}`.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0))
      .slice(0, 200);
  }, [contacts, search]);

  const toggle = (waId) =>
    setSelected((s) => (s.includes(waId) ? s.filter((x) => x !== waId) : s.length < MAX_FORWARD ? [...s, waId] : s));

  const send = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    try {
      const { results = [] } = await whatsappApi.forward({ messageId: msg.id, to: selected });
      const ok = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (ok) toast.success(`Forwarded to ${ok} chat${ok === 1 ? '' : 's'}`);
      if (failed.length) {
        const name = (waId) => contacts.find((c) => c.wa_id === waId)?.name || formatPhone(waId);
        toast.error(
          `Not sent to ${failed.map((f) => name(f.to)).join(', ')}: ${failed[0].error || 'WhatsApp refused it'}. ` +
            'They need to have messaged you in the last 24 hours.',
          { duration: 8000 },
        );
      }
      selected.forEach((waId) => queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', waId] }));
      queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      if (ok) onClose();
    } catch (err) {
      toast.error(err.message || 'Could not forward the message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward message to</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg bg-[#F0F2F5] px-3 py-2 text-[13px] text-gray-600">
          {preview.icon ? <preview.icon className="h-4 w-4 shrink-0 text-gray-500" /> : null}
          <span className="line-clamp-2">{preview.text}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or number"
            className="h-10 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0"
          />
        </div>
        <div className="-mx-2 max-h-[320px] overflow-y-auto">
          {list.length ? (
            list.map((c) => {
              const on = selected.includes(c.wa_id);
              const full = !on && selected.length >= MAX_FORWARD;
              return (
                <button
                  key={c.wa_id}
                  type="button"
                  disabled={full}
                  onClick={() => toggle(c.wa_id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-50 disabled:opacity-40"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                      on ? 'border-[#25D366] bg-[#25D366] text-white' : 'border-gray-300',
                    )}
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      pastelClassFromString(c.wa_id),
                    )}
                  >
                    {initialsFromName(c.name || c.wa_id)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-gray-900">{c.name || formatPhone(c.wa_id)}</span>
                    {c.name ? <span className="block truncate text-xs text-gray-500">{formatPhone(c.wa_id)}</span> : null}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">No chats match “{search}”.</p>
          )}
        </div>
        <p className="text-xs leading-relaxed text-gray-500">
          WhatsApp only delivers forwards to people who messaged you in the last 24 hours. Up to {MAX_FORWARD} chats at a time.
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">{selected.length ? `${selected.length} selected` : ''}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={send} disabled={!selected.length || sending}>
              {sending ? 'Forwarding…' : 'Forward'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_ROWS = {
  read: { icon: CheckCheck, cls: 'text-[#53BDEB]', label: 'Read' },
  delivered: { icon: CheckCheck, cls: 'text-gray-400', label: 'Delivered' },
  sent: { icon: Check, cls: 'text-gray-400', label: 'Sent' },
  accepted: { icon: Check, cls: 'text-gray-400', label: 'Sent' },
  pending: { icon: Clock, cls: 'text-gray-400', label: 'Sending' },
  failed: { icon: Info, cls: 'text-red-500', label: 'Not delivered' },
};

/** Sent / delivered / read for one of our messages, as WhatsApp's Message info. */
export function MessageInfoDialog({ msg, onClose }) {
  const status = STATUS_ROWS[msg.status] || STATUS_ROWS.sent;
  const preview = messagePreview(msg);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Message info</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg bg-[#D9FDD3] px-3 py-2 text-[13px] text-gray-800">
          <span className="line-clamp-3">{preview.text}</span>
        </div>
        <dl className="divide-y divide-gray-100 text-sm">
          <div className="flex items-center justify-between py-2.5">
            <dt className="flex items-center gap-2 text-gray-600">
              <Check className="h-4 w-4 text-gray-400" />
              Sent
            </dt>
            <dd className="text-gray-900">{formatWhen(msg.created_at)}</dd>
          </div>
          {msg.status && !['sent', 'accepted', 'pending'].includes(msg.status) ? (
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 text-gray-600">
                <status.icon className={cn('h-4 w-4', status.cls)} />
                {status.label}
              </dt>
              <dd className="text-gray-900">{formatWhen(msg.status_at)}</dd>
            </div>
          ) : null}
        </dl>
        {msg.status === 'failed' ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
            {Number(msg.error_code) === UNPAID_BILL_CODE ? (
              <span className="mb-1 block font-medium">
                Not delivered because the WhatsApp Business bill is unpaid. Pay it in Meta Business billing, then
                send the message again.
              </span>
            ) : null}
            {[msg.error_title, msg.error_details].filter(Boolean).join(' — ') || 'WhatsApp could not deliver this message.'}
            {msg.error_code ? ` (code ${msg.error_code})` : ''}
          </p>
        ) : null}
        <p className="text-xs text-gray-500">
          WhatsApp reports the latest step only, so an earlier step&apos;s time isn&apos;t kept once it is read.
        </p>
      </DialogContent>
    </Dialog>
  );
}

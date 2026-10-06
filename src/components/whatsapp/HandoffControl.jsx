import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, UserRound, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { handoffApi } from '../../lib/api';
import { cn } from '../../lib/utils';

const REASONS = {
  refund: 'refund',
  complaint: 'complaint',
  legal: 'legal',
  privacy: 'privacy',
  payment: 'payment',
  never_enquired: 'says they never enquired',
  wants_person: 'asked for a person',
  not_covered: "agent couldn't answer",
  call_requested: 'needs a call',
  human_reply: 'you replied',
  manual: 'taken over',
  other: 'needs a person',
};

/**
 * Who answers this chat: the AI agent or a person (support rules R26–R30).
 * Hidden for contacts the agent isn't switched on for.
 */
export function HandoffControl({ waId }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ['handoff', waId],
    queryFn: () => handoffApi.get(waId),
    enabled: Boolean(waId),
    refetchInterval: 20000,
    retry: false,
  });
  const s = q.data;
  if (!waId || !s?.applies) return null;

  const human = s.status === 'HUMAN';
  const quietUntil = s.human_active_until ? new Date(s.human_active_until) : null;

  async function act(action) {
    setBusy(true);
    try {
      const next = await handoffApi.set(waId, action);
      queryClient.setQueryData(['handoff', waId], next);
      toast.success(action === 'take_over' ? 'You have this chat — the agent will stay quiet' : 'Handed back to the AI agent');
    } catch (err) {
      toast.error(err.message || 'Could not change who handles this chat');
    } finally {
      setBusy(false);
    }
  }

  const title = human
    ? `${s.sensitive ? 'Sensitive — only comes back when you close it' : s.resume_at ? `Back to the agent at ${new Date(s.resume_at).toLocaleString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit' })} if nobody hands it back` : ''}`
    : quietUntil
      ? `You messaged recently, so the agent waits until ${quietUntil.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`
      : 'The AI agent answers this chat';

  return (
    <div className="mr-1 flex items-center gap-1.5" title={title}>
      <span
        className={cn(
          'hidden items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium sm:flex',
          !human && 'bg-emerald-50 text-emerald-700',
          human && !s.sensitive && 'bg-amber-50 text-amber-800',
          human && s.sensitive && 'bg-red-50 text-red-700',
        )}
      >
        {human ? (s.sensitive ? <ShieldAlert className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />) : <Bot className="h-3.5 w-3.5" />}
        {human ? `Person · ${REASONS[s.reason] || 'needs a person'}` : quietUntil ? 'AI · waiting for you' : 'AI agent'}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => act(human ? 'return_to_ai' : 'take_over')}
        className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] font-medium text-[#111B21] hover:bg-black/[0.04] disabled:opacity-50"
      >
        {human ? (s.sensitive ? 'Close & return to AI' : 'Return to AI') : 'Take over'}
      </button>
    </div>
  );
}

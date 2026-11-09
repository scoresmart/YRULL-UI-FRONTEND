import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, UserRound, ShieldAlert, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { handoffApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

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

// While this chat is open and you are using the inbox, the automation stays
// paused for this student; 15 minutes after your last activity it resumes (R27).
const HEARTBEAT_MS = 60_000;
const IN_USE_MS = 60_000;

/**
 * Tells the backend you are active on this chat: once when it opens, then
 * every minute while the tab is visible and you have used the page (mouse,
 * keys, scroll, touch) in the last minute. Stops after "Return to AI" /
 * "Let the AI reply now" until the chat is opened again.
 */
function useActiveHeartbeat(waId, releasedRef) {
  useEffect(() => {
    if (!waId) return undefined;
    let lastInput = Date.now();
    const onInput = () => { lastInput = Date.now(); };
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onInput, { passive: true, capture: true }));
    const beat = () => {
      if (releasedRef.current || document.visibilityState !== 'visible') return;
      if (Date.now() - lastInput > IN_USE_MS) return;
      handoffApi.set(waId, 'active').catch(() => {});
    };
    releasedRef.current = false;
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', onInput);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, onInput, { capture: true }));
      document.removeEventListener('visibilitychange', onInput);
    };
  }, [waId, releasedRef]);
}

/**
 * Who answers this chat: the AI agent or a person (support rules R26–R30).
 * Rendered as a three-dot (⋮) overflow menu in the chat header — open it to
 * turn the AI agent off (take over), hand the chat back, or, when the agent is
 * paused because you are working on the chat, let it answer now. Hidden for
 * contacts the agent isn't switched on for.
 */
export function HandoffControl({ waId }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const releasedRef = useRef(false);
  useActiveHeartbeat(waId, releasedRef);
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
  const quiet = !human && quietUntil && quietUntil.getTime() > Date.now();

  async function act(action) {
    setBusy(true);
    // Handing it back: your open chat no longer keeps the automation paused.
    releasedRef.current = action === 'return_to_ai';
    try {
      const next = await handoffApi.set(waId, action);
      queryClient.setQueryData(['handoff', waId], next);
      toast.success(
        action === 'take_over'
          ? 'You have this chat — the AI agent will stay quiet'
          : 'Handed back to the AI agent',
      );
    } catch (err) {
      toast.error(err.message || 'Could not change who handles this chat');
    } finally {
      setBusy(false);
    }
  }

  const StateIcon = human ? (s.sensitive ? ShieldAlert : UserRound) : Bot;
  const tint = human ? (s.sensitive ? 'text-red-600' : 'text-amber-600') : 'text-[#54656F]';
  const dot = human ? (s.sensitive ? 'bg-red-500' : 'bg-amber-500') : quiet ? 'bg-emerald-500' : '';

  const quietTime = quietUntil
    ? quietUntil.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : '';

  const statusLabel = human
    ? s.sensitive
      ? 'A person has this chat (sensitive)'
      : `A person has this chat · ${REASONS[s.reason] || 'taken over'}`
    : quiet
      ? 'AI agent · paused while you work'
      : 'AI agent is answering';

  const statusHint = human
    ? s.sensitive
      ? 'Comes back to the AI only when you close it'
      : s.resume_at
        ? `Back to the AI at ${new Date(s.resume_at).toLocaleString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit' })} if nobody hands it back`
        : 'The AI stays quiet until you hand it back'
    : quiet
      ? `You're active on this chat, so the agent is paused until ${quietTime} (${s.idle_minutes || 15} min after your last activity)`
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Chat automation options"
          title={statusLabel}
          className={cn('relative shrink-0 rounded-full p-2 hover:bg-black/[0.06]', tint)}
        >
          <MoreVertical className="h-6 w-6" />
          {dot ? (
            <span className={cn('absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-white', dot)} />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={10} className="min-w-[240px]">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 text-[13px] font-medium text-gray-900">
            <StateIcon className={cn('h-4 w-4 shrink-0', tint)} />
            {statusLabel}
          </div>
          {statusHint ? <div className="mt-1 text-[12px] leading-snug text-gray-500">{statusHint}</div> : null}
        </div>
        <DropdownMenuSeparator />
        {human ? (
          <DropdownMenuItem disabled={busy} onSelect={() => act('return_to_ai')}>
            <Bot className="h-4 w-4 text-emerald-600" />
            {s.sensitive ? 'Close & turn the AI agent back on' : 'Turn the AI agent back on'}
          </DropdownMenuItem>
        ) : quiet ? (
          <>
            <DropdownMenuItem disabled={busy} onSelect={() => act('return_to_ai')}>
              <Bot className="h-4 w-4 text-emerald-600" />
              Let the AI reply now
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy} onSelect={() => act('take_over')}>
              <UserRound className="h-4 w-4 text-amber-600" />
              Take over — turn the AI off
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem disabled={busy} onSelect={() => act('take_over')}>
            <UserRound className="h-4 w-4 text-amber-600" />
            Take over — turn the AI off
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

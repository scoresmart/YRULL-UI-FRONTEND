import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PauseCircle, PlayCircle, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationPauseApi } from '../../lib/api';
import { cn } from '../../lib/utils';

const HOUR = 60;

function clock(iso) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Whether the automation is replying to this student. A stop request ("stop
 * this", "pause the bot") pauses it for an hour, then it resumes by itself;
 * the moderator can pause, extend, resume, or switch it off for good.
 * Your own messages and replies to the student are never held back.
 */
export function AutomationPauseControl({ waId }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const key = ['automation-pause', waId];
  const q = useQuery({
    queryKey: key,
    queryFn: () => automationPauseApi.get(waId),
    enabled: Boolean(waId),
    refetchInterval: 30000,
    retry: false,
  });
  const s = q.data;
  if (!waId || !s) return null;

  async function act(action, { minutes = HOUR, confirm } = {}) {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    try {
      const next = await automationPauseApi.set(waId, {
        action,
        minutes,
        pause_version: s.pause_version,
      });
      queryClient.setQueryData(key, next);
      toast.success(
        {
          pause: 'Automation paused for this student',
          extend: 'Pause extended',
          resume: 'Automation resumed',
          disable: 'Automation switched off for this student',
          enable: 'Automation back on for this student',
        }[action],
      );
    } catch (err) {
      toast.error(err.message || 'Could not change the automation');
      queryClient.invalidateQueries({ queryKey: key });
    } finally {
      setBusy(false);
    }
  }

  const button =
    'rounded-full border border-black/10 bg-white px-2.5 py-1 text-[12px] font-medium text-[#111B21] hover:bg-black/[0.04] disabled:opacity-50';

  if (s.status === 'disabled') {
    return (
      <div className="mr-1 flex items-center gap-1.5">
        <span className="hidden items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 sm:flex">
          <Ban className="h-3.5 w-3.5" />
          Automation off for good
        </span>
        <button type="button" disabled={busy} className={button} onClick={() => act('enable', { confirm: 'Turn automation back on for this student?' })}>
          Turn back on
        </button>
      </div>
    );
  }

  if (s.status === 'paused') {
    return (
      <div className="mr-1 flex items-center gap-1.5" title={s.reason ? `Reason: ${s.reason.replace(/_/g, ' ')}` : undefined}>
        <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 sm:flex">
          <PauseCircle className="h-3.5 w-3.5" />
          Automation paused · resumes {clock(s.resume_at)} ({s.minutes_left} min)
        </span>
        <button type="button" disabled={busy} className={button} onClick={() => act('extend')}>
          +1 h
        </button>
        <button type="button" disabled={busy} className={cn(button, 'inline-flex items-center gap-1')} onClick={() => act('resume')}>
          <PlayCircle className="h-3.5 w-3.5" />
          Resume now
        </button>
        <button
          type="button"
          disabled={busy}
          className={cn(button, 'text-red-700')}
          onClick={() => act('disable', { confirm: 'Switch automation off for good for this student? Only a moderator can turn it back on.' })}
        >
          Off for good
        </button>
      </div>
    );
  }

  return (
    <div className="mr-1 flex items-center gap-1.5">
      <button type="button" disabled={busy} className={cn(button, 'inline-flex items-center gap-1')} onClick={() => act('pause')}>
        <PauseCircle className="h-3.5 w-3.5" />
        Pause 1 h
      </button>
    </div>
  );
}

import { cn } from '../../lib/utils';
import type { TemplateStatus } from '../../lib/whatsappManagerApi';

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40',
  PENDING: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/35',
  REJECTED: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/40',
  PAUSED: 'bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/40',
  DISABLED: 'bg-white/10 text-gray-400 ring-1 ring-white/15',
};

function normalizeStatus(s: TemplateStatus): string {
  return String(s || 'PENDING').toUpperCase();
}

export function StatusPill({ status, className }: { status: TemplateStatus; className?: string }) {
  const key = normalizeStatus(status);
  const cls = STATUS_STYLES[key] ?? STATUS_STYLES.PENDING;
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide', cls, className)}
      title={key}
    >
      {key}
    </span>
  );
}

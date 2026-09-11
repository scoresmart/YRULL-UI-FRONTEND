import { cn } from '../../lib/utils';

// A red "LIVE" badge read as an error at a glance. Status now carries its own
// colour: running is green, not started is grey, deliberately stopped is amber.
const STATUS_STYLES = {
  live: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Live' },
  paused: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Paused' },
  draft: { dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100', label: 'Draft' },
};

export function StatusPill({ status, className }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        style.bg,
        style.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  );
}

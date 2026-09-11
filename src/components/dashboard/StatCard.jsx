import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

export function StatCard({ label, value, subLabel, right, accent = false }) {
  return (
    <Card className={cn('p-5 transition-transform duration-150 hover:scale-[1.01]', accent && 'border-green-100')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{value}</div>
          {subLabel ? <div className="mt-1 text-sm text-gray-500">{subLabel}</div> : null}
        </div>
        {right ? <div className="mt-1">{right}</div> : null}
      </div>
    </Card>
  );
}

import { memo } from 'react';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { formatRelativeTime, cn } from '../../lib/utils';
import { MessageCircle, Users, Zap, Settings } from 'lucide-react';

const iconFor = (action) => {
  if (action.includes('message')) return { Icon: MessageCircle, cls: 'bg-green-50 text-green-700' };
  if (action.includes('contact') || action.includes('user')) return { Icon: Users, cls: 'bg-blue-50 text-blue-700' };
  if (action.includes('automation') || action.includes('rule')) return { Icon: Zap, cls: 'bg-amber-50 text-amber-700' };
  return { Icon: Settings, cls: 'bg-gray-100 text-gray-700' };
};

const Item = memo(function Item({ item }) {
  const { Icon, cls } = iconFor(item.action);
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', cls)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-gray-900">{item.description}</div>
        <div className="mt-0.5 text-xs text-gray-500">{formatRelativeTime(item.created_at)}</div>
      </div>
    </div>
  );
});

export function ActivityFeed({ data, isLoading }) {
  return (
    <Card className="h-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-semibold text-gray-900">Recent Activity</div>
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Last 20</div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="max-h-[540px] divide-y divide-gray-100 overflow-auto">
          {(data ?? []).slice(0, 20).map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </div>
      )}
    </Card>
  );
}


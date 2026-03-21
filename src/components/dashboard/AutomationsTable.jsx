import { memo, useCallback } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Skeleton } from '../ui/skeleton';
import { formatRelativeTime } from '../../lib/utils';

const Row = memo(function Row({ item, onToggle, onEdit, onDelete }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.trigger_type}</td>
      <td className="px-4 py-3">
        <Switch checked={item.is_active} onCheckedChange={() => onToggle(item.id)} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.last_run_at ? formatRelativeTime(item.last_run_at) : '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-900">{item.messages_sent}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(item.id)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export function AutomationsTable({ data, isLoading }) {
  const onToggle = useCallback((id) => {}, []);
  const onEdit = useCallback((id) => {}, []);
  const onDelete = useCallback((id) => {}, []);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-gray-900">Active Automations</div>
          <div className="mt-1 text-sm text-gray-500">Triggers and outbound sequences running in your workspace.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            View All
          </Button>
          <Button size="sm">New Automation</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : data?.length ? (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-white">
              <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Automation</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Run</th>
                <th className="px-4 py-3">Messages Sent</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <Row key={item.id} item={item} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <div className="text-base font-semibold text-gray-900">No automations yet</div>
          <div className="mt-1 text-sm text-gray-500">Create your first automation to respond faster and stay consistent.</div>
          <Button className="mt-4">Create your first automation</Button>
        </div>
      )}
    </Card>
  );
}


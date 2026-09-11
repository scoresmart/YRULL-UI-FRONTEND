import { memo, useCallback } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

const Row = memo(function Row({ item, onEdit, onDelete }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {item.condition?.field ? `${item.condition.field} ${item.condition.op} ${String(item.condition.value)}` : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.action?.type ? `${item.action.type}` : '—'}</td>
      <td className="px-4 py-3">
        <Badge variant={item.status === 'active' ? 'success' : 'muted'}>
          {item.status === 'active' ? 'Active' : 'Paused'}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">{item.triggered_count}</td>
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

export function RulesTable({ data, isLoading }) {
  const onEdit = useCallback((id) => {}, []);
  const onDelete = useCallback((id) => {}, []);

  return (
    <Card className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-gray-900">Active Rules</div>
          <div className="mt-1 text-sm text-gray-500">Lightweight routing and automation helpers.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            View All
          </Button>
          <Button size="sm">New Rule</Button>
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
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Triggered</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <Row key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <div className="text-base font-semibold text-gray-900">No rules yet</div>
          <div className="mt-1 text-sm text-gray-500">Create rules to auto-assign and keep your inbox tidy.</div>
          <Button className="mt-4">Create your first rule</Button>
        </div>
      )}
    </Card>
  );
}

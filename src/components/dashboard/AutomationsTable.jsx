import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Skeleton } from '../ui/skeleton';
import { StatusPill } from '../ui/status-pill';
import { formatRelativeTime } from '../../lib/utils';
import { automationsApi } from '../../lib/api';
import { TRIGGERS_BY_TYPE } from '../automations/builder/catalog';

const triggerTypeOf = (item) => {
  if (item.trigger_type) return item.trigger_type;
  if (Array.isArray(item.trigger_types) && item.trigger_types.length) return item.trigger_types[0];
  return '';
};

const Row = memo(function Row({ item, onToggle, onEdit, onDelete }) {
  const type = triggerTypeOf(item);
  const status = item.status || (item.is_active ? 'live' : 'draft');
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{TRIGGERS_BY_TYPE[type]?.label || type || '—'}</td>
      <td className="px-4 py-3">
        {status === 'draft' ? (
          <StatusPill status="draft" />
        ) : (
          <div className="flex items-center gap-2">
            <Switch checked={status === 'live'} onCheckedChange={(on) => onToggle(item.id, on)} aria-label="Live" />
            <StatusPill status={status} />
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {item.last_run_at ? formatRelativeTime(item.last_run_at) : '—'}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-gray-900">{(item.total_runs ?? item.messages_sent ?? 0).toLocaleString()}</td>
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
            onClick={() => onDelete(item)}
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onToggle = useCallback(
    async (id, on) => {
      try {
        await automationsApi.update(id, { status: on ? 'live' : 'paused' });
        toast.success(on ? 'Automation is live' : 'Automation paused');
      } catch (err) {
        toast.error(err.message || 'Could not change the status');
      } finally {
        queryClient.invalidateQueries({ queryKey: ['automations'] });
      }
    },
    [queryClient],
  );
  const onEdit = useCallback((id) => navigate(`/automations/${id}`), [navigate]);
  const onDelete = useCallback(
    async (item) => {
      if (!window.confirm(`Delete “${item.name}”? Its run history is removed too.`)) return;
      try {
        await automationsApi.delete(item.id);
        toast.success('Automation deleted');
      } catch (err) {
        toast.error(err.message || 'Could not delete');
      } finally {
        queryClient.invalidateQueries({ queryKey: ['automations'] });
      }
    },
    [queryClient],
  );

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-gray-900">Active Automations</div>
          <div className="mt-1 text-sm text-gray-500">Triggers and outbound sequences running in your workspace.</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/automations')}>
            View All
          </Button>
          <Button size="sm" onClick={() => navigate('/automations/new')}>
            New Automation
          </Button>
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
                <th className="px-4 py-3">Runs</th>
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
          <div className="mt-1 text-sm text-gray-500">
            Create your first automation to respond faster and stay consistent.
          </div>
          <Button className="mt-4" onClick={() => navigate('/automations/new')}>
            Create your first automation
          </Button>
        </div>
      )}
    </Card>
  );
}

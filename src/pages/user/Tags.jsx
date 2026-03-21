import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { TagModal } from '../../components/tags/TagModal';
import { useContacts, useContactTags, useTags } from '../../lib/dataHooks';
import { tagsApi } from '../../lib/api';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const colorCls = (c) =>
  c === 'green'
    ? 'border-l-green-500'
    : c === 'blue'
      ? 'border-l-blue-500'
      : c === 'purple'
        ? 'border-l-purple-500'
        : c === 'orange'
          ? 'border-l-amber-500'
          : c === 'red'
            ? 'border-l-red-500'
            : 'border-l-gray-300';

export function TagsPage() {
  const tagsQ = useTags();
  const contactsQ = useContacts();
  const contactTagsQ = useContactTags();
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (tagId) => {
    setDeleting(true);
    try {
      await tagsApi.delete(tagId);
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag deleted');
    } catch {
      toast.error('Failed to delete tag');
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  const countByTagId = useMemo(() => {
    const m = new Map();
    for (const ct of contactTagsQ.data ?? []) m.set(ct.tag_id, (m.get(ct.tag_id) ?? 0) + 1);
    return m;
  }, [contactTagsQ.data]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Tags</div>
          <div className="mt-1 text-sm text-gray-500">Organize contacts and conversations with lightweight labels.</div>
        </div>
        <TagModal trigger={<Button>Create Tag</Button>} />
      </div>

      {tagsQ.isLoading || contactsQ.isLoading ? (
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {(tagsQ.data ?? []).map((t) => {
            const count = countByTagId.get(t.id) ?? 0;
            const isConfirming = confirmId === t.id;
            return (
              <Card key={t.id} className={cn('border-l-4', colorCls(t.color))}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                      <div className="text-lg font-semibold text-gray-900">{t.name}</div>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">{count} contacts</div>
                    <div className="mt-2 text-sm text-gray-500">{t.description || '—'}</div>
                    <div className="mt-3 text-xs text-gray-400">Last used: {count ? '2 days ago' : '—'}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" type="button" aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                      type="button"
                      aria-label="Delete"
                      onClick={() => setConfirmId((v) => (v === t.id ? null : t.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {isConfirming ? (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
                    <div className="text-sm font-semibold text-red-700">Delete tag?</div>
                    <div className="mt-1 text-sm text-red-700/80">This will remove the tag from all contacts.</div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="destructive" size="sm" disabled={deleting} onClick={() => handleDelete(t.id)}>
                        {deleting ? 'Deleting...' : 'Delete'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setConfirmId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


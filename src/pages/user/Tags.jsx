import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Tags as TagsIcon, Trash2, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/EmptyState';
import { TagModal } from '../../components/tags/TagModal';
import { useContacts, useContactTags, useTags } from '../../lib/dataHooks';
import { tagsApi } from '../../lib/api';
import { cn, formatRelativeTime } from '../../lib/utils';
import { tagColor } from '../../lib/tagColors';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import toast from 'react-hot-toast';

const SORTS = [
  { key: 'used', label: 'Most used' },
  { key: 'recent', label: 'Recently used' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'created', label: 'Newest' },
];

function StatTile({ label, value, hint, icon: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
          {hint && <div className="mt-0.5 truncate text-xs text-gray-400">{hint}</div>}
        </div>
        {Icon && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <Icon className="h-4 w-4 text-gray-500" />
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Ranked usage bars. Each bar carries its tag's own color so identity survives
 * sorting and filtering, and every row is directly labelled with name + count
 * so the value never depends on color alone.
 */
function UsageBreakdown({ rows }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <Card>
      <div className="text-sm font-medium text-gray-900">Tag usage</div>
      <div className="mt-1 text-xs text-gray-400">Contacts per tag, most used first</div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const color = tagColor(row.color);
          return (
            <div key={row.id} className="flex items-center gap-3">
              <div className="flex w-32 flex-shrink-0 items-center gap-2 sm:w-40">
                <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', color.dot)} />
                <span className="truncate text-sm text-gray-700" title={row.name}>
                  {row.name}
                </span>
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn('h-2 rounded-full', color.bar)}
                  style={{ width: `${Math.max((row.count / max) * 100, 3)}%` }}
                />
              </div>
              <div className="w-10 flex-shrink-0 text-right text-sm tabular-nums text-gray-600">{row.count}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function TagsPage() {
  useDocumentTitle('Tags');
  const tagsQ = useTags();
  const contactsQ = useContacts();
  const contactTagsQ = useContactTags();
  const queryClient = useQueryClient();

  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('used');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTag, setEditTag] = useState(null);

  const handleDelete = async (tagId) => {
    setDeleting(true);
    try {
      await tagsApi.delete(tagId);
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      await queryClient.invalidateQueries({ queryKey: ['contact_tags'] });
      toast.success('Tag deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete tag');
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  };

  // Usage stats derived from contact_tags rows: how many contacts carry each
  // tag, and when it was last applied. `applied_at` is what makes "last used"
  // a real number rather than a placeholder.
  const usage = useMemo(() => {
    const counts = new Map();
    const lastUsed = new Map();
    const taggedContacts = new Set();
    for (const ct of contactTagsQ.data ?? []) {
      counts.set(ct.tag_id, (counts.get(ct.tag_id) ?? 0) + 1);
      if (ct.contact_id) taggedContacts.add(ct.contact_id);
      const at = ct.applied_at ? new Date(ct.applied_at).getTime() : null;
      if (at && !Number.isNaN(at) && at > (lastUsed.get(ct.tag_id) ?? 0)) lastUsed.set(ct.tag_id, at);
    }
    return { counts, lastUsed, taggedCount: taggedContacts.size };
  }, [contactTagsQ.data]);

  const tags = useMemo(
    () =>
      (tagsQ.data ?? []).map((t) => ({
        ...t,
        count: usage.counts.get(t.id) ?? 0,
        lastUsedAt: usage.lastUsed.get(t.id) ?? null,
      })),
    [tagsQ.data, usage],
  );

  const totalContacts = (contactsQ.data ?? []).length;
  const coverage = totalContacts > 0 ? Math.min(100, Math.round((usage.taggedCount / totalContacts) * 100)) : null;
  const unusedCount = tags.filter((t) => t.count === 0).length;
  const busiest = tags.reduce((best, t) => (t.count > (best?.count ?? 0) ? t : best), null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = tags.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q),
    );
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'recent':
          return (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);
        case 'used':
        default:
          return b.count - a.count || a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [tags, search, sort]);

  // A ranked bar list needs at least two bars to be a comparison; below that
  // the stat tiles already tell the whole story.
  const usageRows = useMemo(
    () =>
      tags
        .filter((t) => t.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [tags],
  );

  const isLoading = tagsQ.isLoading || contactTagsQ.isLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">Tags</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize contacts and conversations with lightweight labels.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create tag
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total tags"
          value={isLoading ? '—' : tags.length}
          hint={!isLoading && unusedCount > 0 ? `${unusedCount} never used` : undefined}
          icon={TagsIcon}
        />
        <StatTile
          label="Tagged contacts"
          value={isLoading ? '—' : usage.taggedCount}
          hint={totalContacts > 0 ? `of ${totalContacts} contacts` : undefined}
          icon={Users}
        />
        <StatTile label="Coverage" value={isLoading || coverage === null ? '—' : `${coverage}%`} />
        <StatTile
          label="Most used"
          value={isLoading || !busiest || busiest.count === 0 ? '—' : busiest.name}
          hint={busiest && busiest.count > 0 ? `${busiest.count} contacts` : undefined}
        />
      </div>

      {!isLoading && usageRows.length >= 2 && <UsageBreakdown rows={usageRows} />}

      {!isLoading && tags.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              placeholder="Search tags..."
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <label htmlFor="tag-sort" className="text-sm text-gray-500">
              Sort
            </label>
            <select
              id="tag-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : tags.length === 0 ? (
        <EmptyState
          icon={TagsIcon}
          title="Create tags to organize your contacts and conversations"
          description="Tags help you categorize contacts, filter conversations, and target broadcasts."
          actionLabel="Create first tag"
          onAction={() => setCreateOpen(true)}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No tags match your search"
          description="Try a different name or clear the search to see every tag."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((t) => {
            const color = tagColor(t.color);
            const isConfirming = confirmId === t.id;
            return (
              <Card key={t.id} className={cn('group border-l-4 p-5', color.border)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', color.dot)} />
                      <div className="truncate text-base font-semibold text-gray-900" title={t.name}>
                        {t.name}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {t.count} {t.count === 1 ? 'contact' : 'contacts'}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      type="button"
                      aria-label={`Edit ${t.name}`}
                      onClick={() => setEditTag(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      type="button"
                      aria-label={`Delete ${t.name}`}
                      onClick={() => setConfirmId((v) => (v === t.id ? null : t.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-gray-500">{t.description || '—'}</div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                  <span>Last used: {t.lastUsedAt ? formatRelativeTime(new Date(t.lastUsedAt)) : 'Never'}</span>
                  {t.created_at && <span>Created {formatRelativeTime(t.created_at)}</span>}
                </div>

                {isConfirming ? (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
                    <div className="text-sm font-semibold text-red-700">Delete tag?</div>
                    <div className="mt-1 text-sm text-red-700/80">
                      This will remove the tag from {t.count} {t.count === 1 ? 'contact' : 'contacts'}.
                    </div>
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

      <TagModal open={createOpen} onOpenChange={setCreateOpen} />
      <TagModal
        key={editTag?.id ?? 'edit'}
        tag={editTag}
        open={Boolean(editTag)}
        onOpenChange={(v) => !v && setEditTag(null)}
      />
    </div>
  );
}

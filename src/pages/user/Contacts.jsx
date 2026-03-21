import { useCallback, useMemo, useState } from 'react';
import { MoreHorizontal, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { AddEditContactModal } from '../../components/contacts/AddEditContactModal';
import { ContactSidePanel } from '../../components/contacts/ContactSidePanel';
import { useContactStore } from '../../store/contactStore';
import { useContacts, useContactTags, useTags } from '../../lib/dataHooks';

export function ContactsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const selectedContactId = useContactStore((s) => s.selectedContactId);
  const setSelectedContactId = useContactStore((s) => s.setSelectedContactId);

  const contactsQ = useContacts();
  const tagsQ = useTags();
  const contactTagsQ = useContactTags();

  const tagsById = useMemo(() => new Map((tagsQ.data ?? []).map((t) => [t.id, t])), [tagsQ.data]);
  const tagsByContactId = useMemo(() => {
    const m = new Map();
    for (const ct of contactTagsQ.data ?? []) {
      const tag = tagsById.get(ct.tag_id);
      if (!tag) continue;
      const arr = m.get(ct.contact_id) ?? [];
      arr.push(tag);
      m.set(ct.contact_id, arr);
    }
    return m;
  }, [contactTagsQ.data, tagsById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = contactsQ.data ?? [];
    if (!q) return list;
    return list.filter((c) => {
      const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim().toLowerCase();
      return `${name} ${c.phone} ${c.email ?? ''}`.toLowerCase().includes(q);
    });
  }, [contactsQ.data, search]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const openContact = useCallback((id) => setSelectedContactId(id), [setSelectedContactId]);
  const closePanel = useCallback(() => setSelectedContactId(null), [setSelectedContactId]);

  const selectedContact = useMemo(
    () => (contactsQ.data ?? []).find((c) => c.id === selectedContactId) ?? null,
    [contactsQ.data, selectedContactId],
  );
  const selectedTags = useMemo(
    () => (selectedContact ? tagsByContactId.get(selectedContact.id) ?? [] : []),
    [selectedContact, tagsByContactId],
  );

  return (
    <div className="relative">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-semibold text-gray-900">Contacts</div>
          <Badge variant="muted">{filtered.length.toLocaleString()} contacts</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search contacts..." />
          </div>
          <Button variant="outline">Filter</Button>
          <Button variant="outline">Import CSV</Button>
          <AddEditContactModal trigger={<Button>Add Contact</Button>} />
        </div>
      </div>

      <Card className={selectedContactId ? 'pr-[420px]' : ''}>
        {contactsQ.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Tags</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => {
                    const tags = tagsByContactId.get(c.id) ?? [];
                    const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.phone;
                    return (
                      <tr
                        key={c.id}
                        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                        onClick={() => openContact(c.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{name}</div>
                          <div className="text-sm text-gray-500">{c.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{c.email ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {tags.slice(0, 3).map((t) => (
                              <span key={t.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                {t.name}
                              </span>
                            ))}
                            {tags.length > 3 ? <span className="text-xs text-gray-400">+{tags.length - 3}</span> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={c.status === 'active' ? 'success' : 'danger'}>{c.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {selectedContactId ? (
        <ContactSidePanel contact={selectedContact} tags={selectedTags} onClose={closePanel} />
      ) : null}
    </div>
  );
}


import { X } from 'lucide-react';
import { cn, initialsFromName, pastelClassFromString, formatRelativeTime } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export function ContactSidePanel({ contact, tags, onClose }) {
  if (!contact) return null;
  const name = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || contact.phone;
  const avatarCls = pastelClassFromString(contact.phone ?? contact.id);

  return (
    <aside className="fixed right-0 top-16 h-[calc(100vh-64px)] w-[420px] border-l border-brand-border bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="text-sm font-semibold text-gray-900">Contact</div>
        <button
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="h-full overflow-auto p-6">
        <div className="flex items-start gap-3">
          <div
            className={cn('flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold', avatarCls)}
          >
            {initialsFromName(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-gray-900">{name}</div>
            <div className="mt-1 text-sm text-gray-500">{contact.phone}</div>
            <div className="mt-1 text-sm text-gray-500">{contact.email ?? '—'}</div>
          </div>
          <Badge variant={contact.status === 'active' ? 'success' : 'danger'}>
            {contact.status === 'active' ? 'Active' : 'Blocked'}
          </Badge>
        </div>

        <div className="mt-6">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Tags</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.length ? (
              tags.map((t) => (
                <span key={t.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  {t.name}
                </span>
              ))
            ) : (
              <div className="text-sm text-gray-500">No tags</div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Notes</div>
          <div className="mt-2 rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700">
            {contact.notes || 'No notes yet.'}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Last active: {contact.last_active_at ? formatRelativeTime(contact.last_active_at) : '—'}
          </div>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </div>
      </div>
    </aside>
  );
}

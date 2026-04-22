import { memo, useMemo, useState } from 'react';
import { Search, Loader2, Instagram } from 'lucide-react';
import { cn, formatRelativeTime, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { InboxFiltersBar } from '../ui/InboxFiltersBar';
import { useChatStore } from '../../store/chatStore';
import { useInstagramContacts } from '../../lib/dataHooks';

function getContactThreadType(contact) {
  const candidates = [
    contact?.event_type,
    contact?.last_event_type,
    contact?.last_message_type,
    contact?.message_type,
    contact?.type,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (candidates.some((value) => value === 'comment' || value === 'comments')) return 'comments';
  if (candidates.some((value) => value === 'dm' || value === 'message' || value === 'messages')) return 'messages';
  return 'unknown';
}

const ConversationRow = memo(function ConversationRow({ contact, selected, onSelect, unreadCount }) {
  const name = contact?.name || contact?.username || contact?.ig_user_id || 'Unknown';
  const username = contact?.username ? `@${contact.username}` : '';
  const avatarCls = pastelClassFromString(contact?.ig_user_id ?? '');

  return (
    <button
      type="button"
      className={cn(
        'w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50',
        selected && 'bg-purple-50 border-l-4 border-l-purple-500',
      )}
      onClick={() => onSelect(contact.ig_user_id)}
    >
      <div className="flex items-start gap-3">
        {contact?.profile_pic ? (
          <img src={contact.profile_pic} alt={name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div
            className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold', avatarCls)}
          >
            {initialsFromName(name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
            <div className="ml-2 flex items-center gap-2">
              {unreadCount > 0 ? (
                <Badge className="h-5 min-w-5 justify-center rounded-full bg-purple-600 px-1 text-[10px] text-white">
                  {unreadCount}
                </Badge>
              ) : null}
              {contact?.last_seen && (
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelativeTime(contact.last_seen)}</span>
              )}
            </div>
          </div>
          {username && <p className="text-xs text-purple-500 truncate">{username}</p>}
        </div>
      </div>
    </button>
  );
});

export function IgConversationList() {
  const selectedIgUserId = useChatStore((s) => s.selectedIgUserId);
  const setSelectedIgUserId = useChatStore((s) => s.setSelectedIgUserId);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('open');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [channel, setChannel] = useState('all');

  const contactsQ = useInstagramContacts();
  const contacts = contactsQ.data || [];

  const filtered = useMemo(() => {
    let list = [...contacts];

    if (scope === 'open') {
      list = list.filter((c) => !c.archived && c.status !== 'closed' && c.status !== 'resolved');
    }

    if (unreadOnly) {
      list = list.filter((c) => Number(c.unread_count || 0) > 0);
    }

    if (channel !== 'all') {
      list = list.filter((c) => {
        const type = getContactThreadType(c);
        // Keep unknown threads visible so filters do not hide real conversations when backend omits type metadata.
        if (type === 'unknown') return true;
        return type === channel;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.username || '').toLowerCase().includes(q) ||
          (c.ig_user_id || '').toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      const aTime = new Date(a.last_seen || a.updated_at || a.created_at || 0).getTime();
      const bTime = new Date(b.last_seen || b.updated_at || b.created_at || 0).getTime();
      if (sort === 'oldest') return aTime - bTime;
      if (sort === 'unread') return Number(b.unread_count || 0) - Number(a.unread_count || 0);
      return bTime - aTime;
    });

    return list;
  }, [contacts, scope, unreadOnly, channel, search, sort]);

  return (
    <div className="flex h-full w-[340px] flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Instagram className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Instagram</h2>
        </div>
        <InboxFiltersBar
          scopeValue={scope}
          onScopeChange={setScope}
          scopeOptions={[
            { value: 'open', label: 'Open Chats' },
            { value: 'all', label: 'All Conversations' },
          ]}
          unreadActive={unreadOnly}
          onToggleUnread={() => setUnreadOnly((prev) => !prev)}
          sortValue={sort}
          onSortChange={setSort}
          sortOptions={[
            { value: 'newest', label: 'Sort: Newest' },
            { value: 'oldest', label: 'Sort: Oldest' },
            { value: 'unread', label: 'Sort: Unread first' },
          ]}
          channelValue={channel}
          onChannelChange={setChannel}
          channelOptions={[
            { value: 'all', label: 'All Channels' },
            { value: 'messages', label: 'Messages' },
            { value: 'comments', label: 'Comments' },
          ]}
          onAdvancedFilter={() => {}}
          compact
          className="mb-3"
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {contactsQ.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Instagram className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-2 text-sm text-gray-400">No Instagram conversations yet</p>
          </div>
        ) : (
          filtered.map((contact) => (
            <ConversationRow
              key={contact.ig_user_id}
              contact={contact}
              selected={selectedIgUserId === contact.ig_user_id}
              onSelect={setSelectedIgUserId}
              unreadCount={Number(contact.unread_count || 0)}
            />
          ))
        )}
      </div>
    </div>
  );
}

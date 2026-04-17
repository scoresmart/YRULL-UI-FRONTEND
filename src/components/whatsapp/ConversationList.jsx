import { memo, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Search, Loader2 } from 'lucide-react';
import { cn, formatRelativeTime, initialsFromName, pastelClassFromString, formatPhone } from '../../lib/utils';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { useChatStore } from '../../store/chatStore';
import { useContacts, useMessages, useTags, useContactTags } from '../../lib/dataHooks';
import { supabase } from '../../lib/supabase';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useQueryClient } from '@tanstack/react-query';

// Get unread count for a contact (client-side)
async function getUnreadCount(waId) {
  const lastRead = localStorage.getItem(`lastRead_${waId}`) || '1970-01-01T00:00:00Z';
  const { count, error } = await supabase
    .from('whatsapp_messages')
    .select('*', { count: 'exact', head: true })
    .eq('wa_id', waId)
    .eq('direction', 'inbound')
    .gt('created_at', lastRead);
  if (error) return 0;
  return count ?? 0;
}

// Get last message for a contact
async function getLastMessage(waId) {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('body, created_at, direction')
    .eq('wa_id', waId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle() to handle no messages gracefully
  if (error || !data) return null;
  return data;
}

const FilterTabs = memo(function FilterTabs() {
  const filter = useChatStore((s) => s.conversationFilter);
  const setFilter = useChatStore((s) => s.setFilter);
  return (
    <Tabs value={filter} onValueChange={setFilter}>
      <TabsList className="bg-white">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="unread">Unread</TabsTrigger>
        <TabsTrigger value="assigned">Assigned</TabsTrigger>
        <TabsTrigger value="resolved">Resolved</TabsTrigger>
      </TabsList>
    </Tabs>
  );
});

const ConversationRow = memo(function ConversationRow({ contact, lastMessage, unreadCount, selected, onSelect, tags, contactTags }) {
  const name = contact?.name || formatPhone(contact?.wa_id) || 'Unknown';
  const avatarCls = pastelClassFromString(contact?.wa_id ?? contact?.id);
  const displayPhone = formatPhone(contact?.wa_id || contact?.phone);

  // Get tags applied to this contact
  const appliedTags = useMemo(() => {
    if (!tags || !contactTags || !contact) return [];
    
    // Find contact_tags that match this contact
    const matchingTagIds = contactTags
      .filter((ct) => contact.id && ct.contact_id === contact.id)
      .map((ct) => ct.tag_id);
    
    // Get the full tag objects
    return tags.filter((tag) => matchingTagIds.includes(tag.id));
  }, [tags, contactTags, contact]);

  return (
    <button
      type="button"
      className={cn(
        'w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50',
        selected && 'bg-green-50 border-l-4 border-l-green-500',
      )}
      onClick={() => onSelect(contact.wa_id)}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', avatarCls)}>
          {initialsFromName(name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
            <div className="shrink-0 text-xs text-gray-400">
              {lastMessage?.created_at ? formatRelativeTime(lastMessage.created_at) : contact?.last_seen ? formatRelativeTime(contact.last_seen) : ''}
            </div>
          </div>
          <div className="mt-1 truncate text-sm text-gray-500">
            {lastMessage ? (lastMessage.body || '[Media]').substring(0, 50) : 'No messages yet'}
          </div>
          {displayPhone && displayPhone !== name ? (
            <div className="mt-1 text-xs text-gray-400">{displayPhone}</div>
          ) : null}
          {/* Tags Display */}
          {appliedTags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {appliedTags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    tag.color === 'green' ? 'bg-green-100 text-green-700 border border-green-200' :
                    tag.color === 'blue' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                    tag.color === 'purple' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                    tag.color === 'orange' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                    tag.color === 'red' ? 'bg-red-100 text-red-700 border border-red-200' :
                    'bg-gray-100 text-gray-700 border border-gray-200'
                  )}
                >
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    tag.color === 'green' ? 'bg-green-500' :
                    tag.color === 'blue' ? 'bg-blue-500' :
                    tag.color === 'purple' ? 'bg-purple-500' :
                    tag.color === 'orange' ? 'bg-amber-500' :
                    tag.color === 'red' ? 'bg-red-500' :
                    'bg-gray-500'
                  )} />
                  {tag.name}
                </span>
              ))}
              {appliedTags.length > 2 && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200">
                  +{appliedTags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {unreadCount > 0 ? (
            <Badge className="h-6 w-6 justify-center rounded-full p-0 text-white bg-brand-accent">{unreadCount}</Badge>
          ) : (
            <div className="h-6" />
          )}
        </div>
      </div>
    </button>
  );
});

export function ConversationList({ className }) {
  const search = useChatStore((s) => s.search);
  const debouncedSearch = useDebouncedValue(search, 300);
  const setSearch = useChatStore((s) => s.setSearch);
  const filter = useChatStore((s) => s.conversationFilter);
  const selectedWaId = useChatStore((s) => s.selectedWaId);
  const setSelectedWaId = useChatStore((s) => s.setSelectedWaId);
  const queryClient = useQueryClient();

  const contactsQ = useContacts();
  const tagsQ = useTags();
  const contactTagsQ = useContactTags();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const refreshUnreadCountsRef = useRef(null);

  // Fetch unread counts and last messages for all contacts
  const refreshUnreadCounts = useCallback(async () => {
    if (!contactsQ.data?.length) {
      setIsLoadingMessages(false);
      return;
    }
    
    setIsLoadingMessages(true);
    const counts = {};
    const messages = {};
    
    for (const contact of contactsQ.data) {
      const [count, lastMsg] = await Promise.all([
        getUnreadCount(contact.wa_id),
        getLastMessage(contact.wa_id),
      ]);
      counts[contact.wa_id] = count;
      if (lastMsg) messages[contact.wa_id] = lastMsg;
    }
    
    setUnreadCounts(counts);
    setLastMessages(messages);
    setIsLoadingMessages(false);
  }, [contactsQ.data]);

  // Store ref so we can call it from outside
  refreshUnreadCountsRef.current = refreshUnreadCounts;

  useEffect(() => {
    if (contactsQ.data?.length) {
      refreshUnreadCounts();
    } else {
      setIsLoadingMessages(false);
    }
    
    // Real-time subscription handles instant updates; poll only as a safety fallback
    const interval = setInterval(() => {
      if (contactsQ.data?.length) {
        refreshUnreadCounts();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCounts, contactsQ.data]);

  // Listen for real-time query updates to refresh unread counts (debounced)
  const pendingRefreshRef = useRef(null);
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === 'whatsapp_messages' && refreshUnreadCountsRef.current) {
        // Debounce: only refresh once per 5s window to avoid cascading queries
        if (!pendingRefreshRef.current) {
          pendingRefreshRef.current = setTimeout(() => {
            refreshUnreadCountsRef.current();
            pendingRefreshRef.current = null;
          }, 5000);
        }
      }
    });
    return () => {
      unsubscribe();
      if (pendingRefreshRef.current) clearTimeout(pendingRefreshRef.current);
    };
  }, [queryClient]);

  const items = useMemo(() => {
    let list = [...(contactsQ.data ?? [])];
    
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((c) => {
        const name = (c.name || '').toLowerCase();
        const phone = formatPhone(c.wa_id || c.phone || '').toLowerCase();
        return name.includes(q) || phone.includes(q);
      });
    }
    
    // Filter by filter type
    if (filter === 'unread') {
      list = list.filter((c) => (unreadCounts[c.wa_id] ?? 0) > 0);
    }
    // Note: 'assigned' and 'resolved' filters don't apply (no such fields in schema)
    
    // Sort by last message timestamp (newest first)
    // Contacts with unread messages should appear first, then by last message time
    list.sort((a, b) => {
      const aUnread = unreadCounts[a.wa_id] ?? 0;
      const bUnread = unreadCounts[b.wa_id] ?? 0;
      const aLastMsg = lastMessages[a.wa_id];
      const bLastMsg = lastMessages[b.wa_id];
      
      // First priority: unread messages (contacts with unread appear first)
      if (aUnread > 0 && bUnread === 0) return -1;
      if (aUnread === 0 && bUnread > 0) return 1;
      if (aUnread > 0 && bUnread > 0) {
        // Both have unread - sort by unread count (more unread first)
        if (aUnread !== bUnread) return bUnread - aUnread;
      }
      
      // Second priority: last message timestamp (newest first)
      const aTime = aLastMsg?.created_at ? new Date(aLastMsg.created_at).getTime() : 0;
      const bTime = bLastMsg?.created_at ? new Date(bLastMsg.created_at).getTime() : 0;
      return bTime - aTime; // Descending (newest first)
    });
    
    return list;
  }, [contactsQ.data, debouncedSearch, filter, unreadCounts, lastMessages]);

  const onSelect = useCallback((waId) => {
    setSelectedWaId(waId);
    // Mark as read when selected
    localStorage.setItem(`lastRead_${waId}`, new Date().toISOString());
    // Update unread count
    setUnreadCounts((prev) => ({ ...prev, [waId]: 0 }));
  }, [setSelectedWaId]);

  // Don't auto-select - let user choose which conversation to open

  const Row = useCallback(
    ({ index, style }) => {
      const contact = items[index];
      const unreadCount = unreadCounts[contact.wa_id] ?? 0;
      const lastMessage = lastMessages[contact.wa_id] ?? null;
      return (
        <div style={style}>
          <ConversationRow
            contact={contact}
            lastMessage={lastMessage}
            unreadCount={unreadCount}
            selected={contact.wa_id === selectedWaId}
            onSelect={onSelect}
            tags={tagsQ.data ?? []}
            contactTags={contactTagsQ.data ?? []}
          />
        </div>
      );
    },
    [items, unreadCounts, lastMessages, selectedWaId, onSelect, tagsQ.data, contactTagsQ.data],
  );

  return (
    <div className={cn('flex h-full flex-col border-r border-brand-border bg-white', className || 'w-[320px]')}>
      <div className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <FilterTabs />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Newest</div>
          <div className="text-xs text-gray-500">{items.length} conversations</div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoadingMessages || contactsQ.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Loading conversations...</span>
            </div>
          </div>
        ) : items.length > 100 ? (
          <List height={720} width={320} itemCount={items.length} itemSize={92}>
            {Row}
          </List>
        ) : (
          <div className="h-full overflow-auto">
            {items.map((contact) => (
              <ConversationRow
                key={contact.wa_id || contact.id}
                contact={contact}
                lastMessage={lastMessages[contact.wa_id] ?? null}
                unreadCount={unreadCounts[contact.wa_id] ?? 0}
                selected={contact.wa_id === selectedWaId}
                onSelect={onSelect}
                tags={tagsQ.data ?? []}
                contactTags={contactTagsQ.data ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

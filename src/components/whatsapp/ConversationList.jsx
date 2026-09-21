import { memo, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ArrowDownUp,
  Camera,
  Check,
  CheckCheck,
  Contact,
  FileText,
  LayoutTemplate,
  Loader2,
  MapPin,
  Mic,
  Phone,
  Search,
  Sticker,
  Video,
  X,
} from 'lucide-react';
import { cn, initialsFromName, pastelClassFromString, formatPhone } from '../../lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useChatStore } from '../../store/chatStore';
import { useContacts, useTags, useContactTags } from '../../lib/dataHooks';
import { supabase } from '../../lib/supabase';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useQueryClient } from '@tanstack/react-query';

// The list needs each chat's last message and how many inbound messages arrived
// since it was last opened. That used to be two queries per contact, re-run
// every 30s and 5s after any message change — 30+ requests a round with 15
// chats, forever. One page of recent messages answers both for every chat.
const RECENT_MESSAGE_LIMIT = 500;

async function fetchRecentMessages() {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('wa_id, body, created_at, direction, message_type, status')
    .order('created_at', { ascending: false })
    .limit(RECENT_MESSAGE_LIMIT);
  if (error) throw error;
  return data ?? [];
}

// The list's own query covers only the most recent messages, so a chat older
// than that window falls back to the preview the conversations endpoint sends
// with each contact, and one with no messages at all to when it was last seen.
function lastMessageOf(contact, lastMessages) {
  return lastMessages[contact.wa_id] ?? contact.last_message ?? null;
}

function activityTime(contact, lastMessages) {
  const when = lastMessageOf(contact, lastMessages)?.created_at || contact.last_seen;
  return when ? new Date(when).getTime() : 0;
}

function summarise(rows) {
  const lastMessages = {};
  const unreadCounts = {};
  const lastReadCache = {};
  for (const row of rows) {
    const waId = row.wa_id;
    if (!waId) continue;
    if (!lastMessages[waId]) lastMessages[waId] = row;
    if (row.direction !== 'inbound') continue;
    if (!(waId in lastReadCache)) {
      lastReadCache[waId] = localStorage.getItem(`lastRead_${waId}`) || '';
    }
    const lastRead = lastReadCache[waId];
    if (!lastRead || row.created_at > lastRead) {
      unreadCounts[waId] = (unreadCounts[waId] ?? 0) + 1;
    }
  }
  return { lastMessages, unreadCounts };
}

// How a last message reads in the list: media and cards get an icon and a
// label instead of the "[image]"-style placeholder the backend stores.
const PREVIEW = {
  audio: [Mic, 'Voice message'],
  image: [Camera, 'Photo'],
  video: [Video, 'Video'],
  document: [FileText, 'Document'],
  sticker: [Sticker, 'Sticker'],
  location: [MapPin, 'Location'],
  contacts: [Contact, 'Contact'],
  template: [LayoutTemplate, null],
  call_event: [Phone, 'Voice call'],
  voice_call: [Phone, null],
};

// "[Template] name" / "[template:name]" is what older template sends stored.
const TEMPLATE_PREFIX_RE = /^\[template:?\s*([^\]]*)\]\s*/i;

function Preview({ msg }) {
  if (!msg) return <span className="italic">No messages yet</span>;
  const type = msg.message_type || 'text';
  const body = msg.body || '';
  const templatePrefix = TEMPLATE_PREFIX_RE.exec(body.trim());
  const placeholder = /^\[(\w+)\]$/.exec(body);
  const [Icon, label] = PREVIEW[type] || (placeholder && PREVIEW[placeholder[1]]) || [null, null];
  let text = placeholder ? '' : body;
  if (type === 'location') text = body.split('\n')[0]?.startsWith('https://') ? '' : body.split('\n')[0];
  if (type === 'contacts') text = body.split(' · ')[0];
  if (type === 'call_event') text = '';
  if (type === 'voice_call') text = body.replace(/^\[Call Button\]\s*/, '');
  if (templatePrefix) {
    const rest = body.trim().slice(templatePrefix[0].length).trim();
    text = rest || `Template: ${templatePrefix[1].trim()}`;
  }
  const outbound = msg.direction !== 'inbound';

  return (
    <span className="flex min-w-0 items-center gap-1">
      {outbound && type !== 'call_event' ? (
        msg.status === 'read' ? (
          <CheckCheck className="h-4 w-4 shrink-0 text-[#53BDEB]" />
        ) : msg.status === 'delivered' ? (
          <CheckCheck className="h-4 w-4 shrink-0 text-[#8696A0]" />
        ) : (
          <Check className="h-4 w-4 shrink-0 text-[#8696A0]" />
        )
      ) : null}
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-[#8696A0]" /> : null}
      <span className="truncate">{text || label || ''}</span>
    </span>
  );
}

// WhatsApp's list time: clock time today, then "Yesterday", the weekday, a date.
function listTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (days === 0) return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-AU', { weekday: 'long' });
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const TAG_DOT = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  orange: 'bg-amber-500',
  red: 'bg-red-500',
};

const ConversationRow = memo(function ConversationRow({
  contact,
  lastMessage,
  unreadCount,
  selected,
  onSelect,
  tags,
  contactTags,
}) {
  const name = contact?.name || formatPhone(contact?.wa_id) || 'Unknown';
  const avatarCls = pastelClassFromString(contact?.wa_id ?? contact?.id);

  const appliedTags = useMemo(() => {
    if (!tags || !contactTags || !contact) return [];
    const ids = new Set(contactTags.filter((ct) => contact.id && ct.contact_id === contact.id).map((ct) => ct.tag_id));
    return tags.filter((tag) => ids.has(tag.id));
  }, [tags, contactTags, contact]);

  const time = listTime(lastMessage?.created_at || contact?.last_seen);

  return (
    <button
      type="button"
      className={cn(
        'group flex w-full items-center gap-3 pl-3 text-left transition-colors',
        selected ? 'bg-[#F0F2F5]' : 'hover:bg-[#F5F6F6]',
      )}
      onClick={() => onSelect(contact.wa_id)}
    >
      <div
        className={cn(
          'flex h-[49px] w-[49px] shrink-0 items-center justify-center rounded-full text-[15px] font-semibold',
          avatarCls,
        )}
      >
        {initialsFromName(name)}
      </div>
      <div className="min-w-0 flex-1 border-b border-[#E9EDEF] py-3 pr-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-[16px] leading-[21px] text-[#111B21]">{name}</div>
          <div
            className={cn(
              'shrink-0 text-[12px] leading-[14px]',
              unreadCount > 0 ? 'font-medium text-[#1DAA61]' : 'text-[#667781]',
            )}
          >
            {time}
          </div>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div
            className={cn('min-w-0 flex-1 text-[14px] leading-5', unreadCount > 0 ? 'text-[#111B21]' : 'text-[#667781]')}
          >
            <Preview msg={lastMessage} />
          </div>
          {unreadCount > 0 ? (
            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[12px] font-semibold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </div>
        {appliedTags.length > 0 ? (
          <div className="mt-1 flex items-center gap-2 overflow-hidden">
            {appliedTags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="inline-flex min-w-0 items-center gap-1 text-[11.5px] text-[#667781]">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', TAG_DOT[tag.color] || 'bg-gray-400')} />
                <span className="truncate">{tag.name}</span>
              </span>
            ))}
            {appliedTags.length > 3 ? (
              <span className="text-[11.5px] text-[#667781]">+{appliedTags.length - 3}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
});

export function ConversationList({ className }) {
  const search = useChatStore((s) => s.search);
  const debouncedSearch = useDebouncedValue(search, 300);
  const setSearch = useChatStore((s) => s.setSearch);
  const filter = useChatStore((s) => s.conversationFilter);
  const sort = useChatStore((s) => s.sort);
  const tagFilter = useChatStore((s) => s.tagFilter);
  const selectedWaId = useChatStore((s) => s.selectedWaId);
  const setSelectedWaId = useChatStore((s) => s.setSelectedWaId);
  const setFilter = useChatStore((s) => s.setFilter);
  const setSort = useChatStore((s) => s.setSort);
  const queryClient = useQueryClient();

  const contactsQ = useContacts();
  const tagsQ = useTags();
  const contactTagsQ = useContactTags();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const refreshUnreadCountsRef = useRef(null);

  // Previews and unread counts for every chat, in one request.
  const inFlightRef = useRef(false);
  const refreshUnreadCounts = useCallback(async () => {
    if (!contactsQ.data?.length) {
      setIsLoadingMessages(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // Only show the loading spinner on the very first load; subsequent background
    // refreshes (poll, real-time events) should update silently.
    if (!hasLoadedOnceRef.current) {
      setIsLoadingMessages(true);
    }
    try {
      const { lastMessages: messages, unreadCounts: counts } = summarise(await fetchRecentMessages());
      setUnreadCounts(counts);
      setLastMessages(messages);
      hasLoadedOnceRef.current = true;
    } catch (err) {
      console.error('Failed to load conversation previews:', err);
    } finally {
      inFlightRef.current = false;
      setIsLoadingMessages(false);
    }
  }, [contactsQ.data]);

  // Kept in a ref so the query-cache listener below always calls the latest one.
  useEffect(() => {
    refreshUnreadCountsRef.current = refreshUnreadCounts;
  }, [refreshUnreadCounts]);

  useEffect(() => {
    if (contactsQ.data?.length) {
      refreshUnreadCounts();
    } else {
      setIsLoadingMessages(false);
    }

    // Real-time handles instant updates, so this is only a safety net — and it
    // stops entirely while the tab is in the background.
    const interval = setInterval(() => {
      if (contactsQ.data?.length && !document.hidden) {
        refreshUnreadCounts();
      }
    }, 60000);
    const onVisible = () => {
      if (!document.hidden && contactsQ.data?.length) refreshUnreadCounts();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshUnreadCounts, contactsQ.data]);

  // Listen for real-time query updates to refresh unread counts (debounced)
  const pendingRefreshRef = useRef(null);
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only a real data change matters; 'observerResultsUpdated' fires for
      // every mount and render of a chat, which kept the list re-querying.
      if (
        event?.type === 'updated' &&
        event?.action?.type === 'success' &&
        event?.query?.queryKey?.[0] === 'whatsapp_messages' &&
        refreshUnreadCountsRef.current &&
        !pendingRefreshRef.current
      ) {
        pendingRefreshRef.current = setTimeout(() => {
          pendingRefreshRef.current = null;
          if (!document.hidden) refreshUnreadCountsRef.current();
        }, 5000);
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

    // Filter by label/tag
    if (tagFilter) {
      const taggedContactIds = new Set(
        (contactTagsQ.data ?? [])
          .filter((ct) => ct.tag_id === tagFilter)
          .map((ct) => ct.contact_id),
      );
      list = list.filter((c) => taggedContactIds.has(c.id));
    }

    // Sort list from the toolbar controls.
    list.sort((a, b) => {
      const aUnread = unreadCounts[a.wa_id] ?? 0;
      const bUnread = unreadCounts[b.wa_id] ?? 0;
      const aTime = activityTime(a, lastMessages);
      const bTime = activityTime(b, lastMessages);

      if (sort === 'unread') {
        if (aUnread !== bUnread) return bUnread - aUnread;
        return bTime - aTime;
      }

      if (sort === 'oldest') {
        return aTime - bTime;
      }

      return bTime - aTime;
    });

    return list;
  }, [contactsQ.data, debouncedSearch, filter, unreadCounts, lastMessages, sort, tagFilter, contactTagsQ.data]);

  const totalUnreadChats = useMemo(
    () => Object.values(unreadCounts).filter((n) => n > 0).length,
    [unreadCounts],
  );

  const onSelect = useCallback(
    (waId) => {
      setSelectedWaId(waId);
      // Mark as read when selected
      localStorage.setItem(`lastRead_${waId}`, new Date().toISOString());
      // Update unread count
      setUnreadCounts((prev) => ({ ...prev, [waId]: 0 }));
    },
    [setSelectedWaId],
  );

  // Don't auto-select - let user choose which conversation to open

  return (
    <div className={cn('flex h-full flex-col border-r border-[#E9EDEF] bg-white', className || 'w-[320px]')}>
      <div className="shrink-0 px-3 pb-2 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#54656F]" />
          <input
            placeholder="Search name or number"
            className="h-9 w-full rounded-lg border-0 bg-[#F0F2F5] pl-11 pr-9 text-[14px] text-[#111B21] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#54656F] hover:bg-black/[0.06]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
          ].map((opt) => {
            const active = opt.value === 'unread' ? filter === 'unread' : filter !== 'unread';
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-[14px] transition-colors',
                  active ? 'bg-[#E7FCE3] text-[#008069]' : 'bg-[#F0F2F5] text-[#54656F] hover:bg-[#E9EDEF]',
                )}
              >
                {opt.label}
                {opt.value === 'unread' && totalUnreadChats ? ` ${totalUnreadChats}` : ''}
              </button>
            );
          })}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Sort chats"
                  title="Sort chats"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] hover:bg-black/[0.06]"
                >
                  <ArrowDownUp className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Sort</div>
                {[
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                  { value: 'unread', label: 'Unread first' },
                ].map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => setSort(opt.value)}>
                    <Check className={cn('mr-2 h-4 w-4', sort === opt.value ? 'opacity-100' : 'opacity-0')} />
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoadingMessages || contactsQ.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="text-[14px] text-[#667781]">Loading chats…</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="px-8 py-12 text-center text-[14px] text-[#667781]">
            {search ? 'No chats match your search' : filter === 'unread' ? 'No unread chats' : 'No chats yet'}
          </div>
        ) : (
          <div className="h-full overflow-auto">
            {items.map((contact) => (
              <ConversationRow
                key={contact.wa_id || contact.id}
                contact={contact}
                lastMessage={lastMessageOf(contact, lastMessages)}
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

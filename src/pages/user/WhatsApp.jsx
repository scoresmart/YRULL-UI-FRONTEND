import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ConversationList } from '../../components/whatsapp/ConversationList';
import { ChatWindow } from '../../components/whatsapp/ChatWindow';
import { ContactInfoPanel } from '../../components/whatsapp/ContactInfoPanel';
import { IncomingCallNotification } from '../../components/whatsapp/IncomingCallNotification';
import { WhatsAppConnectionCard } from '../../components/whatsapp/WhatsAppConnectionCard';
import { useRealtime } from '../../hooks/useRealtime';
import { useWhatsAppIntegration } from '../../hooks/useWhatsAppIntegration';
import { useIsMobile, useIsDesktop } from '../../hooks/useMediaQuery';
import { ENV } from '../../lib/env';
import { useChatStore } from '../../store/chatStore';
import { useContacts, useTags, useContactTags } from '../../lib/dataHooks';
import { cn } from '../../lib/utils';
import { MessageSquare, Loader2, ChevronLeft, ChevronRight, Users, UserCheck, Clock, Plus } from 'lucide-react';

function tagColorDot(color) {
  return color === 'green'
    ? 'bg-green-500'
    : color === 'blue'
      ? 'bg-blue-500'
      : color === 'purple'
        ? 'bg-purple-500'
        : color === 'orange'
          ? 'bg-amber-500'
          : color === 'red'
            ? 'bg-red-500'
            : 'bg-gray-400';
}

function LabelsSidebar({ collapsed, onToggle }) {
  const tagsQ = useTags();
  const contactTagsQ = useContactTags();
  const contactsQ = useContacts();
  const tagFilter = useChatStore((s) => s.tagFilter);
  const setTagFilter = useChatStore((s) => s.setTagFilter);
  const filter = useChatStore((s) => s.conversationFilter);
  const setFilter = useChatStore((s) => s.setFilter);

  const tags = tagsQ.data ?? [];
  const contacts = contactsQ.data ?? [];
  const contactTags = contactTagsQ.data ?? [];

  const totalCount = contacts.length;

  const tagCounts = useMemo(() => {
    const counts = {};
    for (const tag of tags) {
      const ids = new Set(contactTags.filter((ct) => ct.tag_id === tag.id).map((ct) => ct.contact_id));
      counts[tag.id] = contacts.filter((c) => ids.has(c.id)).length;
    }
    return counts;
  }, [tags, contactTags, contacts]);

  const itemCls = (active) =>
    cn(
      'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
      active
        ? 'bg-green-50 text-green-700 font-semibold'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
    );

  const countBadge = (n, active) =>
    n > 0 ? (
      <span
        className={cn(
          'ml-auto text-xs font-medium tabular-nums',
          active ? 'text-green-600' : 'text-gray-400',
        )}
      >
        {n}
      </span>
    ) : null;

  if (collapsed) {
    return (
      <div className="flex w-10 flex-shrink-0 flex-col items-center border-r border-gray-200 bg-white py-3 gap-1">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-[220px] flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">Inbox</span>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* ── Fixed filters ── */}
        <button
          type="button"
          className={itemCls(!tagFilter && filter === 'all')}
          onClick={() => { setTagFilter(null); setFilter('all'); }}
        >
          <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">All chats</span>
          {countBadge(totalCount, !tagFilter && filter === 'all')}
        </button>

        <button
          type="button"
          className={itemCls(!tagFilter && filter === 'unread')}
          onClick={() => { setTagFilter(null); setFilter('unread'); }}
        >
          <Users className="h-4 w-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">Unassigned</span>
        </button>

        <button
          type="button"
          className={itemCls(false)}
          onClick={() => { setTagFilter(null); setFilter('all'); }}
        >
          <UserCheck className="h-4 w-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">Assigned to me</span>
        </button>

        <button type="button" className={itemCls(false)}>
          <Clock className="h-4 w-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">Reminders</span>
        </button>

        {/* ── Labels ── */}
        {tags.length > 0 && (
          <>
            <div className="flex items-center justify-between px-2.5 pt-4 pb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Labels</span>
              <button
                type="button"
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Manage labels"
                onClick={() => window.location.href = '/tags'}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {tags.map((tag) => {
              const active = tagFilter === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={itemCls(active)}
                  onClick={() => { setTagFilter(tag.id); setFilter('all'); }}
                >
                  <span
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 rounded-sm',
                      tagColorDot(tag.color),
                    )}
                  />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {countBadge(tagCounts[tag.id] ?? 0, active)}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export function WhatsAppPage() {
  const queryClient = useQueryClient();
  const processingMessages = useRef(new Set());
  const selectedWaId = useChatStore((s) => s.selectedWaId);
  const setSelectedWaId = useChatStore((s) => s.setSelectedWaId);
  const wa = useWhatsAppIntegration();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSelectedWaId(null);
  }, [setSelectedWaId]);

  useRealtime({
    enabled: !ENV.USE_MOCK && wa.connected,
    onMessage: (payload) => {
      try {
        if (payload.new?.wa_id) {
          const waId = payload.new.wa_id;
          const newMsg = payload.new;
          const msgKey = newMsg.id || `${newMsg.body}_${newMsg.created_at}_${newMsg.direction}_${newMsg.wa_id}`;
          if (processingMessages.current.has(msgKey)) return;
          processingMessages.current.add(msgKey);
          setTimeout(() => {
            processingMessages.current.delete(msgKey);
          }, 1000);

          queryClient.setQueryData(['whatsapp_messages', waId], (oldData) => {
            if (!oldData) return [newMsg];
            const exists = oldData.some((msg) => {
              if (msg.id && newMsg.id && msg.id === newMsg.id) return true;
              return (
                msg.body === newMsg.body &&
                msg.created_at === newMsg.created_at &&
                msg.direction === newMsg.direction &&
                msg.wa_id === newMsg.wa_id
              );
            });
            if (exists) return oldData;
            const updated = [...oldData, newMsg].sort(
              (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
            );
            const seenIds = new Set();
            const deduped = updated.filter((msg) => {
              if (msg.id) {
                if (seenIds.has(msg.id)) return false;
                seenIds.add(msg.id);
              }
              return true;
            });
            const seenContent = new Set();
            return deduped.filter((msg) => {
              const key = `${msg.body || '[no body]'}_${msg.created_at}_${msg.direction}_${msg.wa_id}`;
              if (seenContent.has(key)) return false;
              seenContent.add(key);
              return true;
            });
          });
          queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
        }
      } catch (error) {
        console.error('Error processing real-time message:', error);
      }
    },
    onContactUpdate: () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      } catch {}
    },
  });

  if (wa.loading && !wa.chooseNumberState) {
    return (
      <div className="-mx-4 -my-4 flex h-[calc(100vh-56px)] items-center justify-center bg-brand-chatBg sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-64px)] lg:-mx-8 lg:-my-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Loading WhatsApp…</span>
        </div>
      </div>
    );
  }

  if (!wa.connected) {
    return (
      <div className="-mx-4 -my-4 h-[calc(100vh-56px)] sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-64px)] lg:-mx-8 lg:-my-8">
        <div className="flex h-full flex-col sm:flex-row">
          <div className="hidden h-full w-[320px] flex-col border-r border-brand-border bg-white sm:flex">
            <div className="p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Conversations</div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                <MessageSquare className="h-7 w-7 text-gray-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-500">No conversations</p>
              <p className="mt-1 text-xs text-gray-400">Connect WhatsApp to start</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center bg-brand-chatBg px-4 sm:px-6">
            {wa.chooseNumberState ? (
              <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold">Choose a WhatsApp Number</h3>
                <p className="text-sm text-muted-foreground">
                  Multiple numbers were found on your WhatsApp Business Account. Select the one you want to
                  connect to this workspace.
                </p>
                <div className="space-y-3">
                  {wa.chooseNumberState.numbers.map((num) => (
                    <button
                      key={num.id}
                      onClick={() => wa.selectNumber(num.id)}
                      disabled={wa.loading}
                      className="w-full flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent transition-colors text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div>
                        <p className="font-medium">{num.display_phone}</p>
                        <p className="text-sm text-muted-foreground">{num.verified_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {num.quality_rating === 'GREEN' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Good quality</span>
                        )}
                        <span className="text-xs text-muted-foreground">{num.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <WhatsAppConnectionCard wa={wa} />
            )}
          </div>
        </div>
      </div>
    );
  }

  const showList = isMobile ? !selectedWaId : true;
  const showThread = isMobile ? !!selectedWaId : true;

  return (
    <div className="-mx-4 -my-4 h-[calc(100vh-56px)] sm:-mx-6 sm:-my-6 sm:h-[calc(100vh-64px)] lg:-mx-8 lg:-my-8">
      <WhatsAppConnectionCard wa={wa} compact />

      <div className="flex h-[calc(100%-56px)]">
        {!isMobile && (
          <LabelsSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />
        )}
        {showList && <ConversationList className={isMobile ? 'w-full' : 'w-[320px]'} />}
        {showThread && (
          <ChatWindow
            connected={wa.connected}
            onBack={isMobile ? () => setSelectedWaId(null) : undefined}
            onToggleInfo={() => setShowContactInfo((v) => !v)}
            className="flex-1"
          />
        )}
        {showContactInfo && !isMobile && (
          <ContactInfoPanel onClose={() => setShowContactInfo(false)} />
        )}
      </div>
      <IncomingCallNotification />
    </div>
  );
}

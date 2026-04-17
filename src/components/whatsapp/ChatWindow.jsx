import { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Paperclip, Send, Smile, Tag, UserPlus, Archive, Phone, PhoneOutgoing, PhoneIncoming, PhoneMissed, ArrowLeft, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn, formatRelativeTime, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Skeleton } from '../ui/skeleton';
import { useChatStore } from '../../store/chatStore';
import { useContacts, useMessages, useTags, useContactTags } from '../../lib/dataHooks';
import { whatsappApi, tagsApi } from '../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import toast from 'react-hot-toast';

// Format call duration (seconds to "X seconds" or "X minutes Y seconds")
function formatCallDuration(seconds) {
  if (!seconds || seconds === 0) return 'Missed';
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} minute${mins !== 1 ? 's' : ''}`;
  return `${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
}

// Check if message is a call event (actual incoming/outgoing call, not a call button)
function isCallMessage(msg) {
  if (!msg) return false;
  const msgType = String(msg.message_type || '').toLowerCase().trim();
  return msgType === 'call_event';
}

const CallMessage = memo(function CallMessage({ msg, inbound }) {
  // For call_event messages, parse status/duration from body: "__call_event__|status=...|duration=..."
  let duration = null;
  let callStatus = 'completed';
  if (msg.body?.startsWith('__call_event__')) {
    const parts = msg.body.split('|');
    for (const p of parts) {
      if (p.startsWith('status=')) callStatus = p.slice(7);
      if (p.startsWith('duration=')) duration = parseInt(p.slice(9), 10) || 0;
    }
  }

  const isMissed = duration === 0 || duration === null || callStatus !== 'COMPLETED';
  const PhoneIcon = isMissed ? PhoneMissed : (inbound ? PhoneIncoming : PhoneOutgoing);
  const iconColor = isMissed
    ? 'text-red-500'
    : (inbound ? 'text-blue-500' : 'text-white');

  return (
    <div className="flex items-center gap-3">
      <PhoneIcon className={cn('h-5 w-5 shrink-0', iconColor)} />
      <div className="flex-1">
        <div className={cn('text-sm font-semibold', inbound ? 'text-gray-900' : 'text-white')}>
          Voice call
        </div>
        <div className={cn('text-xs', inbound ? 'text-gray-600' : 'text-white/90')}>
          {isMissed ? 'Missed call' : formatCallDuration(duration)}
        </div>
      </div>
    </div>
  );
});

const MessageBubble = memo(function MessageBubble({ msg }) {
  if (!msg) return null; // Safety check
  
  const inbound = msg.direction === 'inbound';
  const isAiReply = msg.ai_intent?.startsWith('reply_to_');
  const isCall = isCallMessage(msg);
  
  return (
    <div className={cn('flex w-full', inbound ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-2 text-sm shadow-sm sm:max-w-[62%]',
          inbound 
            ? 'rounded-tl-sm bg-white text-gray-800' 
            : 'rounded-tr-sm bg-brand-sentBubble text-gray-900',
          isCall && !inbound && 'bg-[#005C4B]', // WhatsApp green (#005C4B) for outgoing calls
          isCall && inbound && 'bg-white', // White for incoming calls
        )}
      >
        {isCall ? (
          <CallMessage msg={msg} inbound={inbound} />
        ) : msg.message_type === 'voice_call' ? (
          // Call button message — show the actual text + call button like WhatsApp
          <div className="flex flex-col gap-2">
            <div className="whitespace-pre-wrap text-sm">
              {(msg.body || '').replace(/^\[Call Button\]\s*/, '')}
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg border border-green-700 bg-green-800/80 px-3 py-2">
              <Phone className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">Call ScoreSmart</span>
            </div>
          </div>
        ) : msg.message_type === 'interactive' ? (
          // Handle interactive messages (call buttons, lists, etc.) - these often don't have body
          <div className="flex flex-col gap-1">
            <div className={cn('text-sm font-medium', inbound ? 'text-gray-900' : 'text-white')}>
              📱 Interactive message
            </div>
            {msg.body && (
              <div className={cn('text-xs', inbound ? 'text-gray-600' : 'text-white/80')}>
                {msg.body}
              </div>
            )}
            {!msg.body && (
              <div className={cn('text-xs italic', inbound ? 'text-gray-500' : 'text-white/70')}>
                Tap to view on WhatsApp
              </div>
            )}
          </div>
        ) : msg.message_type === 'text' || !msg.message_type || msg.message_type === 'automated' ? (
          // Show body if available, check multiple fields for automated messages
          <div className="whitespace-pre-wrap">
            {msg.body || msg.content || msg.text || msg.message || (msg.metadata && typeof msg.metadata === 'object' ? msg.metadata.text || msg.metadata.body || msg.metadata.content : null) || '[Automated message - no content]'}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-black/5" />
            <div>
              <div className={cn('text-sm font-medium', inbound ? 'text-gray-900' : 'text-white')}>
                {msg.message_type ? String(msg.message_type).toUpperCase() : 'MEDIA'}
              </div>
              <div className={cn('text-xs', inbound ? 'text-gray-500' : 'text-white/70')}>
                Preview coming soon
              </div>
            </div>
          </div>
        )}
        <div className={cn('mt-1 flex items-center justify-end gap-1 text-[11px]', inbound ? 'text-gray-500' : 'text-gray-600')}>
          <span>{msg.created_at ? new Date(msg.created_at).toLocaleString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '') : ''}</span>
          {!inbound ? (
            <>
              {isAiReply ? <span className="text-gray-400" title="AI auto-reply">🤖</span> : null}
              {!isCall && <span className="text-gray-400">✓✓</span>}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
});

function DateSeparator({ label }) {
  return (
    <div className="my-4 flex justify-center">
      <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-gray-600">{label}</div>
    </div>
  );
}

export function ChatWindow({ connected = true, onBack, onToggleInfo, className }) {
  const selectedWaId = useChatStore((s) => s.selectedWaId);
  const contactsQ = useContacts();
  const messagesQ = useMessages(selectedWaId);
  const queryClient = useQueryClient();

  const contact = useMemo(
    () => (contactsQ.data ?? []).find((c) => c.wa_id === selectedWaId) ?? null,
    [contactsQ.data, selectedWaId],
  );

  const name = contact?.name || contact?.wa_id || 'Select a conversation';
  const avatarCls = pastelClassFromString(contact?.wa_id ?? contact?.id);

  const [draft, setDraft] = useState('');
  const [typing] = useState(false);
  const [sending, setSending] = useState(false);
  const [callingUser, setCallingUser] = useState(false);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [applyingTag, setApplyingTag] = useState(false);
  
  const tagsQ = useTags();
  const contactTagsQ = useContactTags();
  
  // Get tags applied to this contact
  // Note: contact_tags table references contacts.id, not whatsapp_contacts
  // The backend API handles the mapping between wa_id and contact_id
  const appliedTags = useMemo(() => {
    if (!contactTagsQ.data || !contact) return [];
    // Try to match by contact.id if available
    return contactTagsQ.data
      .filter((ct) => contact.id && ct.contact_id === contact.id)
      .map((ct) => ct.tag_id);
  }, [contactTagsQ.data, contact]);
  const listRef = useRef(null);

  // Mark messages as read when chat window is open and messages are loaded
  // This runs whenever messages change or when the chat is viewed
  useEffect(() => {
    if (selectedWaId && messagesQ.data?.length) {
      // Get the latest message timestamp (most recent message)
      const sortedMessages = [...messagesQ.data].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      const latestMessage = sortedMessages[0];
      
      if (latestMessage?.created_at) {
        // Mark all current messages as read by setting lastRead to the latest message time
        // This ensures that when user views the chat, all visible messages are marked as read
        const latestTime = new Date(latestMessage.created_at).toISOString();
        const currentLastRead = localStorage.getItem(`lastRead_${selectedWaId}`);
        
        // Only update if the latest message is newer than current lastRead
        if (!currentLastRead || new Date(latestMessage.created_at) > new Date(currentLastRead)) {
          localStorage.setItem(`lastRead_${selectedWaId}`, latestTime);
        }
      }
    }
  }, [selectedWaId, messagesQ.data]);

  const onSend = useCallback(async () => {
    if (!draft.trim() || !contact || !selectedWaId || sending) return;

    const messageText = draft.trim();
    setDraft('');
    setSending(true);

    try {
      // Send using wa_id directly (backend auto-normalizes AU phone numbers)
      const result = await whatsappApi.sendMessage({
        to: contact.wa_id,
        message: messageText,
      });

      // Optimistically add the message to the cache immediately
      // This ensures the message appears right away, even if backend hasn't stored it yet
      const optimisticMessage = {
        id: `temp_${Date.now()}_${Math.random()}`,
        wa_id: contact.wa_id,
        body: messageText,
        direction: 'outbound',
        message_type: 'text',
        created_at: new Date().toISOString(),
        ai_intent: null,
      };

      queryClient.setQueryData(['whatsapp_messages', selectedWaId], (oldData) => {
        if (!oldData) return [optimisticMessage];
        
        // Check if message already exists (avoid duplicates)
        const exists = oldData.some(
          (msg) =>
            (msg.id && msg.id === optimisticMessage.id) ||
            (msg.body === messageText &&
              msg.direction === 'outbound' &&
              msg.wa_id === contact.wa_id &&
              Math.abs(new Date(msg.created_at).getTime() - new Date(optimisticMessage.created_at).getTime()) < 5000)
        );
        
        if (exists) return oldData;
        
        // Add optimistic message and sort
        return [...oldData, optimisticMessage].sort(
          (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
        );
      });

      // Refetch messages after a short delay to get the real message from backend
      // This ensures we get the actual message ID and any backend updates
      setTimeout(async () => {
        await queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', selectedWaId] });
        await queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      }, 1000);

      // Mark as read
      localStorage.setItem(`lastRead_${selectedWaId}`, new Date().toISOString());

      // Scroll to bottom
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      // Error toast is shown by whatsappApi.sendMessage
      setDraft(messageText); // Restore draft on error
    } finally {
      setSending(false);
    }
  }, [draft, contact, selectedWaId, sending, queryClient]);

  const onCall = useCallback(async () => {
    if (!contact || !selectedWaId || callingUser) return;
    setCallingUser(true);
    try {
      await whatsappApi.sendCallButton({
        to: contact.wa_id,
        message: `Hi ${contact.name || ''}! Tap below to call us on WhatsApp.`.trim(),
        displayText: 'Call ScoreSmart',
      });
      toast.success('Call button sent!');
      // Refetch messages since the call button appears as a message
      await queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', selectedWaId] });
    } catch {
      // Error toast already shown by API
    } finally {
      setCallingUser(false);
    }
  }, [contact, selectedWaId, callingUser, queryClient]);

  const templates = ['Intro', 'Pricing', 'Demo Link', 'Follow-up', 'After-hours'];

  // Deduplicate messages - must be at top level (Rules of Hooks)
  const deduplicatedMessages = useMemo(() => {
    const messages = messagesQ.data ?? [];
    if (messages.length === 0) return [];
    
    // Aggressive deduplication: multiple passes
    const seen = new Map(); // Map of key -> first occurrence index
    const result = [];
    
    messages.forEach((msg, index) => {
      // Include ALL messages - don't filter out automated messages or messages without body
      // Check multiple fields for content (body, content, text, message, metadata)
      const bodyContent = (
        msg.body || 
        msg.content || 
        msg.text || 
        msg.message ||
        (msg.metadata && typeof msg.metadata === 'object' ? (msg.metadata.text || msg.metadata.body || msg.metadata.content) : null) ||
        ''
      ).trim() || '[no body]';
      
      // Create multiple keys for deduplication
      const idKey = msg.id ? `id:${msg.id}` : null;
      const contentKey = `content:${bodyContent}_${msg.created_at}_${msg.direction}_${msg.wa_id}`;
      const timestampKey = `time:${msg.created_at}_${bodyContent}_${msg.direction}_${msg.wa_id}`;
      
      // Check all possible keys
      let isDuplicate = false;
      if (idKey && seen.has(idKey)) isDuplicate = true;
      if (!isDuplicate && seen.has(contentKey)) isDuplicate = true;
      if (!isDuplicate && seen.has(timestampKey)) isDuplicate = true;
      
      if (!isDuplicate) {
        // Mark all keys as seen
        if (idKey) seen.set(idKey, index);
        seen.set(contentKey, index);
        seen.set(timestampKey, index);
        result.push(msg);
      }
    });
    
    return result;
  }, [messagesQ.data]);

  if (!selectedWaId) {
    return (
      <div className={cn('flex h-full flex-1 items-center justify-center bg-brand-chatBg', className)}>
        <div className="text-center px-6">
          <div className="text-base font-semibold text-gray-900 sm:text-lg">Select a conversation</div>
          <div className="mt-1 text-sm text-gray-500">Choose a contact to start replying.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-1 flex-col bg-brand-chatBg', className)}>
      <div className="flex h-14 items-center justify-between border-b border-brand-border bg-white px-3 sm:h-16 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold', avatarCls)}>
            {initialsFromName(name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">{name}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Call button — sends WhatsApp call button to user */}
          <button
            className={cn(
              'rounded-lg p-2 hover:bg-gray-100',
              callingUser
                ? 'text-green-500 animate-pulse cursor-wait'
                : 'text-gray-500 hover:text-gray-900',
            )}
            type="button"
            aria-label="Send call button"
            title="Send WhatsApp call button to this contact"
            onClick={onCall}
            disabled={callingUser}
          >
            <Phone className="h-4 w-4" />
          </button>
          <button 
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" 
            type="button" 
            aria-label="Tags"
            onClick={(e) => {
              e.stopPropagation();
              if (!selectedWaId) {
                toast.error('Please select a contact first');
                return;
              }
              setShowTagPanel(true);
            }}
          >
            <Tag className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" type="button" aria-label="Assign">
            <UserPlus className="h-4 w-4" />
          </button>
          <button className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 sm:block" type="button" aria-label="Archive">
            <Archive className="h-4 w-4" />
          </button>
          {onToggleInfo && (
            <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" type="button" aria-label="Contact info" onClick={onToggleInfo}>
              <Info className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-auto px-3 py-3 sm:px-6 sm:py-4">
        {messagesQ.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-[55%]" />
            <Skeleton className="ml-auto h-10 w-[45%]" />
            <Skeleton className="h-10 w-[52%]" />
          </div>
        ) : (
          <>
            <DateSeparator label="Today" />
            <div className="space-y-2">
              {deduplicatedMessages.map((m, idx) => (
                <MessageBubble key={m.id || `msg-${idx}-${m.created_at}-${m.body}`} msg={m} />
              ))}
            </div>
            {typing ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:240ms]" />
                </div>
                Typing…
              </div>
            ) : null}
          </>
        )}
      </div>

      {!connected ? (
        <div className="border-t border-brand-border bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-600" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="text-sm text-amber-800">
              <span className="font-medium">WhatsApp is not connected.</span>{' '}
              Go to the WhatsApp page to connect your Business account before sending messages.
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-brand-border bg-white">
          <div className="flex gap-2 overflow-auto px-4 py-2">
            {templates.map((t) => (
              <button
                key={t}
                type="button"
                className="whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setDraft((d) => (d ? `${d}\n${t}: ` : `${t}: `))}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2 p-4">
            <button type="button" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Emoji">
              <Smile className="h-5 w-5" />
            </button>
            <button type="button" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Attach">
              <Paperclip className="h-5 w-5" />
            </button>

            <div className="flex-1">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                className="min-h-[44px] max-h-[96px] resize-none bg-white"
                rows={1}
              />
            </div>

            <button
              type="button"
              onClick={onSend}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent text-white transition-all duration-150 hover:bg-[#1fb85a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send"
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tag Selection Dialog */}
      <Dialog open={showTagPanel} onOpenChange={setShowTagPanel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Tags</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {tagsQ.isLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading tags...</div>
            ) : (tagsQ.data && tagsQ.data.length > 0) ? (
              <div className="space-y-2">
                {tagsQ.data.map((tag) => {
                  const isApplied = appliedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={async () => {
                        if (!selectedWaId) {
                          toast.error('Contact not found');
                          return;
                        }
                        setApplyingTag(true);
                        try {
                          if (isApplied) {
                            // Remove tag
                            await tagsApi.removeFromContact(selectedWaId, tag.id);
                            toast.success(`Removed tag "${tag.name}"`);
                          } else {
                            // Add tag
                            await tagsApi.applyToContact(selectedWaId, tag.id);
                            toast.success(`Applied tag "${tag.name}"`);
                          }
                          await queryClient.invalidateQueries({ queryKey: ['contact_tags'] });
                          await queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
                        } catch (error) {
                          console.error('Failed to apply tag:', error);
                          toast.error(error.message || 'Failed to apply tag');
                        } finally {
                          setApplyingTag(false);
                        }
                      }}
                      disabled={applyingTag}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                        isApplied
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <span className={cn(
                        'h-3 w-3 rounded-full',
                        tag.color === 'green' ? 'bg-green-500' :
                        tag.color === 'blue' ? 'bg-blue-500' :
                        tag.color === 'purple' ? 'bg-purple-500' :
                        tag.color === 'orange' ? 'bg-amber-500' :
                        tag.color === 'red' ? 'bg-red-500' :
                        'bg-gray-500'
                      )} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{tag.name}</div>
                        {tag.description && (
                          <div className="text-xs text-gray-500">{tag.description}</div>
                        )}
                      </div>
                      {isApplied && (
                        <span className="text-xs text-green-600 font-medium">Applied</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No tags found</p>
                <p className="mt-1 text-xs text-gray-400">Create tags in the Tags section first</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowTagPanel(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import {
  Send,
  Tag,
  Phone,
  PhoneIncoming,
  ArrowLeft,
  Info,
  Mic,
  StopCircle,
  FileText,
  Clock,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { cn, formatPhone, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import { useChatStore } from '../../store/chatStore';
import { useCallStore } from '../../store/callStore';
import { useContacts, useMessages, useTags, useContactTags } from '../../lib/dataHooks';
import { whatsappApi, tagsApi, templatesApi } from '../../lib/api';
import { MessageBubble } from './MessageBubble';
import { AttachButton, EmojiButton } from './ComposerExtras';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import toast from 'react-hot-toast';

const WINDOW_MS = 24 * 60 * 60 * 1000;

function getTemplateBodyText(template) {
  const comps = template?.components || [];
  const body = comps.find((c) => (c.type || '').toUpperCase() === 'BODY');
  return body?.text || '';
}

function countTemplateParams(text) {
  const matches = (text || '').match(/{{\s*\d+\s*}}/g);
  if (!matches) return 0;
  const nums = matches.map((m) => parseInt(m.replace(/[^\d]/g, ''), 10));
  return Math.max(...nums, 0);
}

function formatRemaining(ms) {
  if (ms <= 0) return 'expired';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m left`;
  return `${h}h ${m}m left`;
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-AU', { weekday: 'long' });
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const messageKey = (m, idx) => m.id || m.wa_message_id || `msg-${idx}-${m.created_at}`;
// What in-chat search looks at: the readable text, not "[image]"-style
// placeholders or the encoded call-event bodies.
const searchableText = (m) => {
  const body = m.body || '';
  return /^\[\w+\]$/.test(body) || body.startsWith('__call_event__') ? '' : body;
};

function DateSeparator({ label }) {
  return (
    <div className="sticky top-0 z-10 my-3 flex justify-center">
      <div className="rounded-lg bg-white px-3 py-1 text-[12.5px] font-medium text-gray-600 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        {label}
      </div>
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
  const dialContact = useCallStore((s) => s.dial);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [applyingTag, setApplyingTag] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateParams, setTemplateParams] = useState([]);
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const tagsQ = useTags();
  const contactTagsQ = useContactTags();

  // Templates are loaded lazily — only when the picker is opened — so we don't
  // pay the round-trip cost for every chat that's still inside the 24h window.
  const templatesQ = useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: () => templatesApi.list(),
    enabled: showTemplatePicker,
    staleTime: 60_000,
  });

  // Tick once a minute so the "expires in" countdown stays fresh and the lock
  // engages the moment the 24h window rolls over while the chat is open.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Get tags applied to this contact
  // Note: contact_tags table references contacts.id, not whatsapp_contacts
  // The backend API handles the mapping between wa_id and contact_id
  const appliedTags = useMemo(() => {
    if (!contactTagsQ.data || !contact) return [];
    // Try to match by contact.id if available
    return contactTagsQ.data.filter((ct) => contact.id && ct.contact_id === contact.id).map((ct) => ct.tag_id);
  }, [contactTagsQ.data, contact]);
  const listRef = useRef(null);

  // Mark messages as read when chat window is open and messages are loaded
  // This runs whenever messages change or when the chat is viewed
  useEffect(() => {
    if (selectedWaId && messagesQ.data?.length) {
      // Get the latest message timestamp (most recent message)
      const sortedMessages = [...messagesQ.data].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
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

    const optimisticId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage = {
      id: optimisticId,
      wa_id: contact.wa_id,
      body: messageText,
      direction: 'outbound',
      message_type: 'text',
      created_at: new Date().toISOString(),
      ai_intent: null,
    };

    queryClient.setQueryData(['whatsapp_messages', selectedWaId], (oldData) => {
      const base = oldData ?? [];
      return [...base, optimisticMessage].sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      );
    });

    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);

    try {
      await whatsappApi.sendMessage({ to: contact.wa_id, message: messageText });

      // Refetch messages after a short delay to get the real message from backend
      setTimeout(async () => {
        await queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', selectedWaId] });
        await queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      }, 1000);

      localStorage.setItem(`lastRead_${selectedWaId}`, new Date().toISOString());
    } catch (error) {
      // Roll back the optimistic message so the user doesn't see a phantom send.
      queryClient.setQueryData(['whatsapp_messages', selectedWaId], (oldData) =>
        (oldData ?? []).filter((m) => m.id !== optimisticId),
      );
      toast.error(error.message || 'Failed to send message');
      setDraft(messageText);
    } finally {
      setSending(false);
    }
  }, [draft, contact, selectedWaId, sending, queryClient]);

  const closeTemplatePicker = useCallback(() => {
    setShowTemplatePicker(false);
    setSelectedTemplate(null);
    setTemplateParams([]);
    setTemplateSearch('');
  }, []);

  const onSendTemplate = useCallback(async () => {
    if (!selectedTemplate || !contact || !selectedWaId || sendingTemplate) return;
    if (!selectedTemplate.language) {
      toast.error('Template is missing a language and can\'t be sent.');
      return;
    }
    const bodyText = getTemplateBodyText(selectedTemplate);
    const paramCount = countTemplateParams(bodyText);
    const filled = templateParams.slice(0, paramCount).every((v) => (v || '').trim().length > 0);
    if (paramCount > 0 && !filled) {
      toast.error('Please fill in all template parameters.');
      return;
    }

    const components = paramCount > 0
      ? [{
          type: 'body',
          parameters: Array.from({ length: paramCount }, (_, i) => ({
            type: 'text',
            text: (templateParams[i] || '').trim(),
          })),
        }]
      : [];

    setSendingTemplate(true);
    try {
      await templatesApi.sendTest({
        to: contact.wa_id,
        template_name: selectedTemplate.name,
        language: selectedTemplate.language,
        components,
      });
      toast.success(`Sent "${selectedTemplate.name}"`);
      closeTemplatePicker();
      // Refresh messages so the outbound template appears in the thread.
      setTimeout(async () => {
        await queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', selectedWaId] });
        await queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      }, 800);
    } catch (e) {
      toast.error(e.message || 'Failed to send template');
    } finally {
      setSendingTemplate(false);
    }
  }, [selectedTemplate, contact, selectedWaId, sendingTemplate, templateParams, queryClient, closeTemplatePicker]);

  // The 24h "customer service window" opens on every inbound message from the
  // contact and closes 24h after the most recent one. Outside of it, WhatsApp
  // only allows pre-approved template messages — never freeform text/voice.
  const lastInboundAt = useMemo(() => {
    let latest = 0;
    for (const m of messagesQ.data ?? []) {
      if (m.direction !== 'inbound' || !m.created_at) continue;
      const t = new Date(m.created_at).getTime();
      if (Number.isFinite(t) && t > latest) latest = t;
    }
    return latest || null;
  }, [messagesQ.data]);

  // While messages are still loading we treat the window as open to avoid a
  // brief lock-flash on chat switch — once data arrives we re-evaluate.
  const windowOpen = messagesQ.isLoading
    ? true
    : lastInboundAt != null && now - lastInboundAt < WINDOW_MS;
  const windowExpiresIn = lastInboundAt ? lastInboundAt + WINDOW_MS - now : 0;

  // Dials the contact. IncomingCallNotification owns the peer connection and
  // the in-call UI for both directions, so this only hands over the request.
  // The window state travels with it: if the contact has not granted call
  // permission, the dialler can only ask for it while the window is open.
  const onCall = useCallback(() => {
    if (!contact || !selectedWaId) return;
    dialContact(contact.wa_id, contact.name || '', windowOpen);
  }, [contact, selectedWaId, dialContact, windowOpen]);

  // Sends the contact a tappable "Call ScoreSmart" message — it does NOT place
  // a call. Still the only way to reach someone who hasn't granted call
  // permission, so it keeps its own control rather than being the phone icon.
  const onSendCallButton = useCallback(async () => {
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

  const startRecording = useCallback(async () => {
    if (!contact || !selectedWaId) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Microphone not supported in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingSeconds(0);
        if (!audioChunksRef.current.length) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setSending(true);
        try {
          await whatsappApi.sendAudio({ to: contact.wa_id, audioBlob: blob });
          await queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', selectedWaId] });
          toast.success('Voice message sent');
        } catch {
          /* error already toasted by sendAudio */
        } finally {
          setSending(false);
        }
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast.error('Could not access microphone. Check browser permissions.');
    }
  }, [contact, selectedWaId, queryClient]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const draftRef = useRef(null);
  // Put the emoji where the cursor is, not always at the end, and keep typing.
  const insertEmoji = useCallback((emoji) => {
    const el = draftRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft((d) => d.slice(0, start) + emoji + d.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }, [draft.length]);


  // Deduplicate by wa_message_id only. Messages without a wa_message_id
  // (e.g. optimistic local placeholders) pass through untouched — content-based
  // dedup masks legitimately distinct messages that happen to share text.
  const deduplicatedMessages = useMemo(() => {
    const messages = messagesQ.data ?? [];
    if (messages.length === 0) return [];

    const seen = new Set();
    const result = [];
    for (const msg of messages) {
      const key = msg.wa_message_id;
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      result.push(msg);
    }
    return result;
  }, [messagesQ.data]);

  /* ── Scrolling ── open at the latest message, follow new ones while the
     user is at the bottom, and otherwise count them on the jump button. */
  const contentRef = useRef(null);
  const atBottomRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [unseenCount, setUnseenCount] = useState(0);
  const seenRef = useRef({ waId: null, count: 0 });

  const scrollToBottom = useCallback((smooth) => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const onListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
    if (near) setUnseenCount(0);
  }, []);

  useLayoutEffect(() => {
    const count = deduplicatedMessages.length;
    const prev = seenRef.current.waId === selectedWaId ? seenRef.current.count : 0;
    if (count > prev) {
      const added = deduplicatedMessages.slice(prev);
      if (prev === 0 || atBottomRef.current || added.some((m) => m.direction !== 'inbound')) {
        atBottomRef.current = true;
        scrollToBottom(prev !== 0);
      } else {
        setUnseenCount((c) => c + added.length);
      }
    }
    seenRef.current = { waId: selectedWaId, count };
  }, [deduplicatedMessages, selectedWaId, scrollToBottom]);

  // Photos and voice notes finish loading after the first scroll and push the
  // bottom down; stay pinned unless the user has scrolled away.
  useEffect(() => {
    const inner = contentRef.current;
    if (!inner || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => atBottomRef.current && scrollToBottom(false));
    ro.observe(inner);
    return () => ro.disconnect();
  }, [selectedWaId, messagesQ.isLoading, scrollToBottom]);

  /* ── In-chat search ── */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const query = searchQuery.trim().toLowerCase();

  const searchMatches = useMemo(() => {
    if (!query) return [];
    return deduplicatedMessages
      .map((m, idx) => (searchableText(m).toLowerCase().includes(query) ? messageKey(m, idx) : null))
      .filter(Boolean);
  }, [deduplicatedMessages, query]);

  // Start from the most recent match, as WhatsApp does.
  useEffect(() => {
    setMatchIndex(Math.max(searchMatches.length - 1, 0));
  }, [query, searchMatches.length]);

  const activeMatchKey = searchMatches[matchIndex] ?? null;
  useEffect(() => {
    if (!activeMatchKey || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-msg-key="${CSS.escape(activeMatchKey)}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeMatchKey]);

  // The contact info panel's Search button opens this chat's search.
  useEffect(
    () =>
      useChatStore.subscribe((state, prev) => {
        if (state.searchRequest !== prev.searchRequest) setSearchOpen(true);
      }),
    [],
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  useEffect(() => {
    closeSearch();
    setUnseenCount(0);
    atBottomRef.current = true;
    setAtBottom(true);
  }, [selectedWaId, closeSearch]);

  /* ── Files dropped on the chat or pasted into the box open the send preview ── */
  const [pendingFile, setPendingFile] = useState(null);
  const [dragging, setDragging] = useState(false);

  // Grow the message box with its content, up to a limit, like WhatsApp.
  useLayoutEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

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

  const canCompose = connected && windowOpen;
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

  return (
    <div
      className={cn('relative flex h-full min-w-0 flex-1 flex-col bg-brand-chatBg', className)}
      onDragOver={(e) => {
        if (!canCompose || !hasFiles(e)) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!canCompose || !hasFiles(e)) return;
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setPendingFile(file);
      }}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#F0F2F5]/90">
          <div className="rounded-2xl border-2 border-dashed border-[#25D366] bg-white px-10 py-8 text-center shadow-sm">
            <div className="text-[17px] font-medium text-[#111B21]">Drop to send</div>
            <div className="mt-1 text-[13px] text-[#667781]">Photos, videos and documents</div>
          </div>
        </div>
      ) : null}
      <div className="flex h-[60px] shrink-0 items-center justify-between border-l border-black/[0.08] bg-[#F0F2F5] px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold', avatarCls)}>
            {initialsFromName(name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[16px] leading-5 text-[#111B21]">{name}</div>
            {contact?.wa_id && contact?.name ? (
              <div className="truncate text-[13px] leading-4 text-[#667781]">{formatPhone(contact.wa_id)}</div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-0.5 text-[#54656F]">
          <button
            className={cn('rounded-full p-2 hover:bg-black/[0.06]', searchOpen && 'bg-black/[0.06]')}
            type="button"
            aria-label="Search messages"
            title="Search messages"
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
          >
            <Search className="h-5 w-5" />
          </button>
          {/* Places a WhatsApp voice call to this contact */}
          <button
            className="rounded-full p-2 hover:bg-black/[0.06]"
            type="button"
            aria-label="Call contact"
            title="Call this contact on WhatsApp"
            onClick={onCall}
          >
            <Phone className="h-5 w-5" />
          </button>
          {/* Sends a tappable call button so THEY can call us — needed when the
              contact hasn't granted permission for us to call them. */}
          <button
            className={cn(
              'rounded-full p-2 hover:bg-black/[0.06]',
              callingUser && 'animate-pulse cursor-wait text-[#25D366]',
            )}
            type="button"
            aria-label="Send call button"
            title="Send a call button so they can call you"
            onClick={onSendCallButton}
            disabled={callingUser}
          >
            <PhoneIncoming className="h-5 w-5" />
          </button>
          <button
            className="rounded-full p-2 hover:bg-black/[0.06]"
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
            <Tag className="h-5 w-5" />
          </button>
          {onToggleInfo && (
            <button
              className="rounded-full p-2 hover:bg-black/[0.06]"
              type="button"
              aria-label="Contact info"
              onClick={onToggleInfo}
            >
              <Info className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {searchOpen ? (
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-black/[0.06] bg-white px-4">
          <Search className="h-4 w-4 shrink-0 text-[#54656F]" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeSearch();
              // Enter steps to the older match, Shift+Enter to the newer one.
              if (e.key === 'Enter' && searchMatches.length) {
                e.preventDefault();
                const step = e.shiftKey ? 1 : -1;
                setMatchIndex((i) => (i + step + searchMatches.length) % searchMatches.length);
              }
            }}
            placeholder="Search messages"
            className="h-9 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[#111B21] shadow-none outline-none ring-0 placeholder:text-[#667781] focus:outline-none focus:ring-0"
          />
          {query ? (
            <span className="shrink-0 text-[13px] tabular-nums text-[#667781]">
              {searchMatches.length ? `${matchIndex + 1} of ${searchMatches.length}` : 'No results'}
            </span>
          ) : null}
          <div className="flex shrink-0 items-center text-[#54656F]">
            <button
              type="button"
              aria-label="Older match"
              disabled={searchMatches.length < 2}
              onClick={() => setMatchIndex((i) => (i - 1 + searchMatches.length) % searchMatches.length)}
              className="rounded-full p-1.5 hover:bg-black/[0.06] disabled:opacity-30"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Newer match"
              disabled={searchMatches.length < 2}
              onClick={() => setMatchIndex((i) => (i + 1) % searchMatches.length)}
              className="rounded-full p-1.5 hover:bg-black/[0.06] disabled:opacity-30"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Close search"
              onClick={closeSearch}
              className="rounded-full p-1.5 hover:bg-black/[0.06]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
      <div ref={listRef} onScroll={onListScroll} className="h-full overflow-auto bg-[#EFEAE2] px-4 py-3 sm:px-[6%] sm:py-4">
        {messagesQ.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-[55%]" />
            <Skeleton className="ml-auto h-10 w-[45%]" />
            <Skeleton className="h-10 w-[52%]" />
          </div>
        ) : (
          <>
            <div ref={contentRef} className="pb-1">
              {deduplicatedMessages.map((m, idx) => {
                const prev = deduplicatedMessages[idx - 1];
                const label = m.created_at ? dayLabel(m.created_at) : null;
                const newDay = label && (!prev?.created_at || dayLabel(prev.created_at) !== label);
                const groupStart = newDay || !prev || prev.direction !== m.direction;
                return (
                  <Fragment key={messageKey(m, idx)}>
                    {newDay ? <DateSeparator label={label} /> : null}
                    <div data-msg-key={messageKey(m, idx)}>
                      <MessageBubble
                        msg={m}
                        groupStart={groupStart}
                        highlight={query}
                        activeMatch={activeMatchKey === messageKey(m, idx)}
                      />
                    </div>
                  </Fragment>
                );
              })}
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
      {!atBottom ? (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to latest message"
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#54656F] shadow-[0_1px_3px_rgba(11,20,26,0.25)] hover:bg-gray-50 sm:right-6"
        >
          <ChevronDown className="h-6 w-6" />
          {unseenCount ? (
            <span className="absolute -right-1 -top-1.5 min-w-[20px] rounded-full bg-[#25D366] px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
              {unseenCount}
            </span>
          ) : null}
        </button>
      ) : null}
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
              <span className="font-medium">WhatsApp is not connected.</span> Go to the WhatsApp page to connect your
              Business account before sending messages.
            </div>
          </div>
        </div>
      ) : !windowOpen ? (
        <div className="border-t border-brand-border bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-4 sm:flex-row sm:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-600">24-hour window closed</div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
                You can only send approved templates as you are out of the 24-hour window. Wait for{' '}
                <span className="font-medium text-gray-500">{contact?.name || 'this contact'}</span> to reply, or pick a
                template below.
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setShowTemplatePicker(true)}
            >
              <FileText className="h-4 w-4" />
              Send template
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 bg-[#F0F2F5]">
          {windowExpiresIn > 0 && windowExpiresIn < 60 * 60 * 1000 && (
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/70 px-4 py-1.5 text-[11px] text-amber-700">
              <Clock className="h-3 w-3" />
              <span>
                24-hour window {formatRemaining(windowExpiresIn)} — after that, only templates can be sent.
              </span>
            </div>
          )}
          <div className="flex items-end gap-1 px-3 py-2 text-[#54656F]">
            <EmojiButton onPick={insertEmoji} disabled={recording} />
            <AttachButton
              to={contact?.wa_id}
              disabled={recording || !contact}
              file={pendingFile}
              onFileChange={setPendingFile}
              onTemplate={() => setShowTemplatePicker(true)}
              onCallButton={onSendCallButton}
              onSent={() => {
                queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', selectedWaId] });
                setTimeout(() => {
                  if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
                }, 300);
              }}
            />

            <div className="mx-1 flex-1">
              <Textarea
                ref={draftRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends, Shift+Enter starts a new line.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                onPaste={(e) => {
                  const file = e.clipboardData?.files?.[0];
                  if (file) {
                    e.preventDefault();
                    setPendingFile(file);
                  }
                }}
                placeholder={recording ? `Recording… ${recordingSeconds}s` : 'Type a message'}
                className="min-h-[42px] max-h-[140px] resize-none overflow-y-auto rounded-lg border-0 bg-white px-3 py-[10px] text-[15px] leading-5 placeholder:text-[#667781] focus:ring-0"
                rows={1}
                disabled={recording}
              />
            </div>

            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-red-500 text-white animate-pulse hover:bg-red-600 active:scale-95"
                aria-label="Stop recording"
                title="Stop and send voice message"
              >
                <StopCircle className="h-5 w-5" />
              </button>
            ) : draft.trim() ? (
              <button
                type="button"
                onClick={onSend}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#25D366] text-white transition-all duration-150 hover:bg-[#1fb85a] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send"
                disabled={sending}
              >
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full transition-all duration-150 hover:bg-black/[0.06] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Record voice message"
                title="Hold to record voice message"
                disabled={sending}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
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
            ) : tagsQ.data && tagsQ.data.length > 0 ? (
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
                        isApplied ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50',
                      )}
                    >
                      <span
                        className={cn(
                          'h-3 w-3 rounded-full',
                          tag.color === 'green'
                            ? 'bg-green-500'
                            : tag.color === 'blue'
                              ? 'bg-blue-500'
                              : tag.color === 'purple'
                                ? 'bg-purple-500'
                                : tag.color === 'orange'
                                  ? 'bg-amber-500'
                                  : tag.color === 'red'
                                    ? 'bg-red-500'
                                    : 'bg-gray-500',
                        )}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{tag.name}</div>
                        {tag.description && <div className="text-xs text-gray-500">{tag.description}</div>}
                      </div>
                      {isApplied && <span className="text-xs text-green-600 font-medium">Applied</span>}
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

      {/* Template Picker Dialog — used when the 24h window is closed */}
      <Dialog
        open={showTemplatePicker}
        onOpenChange={(open) => (open ? setShowTemplatePicker(true) : closeTemplatePicker())}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setTemplateParams([]);
                  }}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Back to templates"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {selectedTemplate ? `Send "${selectedTemplate.name}"` : 'Send a template'}
            </DialogTitle>
          </DialogHeader>

          {!selectedTemplate ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Approved WhatsApp templates can be sent at any time, including outside the 24-hour window.
              </p>
              <Input
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates..."
              />
              <div className="max-h-[360px] overflow-y-auto">
                {templatesQ.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : templatesQ.error ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-500">Failed to load templates.</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => templatesQ.refetch()}>
                      Try again
                    </Button>
                  </div>
                ) : (() => {
                  const list = (templatesQ.data ?? []).filter((t) => t.status === 'APPROVED');
                  const q = templateSearch.trim().toLowerCase();
                  const filtered = q ? list.filter((t) => (t.name || '').toLowerCase().includes(q)) : list;
                  if (!list.length) {
                    return (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">No approved templates yet</p>
                        <p className="mt-1 text-xs text-gray-400">
                          Submit and approve templates from the Templates page to use them here.
                        </p>
                      </div>
                    );
                  }
                  if (!filtered.length) {
                    return (
                      <div className="py-8 text-center text-sm text-gray-500">
                        No templates match "{templateSearch}".
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {filtered.map((t) => {
                        const body = getTemplateBodyText(t);
                        const paramCount = countTemplateParams(body);
                        return (
                          <button
                            key={t.id || t.name}
                            type="button"
                            onClick={() => {
                              setSelectedTemplate(t);
                              setTemplateParams(Array.from({ length: paramCount }, () => ''));
                            }}
                            className="flex w-full flex-col gap-1 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-brand-accent hover:bg-green-50/40"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="truncate text-sm font-medium text-gray-900">{t.name}</div>
                              <div className="shrink-0 text-[10px] uppercase tracking-wide text-gray-400">
                                {t.language || 'en_US'}
                                {paramCount > 0 ? ` · ${paramCount} var` : ''}
                              </div>
                            </div>
                            {body && (
                              <div className="line-clamp-2 text-xs text-gray-500">{body}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (() => {
            const bodyText = getTemplateBodyText(selectedTemplate);
            const paramCount = countTemplateParams(bodyText);
            return (
              <div className="space-y-4">
                {bodyText && (
                  <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-gray-400">Preview</div>
                    {bodyText}
                  </div>
                )}
                <div className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500">
                  Sending to <span className="font-medium text-gray-700">{contact?.name || contact?.wa_id}</span>{' '}
                  <span className="text-gray-400">({contact?.wa_id})</span>
                </div>
                {paramCount > 0 && (
                  <div className="space-y-2">
                    {Array.from({ length: paramCount }, (_, i) => (
                      <div key={i} className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">{`Parameter {{${i + 1}}}`}</label>
                        <Input
                          value={templateParams[i] || ''}
                          onChange={(e) => {
                            const next = [...templateParams];
                            next[i] = e.target.value;
                            setTemplateParams(next);
                          }}
                          placeholder={`Value for {{${i + 1}}}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={closeTemplatePicker} disabled={sendingTemplate}>
                    Cancel
                  </Button>
                  <Button onClick={onSendTemplate} disabled={sendingTemplate}>
                    {sendingTemplate ? 'Sending...' : 'Send template'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

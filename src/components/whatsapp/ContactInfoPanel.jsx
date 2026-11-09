import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Link2,
  Target,
  Megaphone,
  Pencil,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Plus,
  Search,
  Tag,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn, initialsFromName, pastelClassFromString, formatRelativeTime, formatPhone } from '../../lib/utils';
import { useChatStore } from '../../store/chatStore';
import { useCallStore } from '../../store/callStore';
import { useAuthStore } from '../../store/authStore';
import { useContacts, useMessages, useTags, useContactTags, useStudent } from '../../lib/dataHooks';
import { whatsappApi, notesApi, tagsApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { ENV } from '../../lib/env';
import { MediaThumb } from './MessageBubble';
import { tagDot } from '../../lib/tagColors';

const WINDOW_MS = 24 * 60 * 60 * 1000;


const SOURCE_LABEL = { META: 'Meta ad', TIKTOK: 'TikTok ad', manual: 'Added manually', ad: 'Ad' };

function fmtDay(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(d) {
  if (!d || !String(d).includes('T')) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const t = dt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return t === '12:00 am' ? '' : t;
}

// Compact collapsible class row: tutor avatar + date + time when collapsed;
// tap to reveal the session summary, the tutor's notes / next steps and the
// recording, transcript and join links (the tutor panel's per-session detail).
function SessionCard({ s }) {
  const [open, setOpen] = useState(false);
  const links = [
    s.recording_link ? { href: s.recording_link, label: 'Recording', icon: Video } : null,
    s.transcript_link ? { href: s.transcript_link, label: 'Transcript', icon: FileText } : null,
    s.meet_link ? { href: s.meet_link, label: 'Join', icon: Link2 } : null,
  ].filter(Boolean);
  const hasDetail = Boolean(s.summary || s.note || s.next_steps || links.length);
  const time = fmtTime(s.date);
  const sub = [s.tutor ? `with ${s.tutor}` : '', s.subject || '', s.status || '']
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="rounded-lg bg-[#F5F6F6]">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={cn('flex w-full items-center gap-2.5 px-2 py-1.5 text-left', !hasDetail && 'cursor-default')}
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
            pastelClassFromString(s.tutor || 'Tutor'),
          )}
        >
          {initialsFromName(s.tutor || '·')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-[#111B21]">
            {fmtDay(s.date) || 'Session'}
            {time ? ` · ${time}` : ''}
          </span>
          {sub ? <span className="block truncate text-[11px] text-[#667781]">{sub}</span> : null}
        </span>
        {hasDetail ? (
          <ChevronRight
            className={cn('h-4 w-4 shrink-0 text-[#8696A0] transition-transform', open && 'rotate-90')}
          />
        ) : null}
      </button>
      {open && hasDetail ? (
        <div className="space-y-1.5 px-2 pb-2.5 pl-[42px] text-[12px] leading-snug">
          {s.summary ? <div className="text-[#3B4A54]">{s.summary}</div> : null}
          {s.note ? <div className="text-[#111B21]">{s.note}</div> : null}
          {s.next_steps ? (
            <div className="text-[#667781]">
              <span className="font-medium">Next:</span> {s.next_steps}
            </div>
          ) : null}
          {links.length ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
              {links.map((l, i) => {
                const LinkIcon = l.icon;
                return (
                  <a
                    key={i}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#027EB5] hover:underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    {l.label}
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, action, children, className }) {
  return (
    <section className={cn('mb-2.5 bg-white px-6 py-4 shadow-[0_1px_3px_rgba(11,20,26,0.08)]', className)}>
      {title ? (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] text-[#667781]">{title}</h3>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function InfoRow({ icon, label, value, mono }) {
  const Icon = icon;
  return (
    <div className="flex items-start gap-4 py-2">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#8696A0]" />
      <div className="min-w-0">
        <div className={cn('break-words text-[15px] text-[#111B21]', mono && 'font-mono text-[13px]')}>{value}</div>
        <div className="text-[13px] text-[#667781]">{label}</div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl border border-[#E9EDEF] bg-white px-2 pb-2.5 pt-3 text-[#111B21] transition-colors hover:bg-[#F5F6F6] active:bg-[#E9EDEF] disabled:opacity-50"
    >
      <Icon className="h-5 w-5 text-[#00A884]" />
      <span className="truncate text-[13px] font-medium">{label}</span>
    </button>
  );
}

function formatCallLength(seconds) {
  if (!seconds) return '';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ContactInfoPanel({ onClose }) {
  const selectedWaId = useChatStore((s) => s.selectedWaId);
  const requestChatSearch = useChatStore((s) => s.requestChatSearch);
  const dialContact = useCallStore((s) => s.dial);
  const workspaceId = useAuthStore((s) => s.profile?.workspace_id);

  const contactsQ = useContacts();
  const messagesQ = useMessages(selectedWaId);
  const tagsQ = useTags();
  const contactTagsQ = useContactTags();
  const queryClient = useQueryClient();

  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [addingTagId, setAddingTagId] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [sendingCallButton, setSendingCallButton] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);

  const contact = useMemo(
    () => (contactsQ.data ?? []).find((c) => c.wa_id === selectedWaId) ?? null,
    [contactsQ.data, selectedWaId],
  );

  const name = contact?.name || formatPhone(contact?.wa_id) || '—';
  const avatarCls = pastelClassFromString(contact?.wa_id ?? contact?.id);
  const displayPhone = contact?.wa_id ? `+${String(contact.wa_id).replace(/^\+/, '')}` : '';

  const appliedTags = useMemo(() => {
    if (!tagsQ.data || !contactTagsQ.data || !contact) return [];
    const ids = new Set(contactTagsQ.data.filter((ct) => contact.id && ct.contact_id === contact.id).map((ct) => ct.tag_id));
    return tagsQ.data.filter((tag) => ids.has(tag.id));
  }, [tagsQ.data, contactTagsQ.data, contact]);

  // The LMS → tags sync applies an "Enrolled" label to students; surface it as a badge.
  const enrolledTag = useMemo(
    () => appliedTags.find((t) => /enrol/i.test(t.name || '')),
    [appliedTags],
  );

  // LMS student record (course, sessions, notes, recordings) matched by phone.
  // Inert/empty until the backend endpoint + LMS key are live; only shows for
  // contacts that match an enrolled student.
  const studentQ = useStudent(selectedWaId);
  const student = studentQ.data?.found ? studentQ.data : null;

  const availableTags = useMemo(() => {
    const appliedIds = new Set(appliedTags.map((t) => t.id));
    return (tagsQ.data ?? []).filter((t) => !appliedIds.has(t.id));
  }, [tagsQ.data, appliedTags]);

  /* ── Media, links and docs, from the messages already loaded for the chat ── */
  const shared = useMemo(() => {
    const media = [];
    const docs = [];
    const links = [];
    for (const m of messagesQ.data ?? []) {
      const type = m.message_type;
      if ((type === 'image' || type === 'video') && (m.media_id || m.media_url)) media.push(m);
      else if (type === 'document' && (m.media_id || m.media_url)) docs.push(m);
      const found = (m.body || '').match(/(?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]!?]/gi);
      if (found && type !== 'location') links.push(...found);
    }
    return { media: media.reverse(), docs: docs.reverse(), links: [...new Set(links)].reverse() };
  }, [messagesQ.data]);
  const sharedCount = shared.media.length + shared.docs.length + shared.links.length;

  /* ── 24-hour customer service window ── */
  const lastInboundAt = useMemo(() => {
    let latest = 0;
    for (const m of messagesQ.data ?? []) {
      if (m.direction !== 'inbound' || !m.created_at) continue;
      const t = new Date(m.created_at).getTime();
      if (Number.isFinite(t) && t > latest) latest = t;
    }
    return latest || null;
  }, [messagesQ.data]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const windowLeft = lastInboundAt ? lastInboundAt + WINDOW_MS - now : 0;
  const windowText =
    windowLeft > 0
      ? `Open · ${Math.floor(windowLeft / 3600000)}h ${Math.floor((windowLeft % 3600000) / 60000)}m left`
      : 'Closed · templates only';

  // WhatsApp refuses a business-initiated call until the contact allows it, so
  // whether we may call is worth showing next to the Call button rather than
  // discovering it after tapping.
  const permissionQ = useQuery({
    queryKey: ['whatsapp_call_permission', selectedWaId],
    enabled: Boolean(selectedWaId),
    queryFn: () => whatsappApi.getCallPermission(selectedWaId),
    staleTime: 60_000,
    retry: false,
  });
  const permission = permissionQ.data;
  const permissionText = !permission
    ? '—'
    : permission.can_call
      ? permission.state === 'granted_permanent'
        ? 'Allowed'
        : 'Allowed · 7 days'
      : permission.state === 'declined'
        ? 'Declined'
        : permission.state === 'expired'
          ? 'Expired · ask again'
          : 'Not asked yet';

  /* ── Calls ── */
  const callsQ = useQuery({
    queryKey: ['whatsapp_calls', selectedWaId],
    enabled: Boolean(selectedWaId),
    queryFn: () => whatsappApi.getCallHistory({ limit: 10 }),
    // An empty response body arrives as {}, which is truthy but has no .filter.
    select: (data) => (Array.isArray(data) ? data : (data?.calls ?? data?.data ?? [])),
    staleTime: 5000,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const contactCalls = useMemo(() => {
    if (!callsQ.data || !selectedWaId) return [];
    return callsQ.data.filter((c) => c.from_number === selectedWaId || c.to_number === selectedWaId);
  }, [callsQ.data, selectedWaId]);

  // Toast when a new incoming call from this contact appears.
  const prevLatestCallIdRef = useRef(null);
  useEffect(() => {
    if (!contactCalls.length || !selectedWaId) {
      prevLatestCallIdRef.current = null;
      return;
    }
    const latest = [...contactCalls].sort(
      (a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp),
    )[0];
    if (latest?.id && latest.id !== prevLatestCallIdRef.current) {
      if (
        prevLatestCallIdRef.current !== null &&
        latest.direction === 'USER_INITIATED' &&
        latest.from_number === selectedWaId
      ) {
        toast.success(`Incoming call from ${contact?.name || formatPhone(selectedWaId)}`, { icon: '📞', duration: 5000 });
      }
      prevLatestCallIdRef.current = latest.id;
    }
  }, [contactCalls, selectedWaId, contact?.name]);

  /* ── Notes ── */
  const notesQ = useQuery({
    queryKey: ['contact_notes', selectedWaId],
    enabled: Boolean(selectedWaId),
    queryFn: () => notesApi.list(selectedWaId),
  });

  const handleAddNote = useCallback(async () => {
    if (!noteText.trim() || !selectedWaId) return;
    setSavingNote(true);
    try {
      await notesApi.create(selectedWaId, noteText.trim());
      setNoteText('');
      await queryClient.invalidateQueries({ queryKey: ['contact_notes', selectedWaId] });
      toast.success('Note added');
    } catch (err) {
      toast.error(err.message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  }, [noteText, selectedWaId, queryClient]);

  const handleDeleteNote = useCallback(
    async (noteId) => {
      try {
        await notesApi.delete(selectedWaId, noteId);
        await queryClient.invalidateQueries({ queryKey: ['contact_notes', selectedWaId] });
        toast.success('Note deleted');
      } catch (err) {
        toast.error(err.message || 'Failed to delete note');
      }
    },
    [selectedWaId, queryClient],
  );

  /* ── Labels ── */
  const handleAddTag = useCallback(
    async (tagId) => {
      if (!selectedWaId) return;
      setAddingTagId(tagId);
      try {
        await tagsApi.applyToContact(selectedWaId, tagId);
        await queryClient.invalidateQueries({ queryKey: ['contact_tags'] });
        toast.success('Label added');
      } catch (err) {
        toast.error(err.message || 'Failed to add label');
      } finally {
        setAddingTagId(null);
        setShowTagMenu(false);
      }
    },
    [selectedWaId, queryClient],
  );

  const handleRemoveTag = useCallback(
    async (tagId) => {
      if (!selectedWaId) return;
      try {
        await tagsApi.removeFromContact(selectedWaId, tagId);
        await queryClient.invalidateQueries({ queryKey: ['contact_tags'] });
        toast.success('Label removed');
      } catch (err) {
        toast.error(err.message || 'Failed to remove label');
      }
    },
    [selectedWaId, queryClient],
  );

  /* ── Name ── */
  const startEditingName = () => {
    setNameDraft(contact?.name || '');
    setEditingName(true);
  };

  const saveName = useCallback(async () => {
    const next = nameDraft.trim();
    if (!contact?.wa_id || !next || next === contact.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      if (!ENV.USE_MOCK) {
        let q = supabase.from('whatsapp_contacts').update({ name: next }).eq('wa_id', contact.wa_id);
        if (workspaceId) q = q.eq('workspace_id', workspaceId);
        const { error } = await q;
        if (error) throw error;
      }
      queryClient.setQueryData(['whatsapp_contacts'], (old) =>
        Array.isArray(old) ? old.map((c) => (c.wa_id === contact.wa_id ? { ...c, name: next } : c)) : old,
      );
      queryClient.invalidateQueries({ queryKey: ['whatsapp_contacts'] });
      toast.success('Name updated');
      setEditingName(false);
    } catch (err) {
      toast.error(err.message || 'Could not update the name');
    } finally {
      setSavingName(false);
    }
  }, [nameDraft, contact, workspaceId, queryClient]);

  /* ── Actions ── */
  const onCall = () => contact?.wa_id && dialContact(contact.wa_id, contact.name || '', windowLeft > 0);

  const onSendCallButton = async () => {
    if (!contact?.wa_id || sendingCallButton) return;
    setSendingCallButton(true);
    try {
      await whatsappApi.sendCallButton({
        to: contact.wa_id,
        message: `Hi ${contact.name || ''}! Tap below to call us on WhatsApp.`.trim(),
        displayText: 'Call ScoreSmart',
      });
      toast.success('Call button sent');
      queryClient.invalidateQueries({ queryKey: ['whatsapp_messages', selectedWaId] });
    } catch {
      // sendCallButton already shows the error
    } finally {
      setSendingCallButton(false);
    }
  };

  const mediaToShow = showAllMedia ? shared.media : shared.media.slice(0, 3);

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col border-l border-[#E9EDEF] bg-[#F0F2F5] sm:w-[340px]">
      <div className="flex h-[60px] shrink-0 items-center gap-6 bg-[#F0F2F5] px-4">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#54656F] hover:bg-black/[0.06]"
            aria-label="Close contact info"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
        <span className="text-[16px] text-[#111B21]">Contact info</span>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Profile */}
        <Card className="flex flex-col items-center pb-5 pt-7">
          <div
            className={cn(
              'flex h-[120px] w-[120px] items-center justify-center rounded-full text-[40px] font-semibold',
              avatarCls,
            )}
          >
            {initialsFromName(name)}
          </div>

          {editingName ? (
            <div className="mt-4 flex w-full items-center gap-2 border-b-2 border-[#00A884] pb-1">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                maxLength={100}
                placeholder="Contact name"
                className="min-w-0 flex-1 border-0 bg-transparent text-[17px] text-[#111B21] outline-none ring-0 focus:ring-0"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={savingName}
                aria-label="Save name"
                className="rounded-full p-1 text-[#00A884] hover:bg-black/[0.06] disabled:opacity-50"
              >
                <Check className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditingName}
              className="group mt-4 flex max-w-full items-center gap-2"
              title="Edit name"
            >
              <span className="truncate text-[22px] leading-7 text-[#111B21]">{name}</span>
              <Pencil className="h-4 w-4 shrink-0 text-[#8696A0] opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
          {displayPhone ? <div className="mt-1 text-[16px] text-[#667781]">{displayPhone}</div> : null}

          {enrolledTag ? (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#E7FCE3] px-2.5 py-1 text-[13px] font-medium text-[#008069]">
              <GraduationCap className="h-3.5 w-3.5" />
              Enrolled student
            </div>
          ) : null}

          <div className="mt-5 flex gap-3">
            <ActionButton icon={Phone} label="Call" onClick={onCall} disabled={!contact} />
            <ActionButton
              icon={PhoneIncoming}
              label={sendingCallButton ? 'Sending…' : 'Call link'}
              onClick={onSendCallButton}
              disabled={!contact || sendingCallButton}
            />
            <ActionButton icon={Search} label="Search" onClick={requestChatSearch} disabled={!contact} />
          </div>
        </Card>

        {student ? (
          <Card title="Course & sessions">
            {/* Courses: subject, status, and the expiries (course + group class) */}
            {(student.courses || []).map((c, i) => {
              const courseExp = c.course_expiry || c.expiry;
              const courseExpired = courseExp && new Date(courseExp).getTime() < Date.now();
              const groupExpired = c.group_expiry && new Date(c.group_expiry).getTime() < Date.now();
              return (
                <div key={i} className="mb-2 border-b border-[#F0F2F3] pb-2 last:mb-0 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-[14px] font-medium text-[#111B21]">
                      <GraduationCap className="h-4 w-4 shrink-0 text-[#8696A0]" />
                      <span className="truncate">{c.subject || 'Course'}</span>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                        c.status === 'active' ? 'bg-[#E7FCE3] text-[#008069]' : 'bg-[#E9EDEF] text-[#667781]',
                      )}
                    >
                      {c.status || '—'}
                    </span>
                  </div>
                  <div className="mt-1 grid gap-0.5 pl-6 text-[12px] text-[#667781]">
                    {courseExp ? (
                      <span className={courseExpired ? 'font-medium text-[#E53935]' : ''}>
                        Course {courseExpired ? 'expired' : 'expires'} {fmtDay(courseExp)}
                      </span>
                    ) : null}
                    {c.group_expiry ? (
                      <span className={groupExpired ? 'font-medium text-[#E53935]' : ''}>
                        Group class {groupExpired ? 'expired' : 'expires'} {fmtDay(c.group_expiry)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {/* Desired / previous score and exam date — one compact line */}
            {student.target_score || student.previous_score || student.exam_deadline || student.courses?.[0]?.exam_date ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-[13px] text-[#667781]">
                {student.target_score ? (
                  <span className="inline-flex items-center gap-1">
                    <Target className="h-3.5 w-3.5 text-[#8696A0]" />
                    Target <b className="text-[#111B21]">{student.target_score}</b>
                  </span>
                ) : null}
                {student.previous_score ? (
                  <span>
                    Previous <b className="text-[#111B21]">{student.previous_score}</b>
                  </span>
                ) : null}
                {student.exam_deadline || student.courses?.[0]?.exam_date ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#8696A0]" />
                    Exam <b className="text-[#111B21]">{fmtDay(student.exam_deadline || student.courses[0].exam_date)}</b>
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* One-to-one session allowance */}
            <div className="py-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#667781]">One-to-one sessions</span>
                <span className="font-medium text-[#111B21]">
                  {student.sessions.used}/{student.sessions.quota} used · {student.sessions.remaining} left
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E9EDEF]">
                <div
                  className="h-full rounded-full bg-[#25D366]"
                  style={{
                    width: `${
                      student.sessions.quota
                        ? Math.min(100, Math.round((student.sessions.used / student.sessions.quota) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
              {student.sessions.completed || student.sessions.booked ? (
                <div className="mt-1 text-[12px] text-[#8696A0]">
                  {student.sessions.completed ? `${student.sessions.completed} completed` : ''}
                  {student.sessions.completed && student.sessions.booked ? ' · ' : ''}
                  {student.sessions.booked ? `${student.sessions.booked} booked` : ''}
                </div>
              ) : null}
            </div>

            {/* Upcoming classes (tap a row to open it) */}
            {(student.upcoming_sessions || []).length ? (
              <div className="pt-1">
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8696A0]">
                  Upcoming
                </div>
                <div className="space-y-1">
                  {student.upcoming_sessions.slice(0, 5).map((s, i) => (
                    <SessionCard key={i} s={s} />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Previous classes — tap to reveal notes + recording */}
            {(student.past_sessions || []).length ? (
              <div className="pt-2">
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[#8696A0]">
                  Previous classes
                </div>
                <div className="space-y-1">
                  {student.past_sessions.slice(0, 15).map((s, i) => (
                    <SessionCard key={i} s={s} />
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}

        {/* Details */}
        <Card title="About">
          <InfoRow
            icon={Clock}
            label="24-hour window"
            value={<span className={windowLeft > 0 ? 'text-[#008069]' : 'text-[#667781]'}>{windowText}</span>}
          />
          <InfoRow
            icon={PhoneOutgoing}
            label="Calling them"
            value={
              <span className={permission?.can_call ? 'text-[#008069]' : 'text-[#667781]'}>{permissionText}</span>
            }
          />
          {contact?.source ? (
            <InfoRow icon={Megaphone} label="Source" value={SOURCE_LABEL[contact.source] || contact.source} />
          ) : null}
          {contact?.campaign_name ? <InfoRow icon={Megaphone} label="Campaign" value={contact.campaign_name} /> : null}
          {contact?.ad_id ? <InfoRow icon={Tag} label="Ad ID" value={contact.ad_id} mono /> : null}
          {contact?.first_seen ? (
            <InfoRow
              icon={Clock}
              label="First message"
              value={new Date(contact.first_seen).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
          ) : null}
        </Card>

        {/* Media, links and docs */}
        <Card
          title="Media, links and docs"
          action={
            shared.media.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAllMedia((v) => !v)}
                className="flex items-center gap-1 text-[14px] text-[#667781] hover:text-[#111B21]"
              >
                {showAllMedia ? 'Show less' : sharedCount}
                <ChevronRight className={cn('h-4 w-4 transition-transform', showAllMedia && 'rotate-90')} />
              </button>
            ) : sharedCount ? (
              <span className="text-[14px] text-[#667781]">{sharedCount}</span>
            ) : null
          }
        >
          {sharedCount === 0 ? (
            <p className="text-[14px] text-[#8696A0]">No media, links or documents yet</p>
          ) : (
            <div className="space-y-3">
              {mediaToShow.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {mediaToShow.map((m) => (
                    <MediaThumb key={m.id || m.wa_message_id} msg={m} className="aspect-square w-full" />
                  ))}
                </div>
              ) : null}
              {shared.docs.slice(0, showAllMedia ? undefined : 2).map((m) => (
                <div key={m.id || m.wa_message_id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#F0F2F5] text-[#7F66FF]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] text-[#111B21]">
                      {/^\[\w+\]$/.test(m.body || '') ? 'Document' : m.body}
                    </div>
                    <div className="text-[12px] text-[#667781]">{formatRelativeTime(m.created_at)}</div>
                  </div>
                </div>
              ))}
              {shared.links.slice(0, showAllMedia ? undefined : 2).map((link) => (
                <a
                  key={link}
                  href={/^https?:\/\//i.test(link) ? link : `https://${link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#F0F2F5] text-[#027EB5]">
                    <Link2 className="h-5 w-5" />
                  </span>
                  <span className="truncate text-[14px] text-[#027EB5] hover:underline">{link}</span>
                </a>
              ))}
            </div>
          )}
        </Card>

        {/* Labels */}
        <Card
          title="Labels"
          action={
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTagMenu((v) => !v)}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[14px] text-[#008069] hover:bg-[#F0F2F5]"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
              {showTagMenu ? (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTagMenu(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-lg bg-white py-1 shadow-[0_2px_8px_rgba(11,20,26,0.2)]">
                    {availableTags.length === 0 ? (
                      <div className="px-4 py-2.5 text-[14px] text-[#8696A0]">No more labels</div>
                    ) : (
                      availableTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          disabled={addingTagId === tag.id}
                          onClick={() => handleAddTag(tag.id)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14.5px] text-[#111B21] hover:bg-[#F5F6F6] disabled:opacity-50"
                        >
                          <span {...tagDot(tag.color, 'h-3 w-3 shrink-0 rounded-full')} />
                          {tag.name}
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : null}
            </div>
          }
        >
          {appliedTags.length === 0 ? (
            <p className="text-[14px] text-[#8696A0]">No labels</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {appliedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="group inline-flex items-center gap-2 rounded-full bg-[#F0F2F5] py-1 pl-2.5 pr-1.5 text-[14px] text-[#111B21]"
                >
                  <span {...tagDot(tag.color, 'h-2.5 w-2.5 rounded-full')} />
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="rounded-full p-0.5 text-[#8696A0] hover:bg-black/[0.08] hover:text-[#111B21]"
                    aria-label={`Remove ${tag.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Notes */}
        <Card title="Notes">
          <textarea
            placeholder="Add a private note — the contact won't see it"
            className="min-h-[72px] w-full resize-none rounded-lg border-0 bg-[#F0F2F5] px-3 py-2 text-[14px] text-[#111B21] placeholder:text-[#8696A0] focus:outline-none focus:ring-2 focus:ring-[#00A884]/30"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          {noteText.trim() ? (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleAddNote}
                disabled={savingNote}
                className="rounded-full bg-[#00A884] px-4 py-1.5 text-[14px] font-medium text-white hover:bg-[#008F72] disabled:opacity-50"
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </button>
            </div>
          ) : null}
          <div className="mt-3 space-y-2">
            {notesQ.isLoading ? (
              <div className="h-10 animate-pulse rounded-lg bg-[#F0F2F5]" />
            ) : (
              (notesQ.data ?? []).map((n) => (
                <div key={n.id} className="group rounded-lg bg-[#FFF8D8] px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="whitespace-pre-wrap break-words text-[14px] text-[#111B21]">{n.note}</div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(n.id)}
                      className="shrink-0 rounded p-0.5 text-[#8696A0] opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-0.5 text-[12px] text-[#8696A0]">
                    {n.created_at ? formatRelativeTime(n.created_at) : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Calls */}
        <Card title="Calls">
          {callsQ.isLoading ? (
            <div className="h-10 animate-pulse rounded-lg bg-[#F0F2F5]" />
          ) : contactCalls.length === 0 ? (
            <p className="text-[14px] text-[#8696A0]">No calls yet</p>
          ) : (
            <div className="divide-y divide-[#F0F2F5]">
              {contactCalls.map((call) => {
                const incoming = call.direction === 'USER_INITIATED';
                // Each call has a row per event (connect, terminate…); only an
                // ended call with no talk time was missed.
                const event = String(call.event || '').toLowerCase();
                const missed = event === 'terminate' && !call.duration;
                const Icon = missed ? PhoneMissed : incoming ? PhoneIncoming : PhoneOutgoing;
                const what = call.duration || event === 'terminate' ? 'voice call' : `call · ${event || 'update'}`;
                return (
                  <div key={call.id} className="flex items-center gap-3 py-2">
                    <Icon className={cn('h-4 w-4 shrink-0', missed ? 'text-red-500' : 'text-[#00A884]')} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] text-[#111B21]">
                        {missed ? 'Missed' : incoming ? 'Incoming' : 'Outgoing'} {what}
                      </div>
                      <div className="text-[12px] text-[#667781]">
                        {formatRelativeTime(call.created_at || call.timestamp)}
                      </div>
                    </div>
                    {call.duration ? (
                      <span className="text-[13px] tabular-nums text-[#667781]">{formatCallLength(call.duration)}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

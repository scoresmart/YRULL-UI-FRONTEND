import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { ChevronDown, Pencil, Plus, X, PhoneIncoming, PhoneOutgoing, Trash2 } from 'lucide-react';
import { cn, initialsFromName, pastelClassFromString, formatRelativeTime, formatPhone } from '../../lib/utils';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { useChatStore } from '../../store/chatStore';
import { useContactStore } from '../../store/contactStore';
import { useContacts, useTags, useContactTags } from '../../lib/dataHooks';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappApi, notesApi } from '../../lib/api';
import toast from 'react-hot-toast';

const Section = memo(function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </div>
  );
});

export function ContactInfoPanel({ onClose }) {
  const selectedWaId = useChatStore((s) => s.selectedWaId);
  const setSelectedContactId = useContactStore((s) => s.setSelectedContactId);

  const contactsQ = useContacts();
  const tagsQ = useTags();
  const contactTagsQ = useContactTags();
  const queryClient = useQueryClient();

  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const contact = useMemo(
    () => (contactsQ.data ?? []).find((c) => c.wa_id === selectedWaId) ?? null,
    [contactsQ.data, selectedWaId],
  );

  // Get tags applied to this contact
  const appliedTags = useMemo(() => {
    if (!tagsQ.data || !contactTagsQ.data || !contact) return [];

    // Find contact_tags that match this contact
    const matchingTagIds = contactTagsQ.data
      .filter((ct) => contact.id && ct.contact_id === contact.id)
      .map((ct) => ct.tag_id);

    // Get the full tag objects
    return tagsQ.data.filter((tag) => matchingTagIds.includes(tag.id));
  }, [tagsQ.data, contactTagsQ.data, contact]);

  const name = contact?.name || formatPhone(contact?.wa_id) || '—';
  const avatarCls = pastelClassFromString(contact?.wa_id ?? contact?.id);
  const displayPhone = formatPhone(contact?.wa_id || contact?.phone);

  // Fetch call history with auto-refresh every 10 seconds to catch new incoming calls
  const callsQ = useQuery({
    queryKey: ['whatsapp_calls', selectedWaId],
    enabled: Boolean(selectedWaId),
    queryFn: () => whatsappApi.getCallHistory({ limit: 10 }),
    staleTime: 5000, // Consider fresh for 5s to prevent refetch on every render
    refetchInterval: 10000, // Refetch every 10 seconds to catch new calls
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
  });

  // Fetch notes for this contact
  const notesQ = useQuery({
    queryKey: ['contact_notes', selectedWaId],
    enabled: Boolean(selectedWaId),
    queryFn: () => notesApi.list(selectedWaId),
  });

  // Filter calls for this contact
  const contactCalls = useMemo(() => {
    if (!callsQ.data || !selectedWaId) return [];
    return callsQ.data.filter((c) => c.from_number === selectedWaId || c.to_number === selectedWaId);
  }, [callsQ.data, selectedWaId]);

  // Track previous call count to detect new incoming calls
  const prevCallCountRef = useRef(0);
  const prevLatestCallIdRef = useRef(null);

  useEffect(() => {
    if (!contactCalls.length || !selectedWaId) {
      prevCallCountRef.current = 0;
      prevLatestCallIdRef.current = null;
      return;
    }

    // Sort calls by timestamp to get the latest
    const sortedCalls = [...contactCalls].sort(
      (a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp),
    );
    const latestCall = sortedCalls[0];
    const latestCallId = latestCall?.id;

    // Check if we have a new call
    if (latestCallId && latestCallId !== prevLatestCallIdRef.current) {
      // Only notify if it's a new call (not initial load)
      if (prevLatestCallIdRef.current !== null) {
        // Check if it's an incoming call from the user
        if (latestCall.direction === 'USER_INITIATED' && latestCall.from_number === selectedWaId) {
          const contactName = contact?.name || formatPhone(selectedWaId);
          toast.success(`📞 Incoming call from ${contactName}`, {
            icon: '📞',
            duration: 5000,
          });
        }
      }
      prevLatestCallIdRef.current = latestCallId;
    }

    prevCallCountRef.current = contactCalls.length;
  }, [contactCalls, selectedWaId, contact?.name]);

  const onEditContact = useCallback(() => {
    setSelectedContactId(contact?.id ?? null);
  }, [setSelectedContactId, contact?.id]);

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

  return (
    <div className="flex h-full w-[300px] flex-shrink-0 flex-col border-l border-brand-border bg-white">
      <div className="h-16 border-b border-brand-border px-5 py-4">
        <div className="text-sm font-semibold text-gray-900">Contact</div>
      </div>

      <div className="flex-1 overflow-auto">
        <Section title="Contact Details">
          <div className="flex items-start gap-3">
            <div
              className={cn('flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold', avatarCls)}
            >
              {initialsFromName(name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-base font-semibold text-gray-900">{name}</div>
                <button type="button" className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Edit name">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1 text-sm text-gray-500">{displayPhone || '—'}</div>
              {contact?.source ? (
                <div className="mt-1 inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      contact.source === 'TIKTOK'
                        ? 'bg-gray-900 text-white'
                        : contact.source === 'META'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {contact.source}
                  </span>
                </div>
              ) : null}
              {contact?.campaign_name ? (
                <div className="mt-1 text-xs text-gray-400">Campaign: {contact.campaign_name}</div>
              ) : null}
              {contact?.ad_id ? <div className="mt-0.5 text-xs text-gray-400">Ad ID: {contact.ad_id}</div> : null}
            </div>
          </div>

          {/* Tags Display */}
          {appliedTags.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</div>
              <div className="flex flex-wrap gap-2">
                {appliedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                      tag.color === 'green'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : tag.color === 'blue'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : tag.color === 'purple'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : tag.color === 'orange'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : tag.color === 'red'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
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
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" className="mt-4 w-full" onClick={onEditContact}>
            Edit Contact
          </Button>
        </Section>

        <Section title="Contact Info">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="text-gray-900">{displayPhone || '—'}</span>
            </div>
            {contact?.source && (
              <div className="flex justify-between">
                <span className="text-gray-600">Source:</span>
                <span className="text-gray-900">{contact.source}</span>
              </div>
            )}
            {contact?.campaign_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Campaign:</span>
                <span className="text-right text-gray-900 max-w-[150px] truncate">{contact.campaign_name}</span>
              </div>
            )}
            {contact?.ad_id && (
              <div className="flex justify-between">
                <span className="text-gray-600">Ad ID:</span>
                <span className="text-right text-gray-900 max-w-[150px] truncate font-mono text-xs">
                  {contact.ad_id}
                </span>
              </div>
            )}
            {contact?.metadata?.adset_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Ad Set:</span>
                <span className="text-right text-gray-900 max-w-[150px] truncate">{contact.metadata.adset_name}</span>
              </div>
            )}
            {contact?.metadata?.ad_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Ad Name:</span>
                <span className="text-right text-gray-900 max-w-[150px] truncate">{contact.metadata.ad_name}</span>
              </div>
            )}
            {contact?.first_seen && (
              <div className="flex justify-between">
                <span className="text-gray-600">First seen:</span>
                <span className="text-gray-900">{formatRelativeTime(contact.first_seen)}</span>
              </div>
            )}
          </div>
        </Section>

        <Section title="Notes">
          <Textarea
            placeholder="Internal notes (not sent to customer)"
            className="min-h-[88px]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Button className="mt-3" size="sm" onClick={handleAddNote} disabled={!noteText.trim() || savingNote}>
            {savingNote ? 'Saving...' : 'Add Note'}
          </Button>
          <div className="mt-4 space-y-3">
            {notesQ.isLoading ? (
              <div className="h-8 animate-pulse rounded bg-gray-100" />
            ) : (notesQ.data ?? []).length === 0 ? (
              <p className="text-xs text-gray-400">No notes yet</p>
            ) : (
              (notesQ.data ?? []).map((n) => (
                <div key={n.id} className="group rounded-xl border border-gray-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-gray-900">{n.note}</div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(n.id)}
                      className="hidden group-hover:block rounded p-0.5 text-gray-400 hover:text-red-500"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {n.created_at ? formatRelativeTime(n.created_at) : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title="Audience Membership" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              Warm Pipeline
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              VIP - Active &lt; 7 days
            </span>
          </div>
        </Section>

        <Section title="Recent Calls" defaultOpen={false}>
          {callsQ.isLoading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded bg-gray-100" />
              <div className="h-8 animate-pulse rounded bg-gray-100" />
            </div>
          ) : contactCalls.length === 0 ? (
            <p className="text-xs text-gray-400">No call history</p>
          ) : (
            <div className="space-y-2">
              {contactCalls.map((call) => (
                <div key={call.id} className="flex items-center gap-3 text-sm">
                  {call.direction === 'USER_INITIATED' ? (
                    <PhoneIncoming className="h-4 w-4 text-blue-500" />
                  ) : (
                    <PhoneOutgoing className="h-4 w-4 text-green-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-700 capitalize">{call.event}</div>
                    <div className="text-xs text-gray-400">{formatRelativeTime(call.created_at || call.timestamp)}</div>
                  </div>
                  {call.duration ? (
                    <span className="text-xs text-gray-500">
                      {Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, '0')}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

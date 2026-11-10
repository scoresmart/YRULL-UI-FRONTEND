import { createContext } from 'react';
import { Camera, Contact, EyeOff, FileText, LayoutTemplate, MapPin, Mic, Phone, Video } from 'lucide-react';

/*
 * Message helpers shared by the bubble, the reply bar and the pinned-message
 * bar. Kept out of MessageBubble.jsx so that file only exports components.
 */

// "[image]", "[audio]" … is what the backend stores for media with no caption.
export const PLACEHOLDER_RE = /^\[\w+\]$/;
// Templates sent before the backend recorded their wording were stored as
// "[Template] name", "[template:name]" or "[Template: name] the text…".
// Show the message where there is one, and the template's name otherwise.
const TEMPLATE_PREFIX_RE = /^\[template:?\s*([^\]]*)\]\s*/i;

export function templateParts(body) {
  const text = (body || '').trim();
  const match = TEMPLATE_PREFIX_RE.exec(text);
  if (!match) return { text };
  return { name: match[1].trim(), text: text.slice(match[0].length).trim() };
}

export function captionOf(msg) {
  const body = (msg.body || '').trim();
  return body && !PLACEHOLDER_RE.test(body) ? body : '';
}

// The backend stores a location as "name\naddress\nhttps://maps.google.com/?q=lat,lng".
export function parseLocation(body) {
  const lines = (body || '').split('\n').filter(Boolean);
  const link = lines.find((l) => l.startsWith('https://maps.google.com/?q='));
  const [lat, lng] = (link?.split('?q=')[1] || '').split(',').map(Number);
  return {
    link,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    lines: lines.filter((l) => l !== link),
  };
}

// Messages that record something rather than say it: no reply, react or forward.
export const RECORD_TYPES = ['call_event', 'call_permission', 'call_permission_request'];

/**
 * What the chat window offers each message: reply, react, forward, star, pin,
 * delete for me and message info. Provided by ChatWindow; null elsewhere, and
 * then the menu keeps to copy and download.
 */
export const MessageActionsContext = createContext(null);

// Meta error 131042: the WhatsApp Business account has an unpaid bill, so
// every send is refused until it is paid.
export const UNPAID_BILL_CODE = 131042;

/** Why an outbound message didn't reach the contact, in a few words; null when it did. */
export function failureReason(msg) {
  if (msg?.direction === 'inbound' || msg?.status !== 'failed') return null;
  if (Number(msg.error_code) === UNPAID_BILL_CODE) return 'Not delivered – WhatsApp bill unpaid';
  return 'Not delivered';
}

// Friendly short labels for the common document MIME types. Office formats
// have long subtypes (…wordprocessingml.document), so the raw subtype is
// useless as a label — map the ones we see, fall back to a cleaned subtype.
const MIME_LABELS = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.oasis.opendocument.text': 'ODT',
  'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'application/rtf': 'RTF',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
  'application/vnd.rar': 'RAR',
  'application/x-7z-compressed': '7Z',
  'application/json': 'JSON',
};

/** A short, clean file-type label from a document's MIME type (e.g. "DOCX"). */
export function documentTypeLabel(mime) {
  const m = (mime || '').split(';')[0].trim().toLowerCase();
  if (!m) return 'File';
  if (MIME_LABELS[m]) return MIME_LABELS[m];
  // Fall back to the subtype, stripped of the vendor/encoding noise. Only use
  // it when it is short and simple; otherwise it is the long ugly string.
  const sub = (m.split('/').pop() || '')
    .replace(/^x-/, '')
    .replace(/^vnd\..*\./, '')
    .replace(/\+.*/, '');
  return /^[a-z0-9]{1,5}$/.test(sub) ? sub.toUpperCase() : 'File';
}

const PREVIEW_BY_TYPE = {
  audio: [Mic, 'Voice message'],
  image: [Camera, 'Photo'],
  sticker: [Camera, 'Sticker'],
  video: [Video, 'Video'],
  document: [FileText, 'Document'],
  location: [MapPin, 'Location'],
  contacts: [Contact, 'Contact'],
  template: [LayoutTemplate, 'Template'],
  call_event: [Phone, 'Voice call'],
  unsupported: [EyeOff, 'Message WhatsApp did not share'],
};

// Meta passes some messages to businesses as an empty "unsupported" stub; the
// backend stores "[unsupported_<kind>]" when it can tell which kind it was.
const UNSUPPORTED_KINDS = {
  view_once: 'View-once photo or video',
  poll: 'Poll',
  edit: 'Edited message',
  event: 'Event invite',
};

/** What an unsupported message was, and what to do about it. */
export function unsupportedInfo(msg) {
  const kind = /^\[unsupported_(\w+)\]$/.exec((msg?.body || '').trim())?.[1];
  const what = UNSUPPORTED_KINDS[kind];
  return {
    title: what ? `${what} — WhatsApp doesn't share these with business apps` : "WhatsApp didn't share this message",
    hint: what
      ? 'Ask the contact to send it again as a normal message.'
      : 'Usually a view-once photo, a poll or an edited message. Ask the contact to send it again as a normal message.',
  };
}

// A WhatsApp "album" (several photos/videos sent as one group) is delivered to
// business apps as an empty unsupported "album" stub followed by the individual
// image/video messages — Meta gives no album id, so we correlate the stub with
// the run of same-direction media that immediately follows it. A genuinely
// withheld message (view-once, poll, edit) has no media after it, so it never
// groups and still shows its "didn't share" notice.
const ALBUM_WINDOW_MS = 60000;
const ALBUM_MEDIA_TYPES = new Set(['image', 'video']);

/** True for the empty stub that marks the start of an album. */
export function isAlbumStub(msg) {
  return (
    msg?.message_type === 'unsupported' &&
    /^\[unsupported(_album)?\]$/.test((msg.body || '').trim())
  );
}

/**
 * Collapse WhatsApp albums in a chronological message list. Returns:
 *  - stubItems: Map(stub.id -> [media messages]) — one entry per album
 *  - memberIds: Set of ids of the media messages folded into an album
 * The caller hides members and renders the album grid in the stub's place.
 */
export function groupAlbums(messages) {
  const stubItems = new Map();
  const memberIds = new Set();
  for (let i = 0; i < messages.length; i++) {
    const stub = messages[i];
    if (!isAlbumStub(stub)) continue;
    const explicit = (stub.body || '').trim() === '[unsupported_album]';
    const items = [];
    let last = new Date(stub.created_at).getTime();
    for (let j = i + 1; j < messages.length; j++) {
      const n = messages[j];
      if (n.direction !== stub.direction || !ALBUM_MEDIA_TYPES.has(n.message_type)) break;
      if (memberIds.has(n.id)) break;
      const t = new Date(n.created_at).getTime();
      if (Number.isFinite(t) && t - last > ALBUM_WINDOW_MS) break;
      items.push(n);
      if (Number.isFinite(t)) last = t;
    }
    // An explicit album stub groups even a single trailing photo; a legacy
    // plain "[unsupported]" stub needs at least two, so a view-once notice
    // followed by one unrelated photo is never mistaken for an album.
    if (items.length >= (explicit ? 1 : 2)) {
      stubItems.set(stub.id, items);
      for (const it of items) memberIds.add(it.id);
    }
  }
  return { stubItems, memberIds };
}

/** A one-line summary of a message, for quotes, the reply bar and pins. */
export function messagePreview(msg) {
  if (!msg) return { icon: null, text: 'Message not found' };
  const type = msg.message_type || 'text';
  const [icon, label] = PREVIEW_BY_TYPE[type] || [null, ''];
  let text = captionOf(msg);
  if (type === 'template') text = templateParts(msg.body).text || templateParts(msg.body).name || '';
  if (type === 'location') text = parseLocation(msg.body).lines[0] || '';
  if (type === 'call_event') text = '';
  if (type === 'voice_call') text = text.replace(/^\[Call Button\]\s*/, '');
  return { icon, text: text || label || 'Message' };
}

import { createContext } from 'react';
import { Camera, Contact, FileText, LayoutTemplate, MapPin, Mic, Phone, Video } from 'lucide-react';

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
};

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

import { createContext, memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Contact,
  Copy,
  Download,
  ExternalLink,
  FileText,
  ImageOff,
  Info,
  LayoutTemplate,
  Loader2,
  MapPin,
  MicOff,
  Pause,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Play,
  ShieldCheck,
  VideoOff,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { whatsappApi } from '../../lib/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

// "[image]", "[audio]" … is what the backend stores for media with no caption.
const PLACEHOLDER_RE = /^\[\w+\]$/;

function captionOf(msg) {
  const body = (msg.body || '').trim();
  return body && !PLACEHOLDER_RE.test(body) ? body : '';
}

/* ── Rich text: links, WhatsApp formatting and search highlights ───────── */

// The in-chat search term, so every text node can mark matches.
const HighlightContext = createContext('');

const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]!?])/gi;
// WhatsApp's *bold*, _italic_, ~strikethrough~ and ```monospace```. Markers must
// sit at word boundaries, so snake_case_names and 2*3*4 stay as typed.
const FORMAT_RE =
  /```[\s\S]+?```|(?<![\w*])\*(?=\S)[^*\n]*?\S?\*(?![\w*])|(?<![\w_])_(?=\S)[^_\n]*?\S?_(?![\w_])|(?<![\w~])~(?=\S)[^~\n]*?\S?~(?![\w~])/g;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function Highlighted({ text }) {
  const q = useContext(HighlightContext);
  if (!q || !text) return text;
  return text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi')).map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded-[2px] bg-[#FFE066] text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function Formatted({ text }) {
  const nodes = [];
  let last = 0;
  for (const match of text.matchAll(FORMAT_RE)) {
    const token = match[0];
    if (token.length < 3) continue;
    if (match.index > last) nodes.push(<Highlighted key={`t${last}`} text={text.slice(last, match.index)} />);
    const key = `f${match.index}`;
    if (token.startsWith('```')) {
      nodes.push(
        <code key={key} className="rounded bg-black/[0.06] px-1 font-mono text-[13px]">
          <Highlighted text={token.slice(3, -3)} />
        </code>,
      );
    } else {
      const inner = <Highlighted text={token.slice(1, -1)} />;
      nodes.push(
        token[0] === '*' ? (
          <strong key={key} className="font-semibold">
            {inner}
          </strong>
        ) : token[0] === '_' ? (
          <em key={key}>{inner}</em>
        ) : (
          <s key={key}>{inner}</s>
        ),
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(<Highlighted key={`t${last}`} text={text.slice(last)} />);
  return nodes;
}

function RichText({ text }) {
  // split() with a capturing group puts the URLs at the odd indexes.
  return text.split(URL_RE).map((part, i) =>
    i % 2 ? (
      <a
        key={i}
        href={/^https?:\/\//i.test(part) ? part : `https://${part}`}
        target="_blank"
        rel="noopener noreferrer"
        className="break-words text-[#027EB5] hover:underline"
      >
        <Highlighted text={part} />
      </a>
    ) : (
      <Formatted key={i} text={part} />
    ),
  );
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function formatCallDuration(seconds) {
  if (!seconds) return 'Missed';
  if (seconds < 60) return `${seconds} sec`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs ? `${mins} min ${secs} sec` : `${mins} min`;
}

// Inbound media is stored as Meta's media id, not a URL; fetch the file through
// the backend and hand back an object URL. Rows that already carry media_url
// (and every text message) skip the request entirely.
function useMediaSrc(msg) {
  const needsFetch = Boolean(msg && !msg.media_url && msg.media_id && msg.wa_message_id);
  const { data: blob, isLoading } = useQuery({
    queryKey: ['wa-media', msg?.wa_message_id],
    queryFn: () => whatsappApi.getMessageMedia(msg.wa_message_id),
    enabled: needsFetch,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: (count, err) => count < 2 && !(err?.status >= 400 && err?.status < 500),
  });
  const objectUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => objectUrl && URL.revokeObjectURL(objectUrl), [objectUrl]);
  return { src: msg?.media_url || objectUrl, loading: needsFetch && isLoading };
}

/* ── Media ─────────────────────────────────────────────────────────────── */

function MediaUnavailable({ icon, label }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-black/[0.04] px-3 py-2.5 text-[13px] text-gray-500">
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <span>{label}</span>
    </div>
  );
}

function MediaLoading({ className }) {
  return (
    <div className={cn('flex items-center justify-center rounded-md bg-black/[0.04]', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
    </div>
  );
}

function VoiceNote({ src, loading, outbound }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  if (loading) {
    return (
      <div className="flex w-64 max-w-full items-center gap-3 py-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06]">
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        </div>
        <div className="h-1 flex-1 rounded-full bg-black/10" />
      </div>
    );
  }
  if (!src) return <MediaUnavailable icon={MicOff} label="Voice message unavailable" />;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  };
  const seek = (e) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    el.currentTime = (Number(e.target.value) / 100) * duration;
  };
  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex w-64 max-w-full items-center gap-3 py-1">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        // WhatsApp's ogg/opus files report Infinity until fully read.
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors',
          outbound ? 'bg-[#128C7E] hover:bg-[#0f7a6e]' : 'bg-[#25D366] hover:bg-[#1fb85a]',
        )}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={seek}
          aria-label="Seek"
          className="h-1 w-full cursor-pointer appearance-none rounded-full accent-[#128C7E]"
          style={{
            background: `linear-gradient(to right, #128C7E ${progress}%, rgba(0,0,0,0.12) ${progress}%)`,
          }}
        />
        <span className="text-[11px] tabular-nums text-gray-500">
          {formatDuration(playing || current ? current : duration)}
        </span>
      </div>
    </div>
  );
}

function ImageLightbox({ src, open, onOpenChange }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/85" />
        <DialogPrimitive.Content className="fixed inset-0 z-[100] flex items-center justify-center p-4 outline-none sm:p-10">
          <DialogPrimitive.Title className="sr-only">Photo</DialogPrimitive.Title>
          <img src={src} alt="" className="max-h-full max-w-full rounded-md object-contain shadow-2xl" />
          <div className="absolute right-4 top-4 flex gap-2">
            <a
              href={src}
              download
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Download photo"
            >
              <Download className="h-5 w-5" />
            </a>
            <DialogPrimitive.Close
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PhotoMessage({ src, loading, sticker }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  if (loading) return <MediaLoading className="h-60 w-[330px] max-w-full" />;
  if (!src || broken) return <MediaUnavailable icon={ImageOff} label="Photo unavailable" />;

  if (sticker) return <img src={src} alt="Sticker" className="h-32 w-32 object-contain" onError={() => setBroken(true)} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-[330px] max-w-full overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
      >
        <img
          src={src}
          alt="Photo"
          className="max-h-[330px] w-full object-cover transition-opacity hover:opacity-95"
          onError={() => setBroken(true)}
        />
      </button>
      <ImageLightbox src={src} open={open} onOpenChange={setOpen} />
    </>
  );
}

function VideoMessage({ src, loading }) {
  if (loading) return <MediaLoading className="h-60 w-[330px] max-w-full" />;
  if (!src) return <MediaUnavailable icon={VideoOff} label="Video unavailable" />;
  return <video controls preload="metadata" src={src} className="max-h-[330px] w-[330px] max-w-full rounded-md bg-black" />;
}

function DocumentMessage({ msg, src, loading }) {
  const ext = (msg.media_mime_type || '').split('/').pop()?.split(';')[0]?.toUpperCase();
  return (
    <div className="flex w-72 max-w-full items-center gap-3 rounded-md bg-black/[0.04] p-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#128C7E] shadow-sm">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-gray-900">{captionOf(msg) || 'Document'}</div>
        <div className="text-[11px] text-gray-500">
          {loading ? 'Loading…' : src ? ext || 'File' : 'Unavailable'}
        </div>
      </div>
      {src ? (
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download document"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-700"
        >
          <Download className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
}

/* ── Non-media content ─────────────────────────────────────────────────── */

function CallEvent({ msg, inbound }) {
  let duration = null;
  let status = 'completed';
  if (msg.body?.startsWith('__call_event__')) {
    for (const part of msg.body.split('|')) {
      if (part.startsWith('status=')) status = part.slice(7);
      if (part.startsWith('duration=')) duration = parseInt(part.slice(9), 10) || 0;
    }
  }
  const missed = !duration || status !== 'COMPLETED';
  const Icon = missed ? PhoneMissed : inbound ? PhoneIncoming : PhoneOutgoing;
  return (
    <div className="flex items-center gap-3 py-0.5 pr-2">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          missed ? 'bg-red-50 text-red-500' : 'bg-[#25D366]/10 text-[#128C7E]',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[14px] font-medium text-gray-900">
          {missed ? 'Missed voice call' : inbound ? 'Incoming voice call' : 'Outgoing voice call'}
        </div>
        <div className="text-[12px] text-gray-500">{missed ? 'Tap to call back' : formatCallDuration(duration)}</div>
      </div>
    </div>
  );
}

// spacer reserves room on the last line for the absolutely-positioned time,
// so short messages keep the time inline the way WhatsApp does.
function BodyText({ children, spacer = 0, className }) {
  return (
    <div className={cn('whitespace-pre-wrap break-words text-[14.2px] leading-[19px] text-gray-900', className)}>
      {typeof children === 'string' ? <RichText text={children} /> : children}
      {spacer ? <span className="inline-block h-3 align-bottom" style={{ width: spacer }} aria-hidden="true" /> : null}
    </div>
  );
}

// The backend stores a location as "name\naddress\nhttps://maps.google.com/?q=lat,lng".
function parseLocation(body) {
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

// A 3×3 block of OpenStreetMap tiles centred on the pin — a map thumbnail
// without a maps API key.
function MapThumb({ lat, lng }) {
  const W = 290;
  const H = 150;
  const z = 15;
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const left = W / 2 - (x - tx + 1) * 256;
  const top = H / 2 - (y - ty + 1) * 256;
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push(
        <img
          key={`${dx},${dy}`}
          src={`https://tile.openstreetmap.org/${z}/${(tx + dx + n) % n}/${ty + dy}.png`}
          alt=""
          draggable={false}
          className="absolute h-64 w-64 max-w-none"
          style={{ left: (dx + 1) * 256, top: (dy + 1) * 256 }}
        />,
      );
    }
  }
  return (
    <div className="relative overflow-hidden rounded-md bg-[#E5E3DF]" style={{ width: W, height: H, maxWidth: '100%' }}>
      <div className="absolute" style={{ left, top, width: 768, height: 768 }}>
        {tiles}
      </div>
      <MapPin className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-full fill-[#EA4335] text-white drop-shadow" />
      <span className="absolute bottom-0 right-0 bg-white/80 px-1 text-[9px] text-gray-600">© OpenStreetMap</span>
    </div>
  );
}

function LocationMessage({ msg }) {
  const { link, lat, lng, lines } = parseLocation(msg.body);
  return (
    <a href={link || undefined} target="_blank" rel="noopener noreferrer" className="block w-[290px] max-w-full">
      {lat !== null && lng !== null ? (
        <MapThumb lat={lat} lng={lng} />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md bg-black/[0.04]">
          <MapPin className="h-6 w-6 text-gray-400" />
        </div>
      )}
      <div className="px-1.5 pb-1 pt-1.5">
        {lines.length ? (
          lines.map((line, i) => (
            <div key={i} className={cn('truncate', i === 0 ? 'text-[14px] text-gray-900' : 'text-[12.5px] text-gray-500')}>
              {line}
            </div>
          ))
        ) : (
          <div className="text-[14px] text-gray-900">Location</div>
        )}
      </div>
    </a>
  );
}

// "Name · +61 400 000 000", one line per shared contact.
function ContactsMessage({ msg }) {
  const cards = (msg.body || '')
    .split('\n')
    .filter((l) => l && !PLACEHOLDER_RE.test(l))
    .map((line) => {
      const [name, phones = ''] = line.split(' · ');
      return { name, phone: phones.split(',')[0]?.trim() };
    });
  if (!cards.length) return <MediaUnavailable icon={Contact} label="Contact card" />;
  return (
    <div className="w-64 max-w-full divide-y divide-black/[0.06]">
      {cards.map((c, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DFE5E7] text-[#8696A0]">
            <Contact className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[14.5px] text-gray-900">{c.name || c.phone}</div>
            {c.phone && c.name ? <div className="truncate text-[12.5px] text-gray-500">{c.phone}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function Label({ icon, children }) {
  const Icon = icon;
  return (
    <div className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
      <Icon className="h-3 w-3" />
      {children}
    </div>
  );
}

function MessageContent({ msg, inbound, media, spacer }) {
  const type = msg.message_type || 'text';
  const caption = captionOf(msg);

  switch (type) {
    case 'call_event':
      return <CallEvent msg={msg} inbound={inbound} />;
    case 'audio':
      return <VoiceNote src={media.src} loading={media.loading} outbound={!inbound} />;
    case 'image':
    case 'sticker':
      return (
        <div className="flex flex-col gap-1.5">
          <PhotoMessage src={media.src} loading={media.loading} sticker={type === 'sticker'} />
          {caption ? (
            <BodyText spacer={spacer} className="px-1.5 pb-1">
              {caption}
            </BodyText>
          ) : null}
        </div>
      );
    case 'video':
      return (
        <div className="flex flex-col gap-1.5">
          <VideoMessage src={media.src} loading={media.loading} />
          {caption ? (
            <BodyText spacer={spacer} className="px-1.5 pb-1">
              {caption}
            </BodyText>
          ) : null}
        </div>
      );
    case 'document':
      // The file name (or caption) is shown on the card itself.
      return <DocumentMessage msg={msg} src={media.src} loading={media.loading} />;
    case 'template':
      return (
        <>
          <Label icon={LayoutTemplate}>Template</Label>
          <BodyText spacer={spacer}>{caption || 'Template message'}</BodyText>
        </>
      );
    case 'voice_call':
      // Message sent with a WhatsApp call button; mirror how the contact sees it.
      return (
        <>
          <BodyText>{(msg.body || '').replace(/^\[Call Button\]\s*/, '')}</BodyText>
          <div className="-mx-2.5 mt-2 flex items-center justify-center gap-2 border-t border-black/[0.08] pt-2 text-[14px] font-medium text-[#027EB5]">
            <Phone className="h-4 w-4" />
            Call ScoreSmart
          </div>
        </>
      );
    case 'call_permission':
    case 'call_permission_request':
      return (
        <div className="flex items-center gap-2 text-[13px] text-gray-700">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#128C7E]" />
          {(msg.body || '').replace(/^\[|\]$/g, '')}
        </div>
      );
    case 'interactive':
      return caption ? (
        <>
          <Label icon={Info}>Reply</Label>
          <BodyText spacer={spacer}>{caption}</BodyText>
        </>
      ) : (
        <MediaUnavailable icon={Info} label="Interactive message" />
      );
    case 'location':
      return <LocationMessage msg={msg} />;
    case 'contacts':
      return <ContactsMessage msg={msg} />;
    case 'unsupported':
      return <MediaUnavailable icon={Info} label="This message type isn't supported yet" />;
    case 'text':
    case 'automated':
      return <BodyText spacer={spacer}>{caption || msg.body || ''}</BodyText>;
    default:
      return caption ? (
        <BodyText spacer={spacer}>{caption}</BodyText>
      ) : (
        <MediaUnavailable icon={Info} label="This message type isn't supported yet" />
      );
  }
}

function DeliveryStatus({ status }) {
  if (status === 'read') return <CheckCheck className="h-[15px] w-[15px] text-[#53BDEB]" aria-label="Read" />;
  if (status === 'delivered') return <CheckCheck className="h-[15px] w-[15px] text-gray-400" aria-label="Delivered" />;
  if (status === 'failed') return <Info className="h-[13px] w-[13px] text-red-500" aria-label="Failed" />;
  if (status === 'pending') return <Clock className="h-[12px] w-[12px] text-gray-400" aria-label="Sending" />;
  return <Check className="h-[15px] w-[15px] text-gray-400" aria-label="Sent" />;
}

function MessageMenu({ msg, media, inbound }) {
  const type = msg.message_type || 'text';
  const text = captionOf(msg);
  const location = type === 'location' ? parseLocation(msg.body) : null;
  const copyable =
    text && !['call_event', 'location', 'call_permission', 'call_permission_request'].includes(type) && !text.startsWith('__');
  const fileName = type === 'document' ? text || 'document' : `whatsapp-${type}-${msg.wa_message_id || msg.id || 'file'}`;

  const actions = [
    copyable && {
      label: 'Copy',
      icon: Copy,
      onSelect: () =>
        navigator.clipboard
          .writeText(type === 'voice_call' ? text.replace(/^\[Call Button\]\s*/, '') : text)
          .then(() => toast.success('Copied'))
          .catch(() => toast.error('Could not copy')),
    },
    media.src && { label: 'Download', icon: Download, href: media.src, download: fileName },
    location?.link && { label: 'Open in Google Maps', icon: ExternalLink, href: location.link },
  ].filter(Boolean);
  if (!actions.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Message options"
          className={cn(
            'absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full text-gray-500 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100',
            inbound ? 'bg-white/90' : 'bg-[#D9FDD3]/90',
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={inbound ? 'start' : 'end'} className="w-48">
        {actions.map((a) =>
          a.href ? (
            <DropdownMenuItem key={a.label} asChild className="gap-3">
              <a href={a.href} download={a.download} target="_blank" rel="noopener noreferrer">
                <a.icon className="h-4 w-4 text-gray-500" />
                {a.label}
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={a.label} onSelect={a.onSelect} className="gap-3">
              <a.icon className="h-4 w-4 text-gray-500" />
              {a.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const MessageBubble = memo(function MessageBubble({ msg, groupStart = true, highlight = '', activeMatch = false }) {
  const media = useMediaSrc(msg);
  if (!msg) return null;

  const inbound = msg.direction === 'inbound';
  const isAiReply = msg.ai_intent?.startsWith('reply_to_');
  const type = msg.message_type || 'text';
  const visual =
    (['image', 'video', 'sticker'].includes(type) && (media.src || media.loading)) || type === 'location';
  const sticker = type === 'sticker' && media.src;
  const caption = captionOf(msg);
  const overlayTime = visual && !caption && type !== 'location';
  const endsWithText =
    ['text', 'automated', 'template'].includes(type) ||
    (caption && !['location', 'contacts', 'document', 'audio', 'voice_call', 'call_event', 'call_permission', 'call_permission_request'].includes(type));
  const spacer = endsWithText ? (inbound ? 40 : 58) + (isAiReply ? 16 : 0) : 0;

  return (
    <div className={cn('flex w-full', inbound ? 'justify-start' : 'justify-end', groupStart ? 'mt-2' : 'mt-0.5')}>
      <div
        className={cn(
          'group relative max-w-[85%] sm:max-w-[65%]',
          sticker ? '' : 'rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
          activeMatch && 'ring-2 ring-[#FFD000] ring-offset-1 ring-offset-[#EFEAE2]',
          !sticker && (inbound ? 'bg-white' : 'bg-[#D9FDD3]'),
          !sticker && groupStart && (inbound ? 'rounded-tl-none' : 'rounded-tr-none'),
          visual ? 'p-1' : 'px-2.5 pb-1.5 pt-1.5',
        )}
      >
        {!sticker && groupStart ? (
          // Bubble tail, as in WhatsApp: only on the first message of a run.
          <svg
            viewBox="0 0 8 13"
            className={cn(
              'absolute top-0 h-[13px] w-2',
              inbound ? '-left-2 fill-white' : '-right-2 fill-[#D9FDD3] -scale-x-100',
            )}
            aria-hidden="true"
          >
            <path d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />
          </svg>
        ) : null}

        <MessageMenu msg={msg} media={media} inbound={inbound} />
        <HighlightContext.Provider value={highlight}>
          <MessageContent msg={msg} inbound={inbound} media={media} spacer={spacer} />
        </HighlightContext.Provider>

        <div
          className={cn(
            'flex items-center justify-end gap-1 text-[11px] leading-none text-gray-500',
            overlayTime
              ? 'absolute bottom-2 right-2.5 rounded-full bg-black/40 px-1.5 py-1 text-white'
              : endsWithText || (type === 'audio' && media.src)
                ? 'absolute bottom-1.5 right-2.5'
                : 'mt-1',
          )}
        >
          {isAiReply ? <Bot className="h-3 w-3" aria-label="AI auto-reply" title="AI auto-reply" /> : null}
          <span className="tabular-nums">{formatTime(msg.created_at)}</span>
          {!inbound && type !== 'call_event' ? <DeliveryStatus status={msg.status} /> : null}
        </div>
      </div>
    </div>
  );
});

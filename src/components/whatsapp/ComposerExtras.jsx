import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Contact,
  FileText,
  Headphones,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  LocateFixed,
  MapPin,
  Phone,
  Plus,
  Search,
  Send,
  Smile,
  SwitchCamera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatPhone } from '../../lib/utils';
import { whatsappApi } from '../../lib/api';
import { useContacts } from '../../lib/dataHooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';

// The picker is ~300 KB; only load it once someone opens it.
const EmojiPicker = lazy(() => import('emoji-picker-react'));

const MB = 1024 * 1024;

// Mirrors WA_SEND_MEDIA_TYPES in the backend: what Meta accepts natively, and
// the size cap. Anything else still goes out, as a document.
function mediaKind(file) {
  if (['image/jpeg', 'image/png'].includes(file.type)) return { kind: 'image', limit: 5 * MB };
  if (['video/mp4', 'video/3gpp'].includes(file.type)) return { kind: 'video', limit: 16 * MB };
  if (['audio/aac', 'audio/amr', 'audio/mpeg', 'audio/mp4', 'audio/ogg'].includes(file.type)) {
    return { kind: 'audio', limit: 16 * MB };
  }
  return { kind: 'document', limit: 100 * MB };
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

const iconButton = 'rounded-full p-2 hover:bg-black/[0.06] disabled:opacity-40';
const fieldClass =
  'h-11 w-full rounded-lg bg-[#F0F2F5] px-3 text-[15px] text-gray-900 placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40';

function GreenSendButton({ onClick, disabled, busy, label = 'Send' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#1fb85a] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
    </button>
  );
}

/* ── Emoji ─────────────────────────────────────────────────────────────── */

export function EmojiButton({ onPick, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        className={cn(iconButton, open && 'bg-black/[0.06]')}
        aria-label="Emoji"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <Smile className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 shadow-xl">
          <Suspense
            fallback={
              <div className="flex h-[400px] w-[340px] items-center justify-center rounded-lg bg-white">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            }
          >
            <EmojiPicker
              // Native glyphs: no emoji images fetched from a CDN.
              emojiStyle="native"
              width={340}
              height={400}
              lazyLoadEmojis
              previewConfig={{ showPreview: false }}
              onEmojiClick={(data) => onPick(data.emoji)}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}

/* ── File send preview ─────────────────────────────────────────────────── */

function FilePreview({ file }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  if (file.type.startsWith('image/')) {
    return <img src={url} alt="" className="max-h-[50vh] w-full rounded-lg bg-gray-100 object-contain" />;
  }
  if (file.type.startsWith('video/')) {
    return <video src={url} controls className="max-h-[50vh] w-full rounded-lg bg-black" />;
  }
  return (
    <div className="space-y-3 rounded-lg bg-gray-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-[#128C7E] shadow-sm">
          {file.type.startsWith('audio/') ? <Headphones className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-gray-900">{file.name}</div>
          <div className="text-xs text-gray-500">{formatSize(file.size)}</div>
        </div>
      </div>
      {file.type.startsWith('audio/') ? <audio src={url} controls className="w-full" /> : null}
    </div>
  );
}

function SendFileDialog({ file, to, onClose, onSent }) {
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  const info = file ? mediaKind(file) : null;
  const tooBig = info && file.size > info.limit;
  // A HEIC/GIF/WebP photo or a MOV video still arrives, but as a file.
  const sentAsFile = info?.kind === 'document' && /^(image|video|audio)\//.test(file.type);

  useEffect(() => setCaption(''), [file]);

  const send = async () => {
    if (!file || !to || tooBig) return;
    setSending(true);
    try {
      await whatsappApi.sendMedia({ to, file, caption: info.kind === 'audio' ? '' : caption.trim() });
      toast.success({ image: 'Photo sent', video: 'Video sent', audio: 'Audio sent' }[info.kind] || 'File sent');
      onSent?.();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not send the file');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={Boolean(file)} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="w-[min(92vw,32rem)]">
        <DialogHeader>
          <DialogTitle>
            {{ image: 'Send photo', video: 'Send video', audio: 'Send audio' }[info?.kind] || 'Send file'}
          </DialogTitle>
        </DialogHeader>
        {file ? (
          <div className="space-y-3">
            <FilePreview file={file} />
            {tooBig ? (
              <p className="text-sm text-red-600">
                This file is {formatSize(file.size)}. WhatsApp allows {info.kind}s up to {info.limit / MB} MB.
              </p>
            ) : sentAsFile ? (
              <p className="text-xs text-gray-500">
                WhatsApp only plays JPG/PNG photos, MP4 videos and MP3/AAC/OGG audio in the chat, so this will
                arrive as a file.
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={info?.kind === 'audio' ? 'Audio has no caption' : 'Add a caption'}
                disabled={sending || info?.kind === 'audio'}
                maxLength={1024}
                className={cn(fieldClass, 'flex-1')}
              />
              <GreenSendButton onClick={send} disabled={tooBig} busy={sending} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ── Camera ────────────────────────────────────────────────────────────── */

function CameraDialog({ open, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState('user');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setReady(false);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('Camera not available. Allow camera access in your browser, or attach a photo instead.');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facing]);

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onClose();
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[min(92vw,40rem)]">
        <DialogHeader>
          <DialogTitle>Take photo</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-600">{error}</p>
        ) : (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedData={() => setReady(true)}
                className={cn('aspect-video w-full object-cover', facing === 'user' && '-scale-x-100')}
              />
              {!ready ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white/70" />
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
                aria-label="Switch camera"
                className="rounded-full p-3 text-[#54656F] hover:bg-black/[0.06]"
              >
                <SwitchCamera className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={capture}
                disabled={!ready}
                aria-label="Capture"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow hover:bg-[#1fb85a] disabled:opacity-50"
              >
                <Camera className="h-7 w-7" />
              </button>
              <div className="w-11" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Location ──────────────────────────────────────────────────────────── */

function LocationDialog({ open, to, onClose, onSent }) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);

  const latNum = Number(lat);
  const lngNum = Number(lng);
  const valid =
    lat !== '' && lng !== '' && Number.isFinite(latNum) && Number.isFinite(lngNum) &&
    Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180;

  const useCurrent = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not available in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        toast.error('Could not get your location. Allow location access or enter coordinates.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const send = async () => {
    if (!valid || !to) return;
    setSending(true);
    try {
      await whatsappApi.sendLocation({ to, latitude: latNum, longitude: lngNum, name: name.trim(), address: address.trim() });
      toast.success('Location sent');
      onSent?.();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not send the location');
    } finally {
      setSending(false);
    }
  };

  const d = 0.005;
  const mapSrc = valid
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lngNum - d},${latNum - d},${lngNum + d},${latNum + d}&layer=mapnik&marker=${latNum},${lngNum}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="w-[min(92vw,32rem)]">
        <DialogHeader>
          <DialogTitle>Send location</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <button
            type="button"
            onClick={useCurrent}
            disabled={locating}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-gray-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white">
              {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
            </span>
            <span className="text-[15px] text-[#111B21]">Use my current location</span>
          </button>
          {mapSrc ? (
            <iframe title="Map preview" src={mapSrc} className="h-48 w-full rounded-lg border-0 bg-gray-100" loading="lazy" />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
              <MapPin className="mr-2 h-4 w-4" /> Enter coordinates or use your current location
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input className={fieldClass} placeholder="Latitude" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
            <input className={fieldClass} placeholder="Longitude" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <input className={fieldClass} placeholder="Place name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex items-center gap-2">
            <input className={cn(fieldClass, 'flex-1')} placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
            <GreenSendButton onClick={send} disabled={!valid} busy={sending} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Contact card ──────────────────────────────────────────────────────── */

function ContactDialog({ open, to, onClose, onSent }) {
  const contactsQ = useContacts();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '' });
  const [sending, setSending] = useState(false);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (contactsQ.data ?? [])
      .filter((c) => c.wa_id && c.wa_id !== to)
      .filter((c) => !q || (c.name || '').toLowerCase().includes(q) || c.wa_id.includes(q))
      .slice(0, 6);
  }, [contactsQ.data, search, to]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const valid = form.name.trim() && form.phone.replace(/\D/g, '').length >= 6;

  const send = async () => {
    if (!valid || !to) return;
    setSending(true);
    try {
      await whatsappApi.sendContact({
        to,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
      });
      toast.success('Contact sent');
      onSent?.();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not send the contact');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent className="w-[min(92vw,30rem)]">
        <DialogHeader>
          <DialogTitle>Send contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667781]" />
            <input className={cn(fieldClass, 'pl-9')} placeholder="Search your contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {matches.length ? (
            <div className="max-h-40 overflow-auto rounded-lg border border-gray-100">
              {matches.map((c) => (
                <button
                  key={c.wa_id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, name: c.name || '', phone: `+${c.wa_id}` }))}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DFE5E7] text-[#54656F]">
                    <Contact className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] text-[#111B21]">{c.name || formatPhone(c.wa_id)}</span>
                    <span className="block truncate text-[12px] text-[#667781]">+{c.wa_id}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <input className={fieldClass} placeholder="Name" value={form.name} onChange={set('name')} />
          <input className={fieldClass} placeholder="Phone, with country code (e.g. +61 4…)" inputMode="tel" value={form.phone} onChange={set('phone')} />
          <input className={fieldClass} placeholder="Email (optional)" type="email" value={form.email} onChange={set('email')} />
          <div className="flex items-center gap-2">
            <input className={cn(fieldClass, 'flex-1')} placeholder="Company (optional)" value={form.company} onChange={set('company')} />
            <GreenSendButton onClick={send} disabled={!valid} busy={sending} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Attach menu ───────────────────────────────────────────────────────── */

function MenuIcon({ icon, color }) {
  const Icon = icon;
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: color }}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

// The file awaiting send is owned by the chat window, so a file dropped on the
// chat or pasted into the message box opens the same preview.
export function AttachButton({ to, disabled, onSent, file, onFileChange, onTemplate, onCallButton }) {
  const mediaInputRef = useRef(null);
  const docInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const [dialog, setDialog] = useState(null); // 'camera' | 'location' | 'contact'

  const choose = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (picked) onFileChange(picked);
  };

  // Radix restores focus to the trigger as the menu closes, which can cancel a
  // file dialog opened in the same tick; act on the next frame instead.
  const run = (action) =>
    requestAnimationFrame(() => {
      if (action === 'document') docInputRef.current?.click();
      else if (action === 'media') mediaInputRef.current?.click();
      else if (action === 'audio') audioInputRef.current?.click();
      else if (action === 'template') onTemplate?.();
      else if (action === 'callButton') onCallButton?.();
      else setDialog(action);
    });

  const items = [
    { action: 'document', label: 'Document', icon: FileText, color: '#7F66FF' },
    { action: 'media', label: 'Photos & videos', icon: ImageIcon, color: '#007BFC' },
    { action: 'camera', label: 'Camera', icon: Camera, color: '#FF2E74' },
    { action: 'audio', label: 'Audio', icon: Headphones, color: '#FA6533' },
    { action: 'contact', label: 'Contact', icon: Contact, color: '#009DE2' },
    { action: 'location', label: 'Location', icon: MapPin, color: '#1DAA61' },
  ];
  const businessItems = [
    onTemplate && { action: 'template', label: 'Template', icon: LayoutTemplate, color: '#128C7E' },
    onCallButton && { action: 'callButton', label: 'Call button', icon: Phone, color: '#25D366' },
  ].filter(Boolean);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={iconButton} aria-label="Attach" title="Attach" disabled={disabled}>
            <Plus className="h-6 w-6" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={10} className="w-60 rounded-2xl p-2">
          {items.map((item) => (
            <DropdownMenuItem key={item.label} onSelect={() => run(item.action)} className="gap-3 rounded-lg px-2 py-2 text-[15px] text-[#111B21]">
              <MenuIcon icon={item.icon} color={item.color} />
              {item.label}
            </DropdownMenuItem>
          ))}
          {businessItems.length ? <DropdownMenuSeparator /> : null}
          {businessItems.map((item) => (
            <DropdownMenuItem key={item.label} onSelect={() => run(item.action)} className="gap-3 rounded-lg px-2 py-2 text-[15px] text-[#111B21]">
              <MenuIcon icon={item.icon} color={item.color} />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={choose} />
      <input ref={docInputRef} type="file" className="hidden" onChange={choose} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={choose} />

      <SendFileDialog file={file} to={to} onClose={() => onFileChange(null)} onSent={onSent} />
      {dialog === 'camera' ? <CameraDialog open onClose={() => setDialog(null)} onCapture={onFileChange} /> : null}
      {dialog === 'location' ? <LocationDialog open to={to} onClose={() => setDialog(null)} onSent={onSent} /> : null}
      {dialog === 'contact' ? <ContactDialog open to={to} onClose={() => setDialog(null)} onSent={onSent} /> : null}
    </>
  );
}

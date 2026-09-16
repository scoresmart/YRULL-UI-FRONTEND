import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2, Paperclip, Send, Smile } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { whatsappApi } from '../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

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
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-[#128C7E] shadow-sm">
        <FileText className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-gray-900">{file.name}</div>
        <div className="text-xs text-gray-500">{formatSize(file.size)}</div>
      </div>
    </div>
  );
}

export function AttachButton({ to, disabled, onSent }) {
  const mediaInputRef = useRef(null);
  const docInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);

  const info = file ? mediaKind(file) : null;
  const tooBig = info && file.size > info.limit;
  // A HEIC/GIF/WebP photo or a MOV video still arrives, but as a file.
  const sentAsFile = info?.kind === 'document' && /^(image|video)\//.test(file.type);

  const choose = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setCaption('');
    setFile(picked);
  };

  const close = () => {
    if (sending) return;
    setFile(null);
    setCaption('');
  };

  const send = async () => {
    if (!file || !to || tooBig) return;
    setSending(true);
    try {
      await whatsappApi.sendMedia({ to, file, caption: caption.trim() });
      toast.success(info.kind === 'image' ? 'Photo sent' : info.kind === 'video' ? 'Video sent' : 'File sent');
      setFile(null);
      setCaption('');
      onSent?.();
    } catch (error) {
      toast.error(error.message || 'Could not send the file');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={iconButton} aria-label="Attach" disabled={disabled}>
            <Paperclip className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56">
          <DropdownMenuItem onSelect={() => mediaInputRef.current?.click()} className="gap-3 py-2.5">
            <ImageIcon className="h-5 w-5 text-[#007BFC]" />
            Photos &amp; videos
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => docInputRef.current?.click()} className="gap-3 py-2.5">
            <FileText className="h-5 w-5 text-[#7F66FF]" />
            Document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={choose} />
      <input ref={docInputRef} type="file" className="hidden" onChange={choose} />

      <Dialog open={Boolean(file)} onOpenChange={(o) => !o && close()}>
        <DialogContent className="w-[min(92vw,32rem)]">
          <DialogHeader>
            <DialogTitle>
              {info?.kind === 'image' ? 'Send photo' : info?.kind === 'video' ? 'Send video' : 'Send file'}
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
                  WhatsApp only shows JPG/PNG photos and MP4 videos in the chat, so this will arrive as a file.
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder={info?.kind === 'audio' ? 'Audio files have no caption' : 'Add a caption'}
                  disabled={sending || info?.kind === 'audio'}
                  maxLength={1024}
                  className="h-11 flex-1 rounded-lg bg-[#F0F2F5] px-3 text-[15px] text-gray-900 placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || tooBig}
                  aria-label="Send"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#1fb85a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

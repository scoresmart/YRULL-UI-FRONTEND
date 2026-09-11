import { File, Image, Video } from 'lucide-react';
import { cn } from '../../lib/utils';

const MEDIA_HEADERS = {
  IMAGE: { icon: Image, label: 'Image header', tall: true },
  VIDEO: { icon: Video, label: 'Video header', tall: true },
  DOCUMENT: { icon: File, label: 'Document', tall: false },
};

/**
 * WhatsApp-style rendering of a template.
 *
 * `sample` fills {{n}} placeholders with real values (used by the send-test
 * dialog); without it the placeholders render as labelled chips.
 */
export function TemplateBubble({ header, headerType, body, footer, buttons = [], sample, className }) {
  const media = MEDIA_HEADERS[headerType];

  const bodyNodes = (body ?? '').split(/(\{\{\s*\d+\s*\}\})/g).map((part, i) => {
    const match = part.match(/\{\{\s*(\d+)\s*\}\}/);
    if (!match) return part;
    const index = parseInt(match[1], 10);
    const filled = sample?.[index - 1];
    if (filled) return filled;
    return (
      <span key={i} className="rounded bg-amber-100 px-1 text-amber-800">
        {`Variable ${index}`}
      </span>
    );
  });

  return (
    <div className={cn('rounded-xl bg-[#e5ddd5] p-4', className)}>
      <div className="mx-auto max-w-[300px]">
        <div className="rounded-lg bg-white p-3 shadow-sm">
          {headerType === 'TEXT' && header && (
            <div className="mb-1 text-sm font-semibold text-gray-900">{header}</div>
          )}
          {media && (
            <div
              className={cn(
                'mb-2 flex items-center justify-center rounded bg-gray-100 text-xs text-gray-400',
                media.tall ? 'h-32' : 'h-12',
              )}
            >
              <media.icon className="mr-1 h-4 w-4" /> {media.label}
            </div>
          )}

          <div className="whitespace-pre-wrap break-words text-sm text-gray-800">
            {body ? bodyNodes : <span className="text-gray-400">Your message body...</span>}
          </div>

          {footer && <div className="mt-2 text-xs text-gray-400">{footer}</div>}

          {buttons.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {buttons.map((btn, i) => (
                <div
                  key={i}
                  className="truncate rounded bg-gray-50 px-3 py-1.5 text-center text-xs font-medium text-blue-600"
                >
                  {btn.text || `Button ${i + 1}`}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-1 text-right text-[10px] text-gray-400">now</div>
      </div>
    </div>
  );
}

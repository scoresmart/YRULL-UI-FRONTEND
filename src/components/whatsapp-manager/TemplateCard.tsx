import { motion } from 'framer-motion';
import { Pencil, Copy, Trash2, HelpCircle } from 'lucide-react';
import { formatRelativeTime } from '../../lib/utils';
import { StatusPill } from './StatusPill';
import type { WhatsAppTemplateListItem } from '../../lib/whatsappManagerApi';

function bodySnippet(body: string | undefined, max = 96) {
  if (!body) return '—';
  const t = body.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function TemplateCard({
  template: t,
  index,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  template: WhatsAppTemplateListItem;
  index: number;
  onEdit: (t: WhatsAppTemplateListItem) => void;
  onDuplicate: (t: WhatsAppTemplateListItem) => void;
  onDelete: (t: WhatsAppTemplateListItem) => void;
}) {
  const updated = t.updated_at || t.created_at;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.22 }}
      className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#161B22]/95 p-4 shadow-md backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{t.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {t.category && (
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-300 ring-1 ring-white/10">
                {t.category}
              </span>
            )}
            {t.language && <span className="text-xs text-gray-500">{t.language}</span>}
            <StatusPill status={t.status} />
            {t.rejection_reason && String(t.status).toUpperCase() === 'REJECTED' && (
              <span className="group relative inline-flex">
                <HelpCircle className="h-4 w-4 cursor-help text-red-400/80" aria-hidden />
                <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden w-56 rounded-md bg-[#0D1117] p-2 text-[11px] text-red-200 shadow-lg ring-1 ring-red-500/30 group-hover:block">
                  {t.rejection_reason}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-400">{bodySnippet(t.body)}</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-gray-500">
        <span>{updated ? formatRelativeTime(updated) : '—'}</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(t)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:border-[#00D4AA]/40 hover:text-[#00D4AA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4AA]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(t)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition hover:border-[#00D4AA]/40 hover:text-[#00D4AA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4AA]"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => onDelete(t)}
            className="inline-flex items-center gap-1 rounded-lg border border-red-500/25 px-2.5 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </motion.article>
  );
}

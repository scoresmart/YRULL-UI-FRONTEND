import { motion } from 'framer-motion';
import { Copy, Check, HelpCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { WhatsAppNumberRecord } from '../../lib/whatsappManagerApi';

function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <span className="relative group inline-flex">
        <HelpCircle className="h-3.5 w-3.5 cursor-help text-[#00D4AA]/50 hover:text-[#00D4AA]" aria-hidden />
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max max-w-[220px] -translate-x-1/2 rounded-md bg-[#161B22] px-2 py-1 text-[11px] font-normal text-gray-200 shadow-lg ring-1 ring-white/10 group-hover:block"
        >
          {label}
        </span>
      </span>
    </span>
  );
}

export function NumberCard({
  number: n,
  isActive,
  index,
  onCopied,
}: {
  number: WhatsAppNumberRecord;
  isActive: boolean;
  index: number;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(n.phone_number_id);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopied?.();
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#161B22]/90 p-4 shadow-lg backdrop-blur-sm transition-colors',
        isActive && 'border-[#00D4AA]/45 ring-1 ring-[#00D4AA]/25',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold tracking-tight text-white">{n.display_phone_number ?? '—'}</span>
            {isActive && (
              <span className="rounded-full bg-[#00D4AA]/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#00D4AA]">
                Active
              </span>
            )}
          </div>
          {n.verified_name && <p className="text-sm text-gray-400">{n.verified_name}</p>}
        </div>
        <div className="flex flex-wrap gap-2 text-xs sm:justify-end">
          {n.status && (
            <span className="rounded-lg bg-white/5 px-2 py-1 font-medium text-gray-300 ring-1 ring-white/10">{n.status}</span>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500">
            <InfoTip label="Current lifecycle state from Meta for this number.">Status</InfoTip>
          </dt>
          <dd className="mt-0.5 font-medium text-gray-200">{n.status ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500">
            <InfoTip label="Meta quality rating for messaging throughput.">Quality</InfoTip>
          </dt>
          <dd className="mt-0.5 font-medium text-gray-200">{n.quality_rating ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-500">
            <InfoTip label="Whether this number completed Meta verification.">Code status</InfoTip>
          </dt>
          <dd className="mt-0.5 font-medium text-gray-200">{n.code_verification_status ?? '—'}</dd>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="text-xs uppercase tracking-wide text-gray-500">Phone number ID</dt>
          <dd className="mt-1 flex items-center gap-2">
            <code className="truncate rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-[#00D4AA]/90">{n.phone_number_id}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-300 transition hover:border-[#00D4AA]/50 hover:text-[#00D4AA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4AA]"
              aria-label="Copy phone number ID"
            >
              {copied ? <Check className="h-4 w-4 text-[#00D4AA]" /> : <Copy className="h-4 w-4" />}
            </button>
          </dd>
        </div>
      </dl>
    </motion.div>
  );
}

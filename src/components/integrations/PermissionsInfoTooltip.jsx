import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Info-icon affordance that surfaces the Meta permissions Yrull will request.
 * Hover/focus reveals a tooltip — pure CSS via Tailwind `group-*` to avoid
 * pulling in a Radix tooltip dependency.
 */
export function PermissionsInfoTooltip({ className, placement = 'bottom' }) {
  const positionClasses =
    placement === 'top'
      ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
      : 'top-full mt-2 left-1/2 -translate-x-1/2';

  return (
    <span className={cn('group relative inline-flex', className)}>
      <button
        type="button"
        aria-label="Show Facebook permissions Yrull will request"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1877F2]/50"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 w-72 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          positionClasses,
        )}
      >
        <span className="mb-1 block font-semibold text-white">We&apos;ll request access to:</span>
        <span className="text-white/90">
          Facebook Pages, Instagram Business, WhatsApp Business, Messenger — to manage all your messages in one place.
        </span>
      </span>
    </span>
  );
}

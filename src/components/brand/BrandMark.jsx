import { cn } from '../../lib/utils';

/**
 * Yrull wordmark — neutral styling like the original FlowDesk: soft white on dark UI, charcoal on light UI.
 */
export function BrandMark({ className, variant = 'light' }) {
  const variantClass =
    variant === 'dark' ? 'text-white/90' : 'text-gray-900';

  return <span className={cn('font-bold tracking-tight', variantClass, className)}>Yrull</span>;
}

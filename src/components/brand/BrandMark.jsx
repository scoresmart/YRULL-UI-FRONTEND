import { cn } from '../../lib/utils';

/**
 * Yrull wordmark — use variant "dark" on dark backgrounds (#0F0F0F sidebars), "light" on white/light UI.
 */
export function BrandMark({ className, variant = 'light' }) {
  const variantClass = variant === 'dark' ? 'text-brand-wordmarkOnDark' : 'text-brand-wordmark';

  return <span className={cn('font-bold tracking-tight', variantClass, className)}>Yrull</span>;
}

import { cn } from '../../lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  const styles =
    variant === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
      : variant === 'warning'
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        : variant === 'danger'
          ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
          : variant === 'muted'
            ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200'
            : variant === 'secondary'
              ? 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
              : 'bg-green-50 text-green-700 ring-1 ring-green-200';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none',
        styles,
        className,
      )}
      {...props}
    />
  );
}


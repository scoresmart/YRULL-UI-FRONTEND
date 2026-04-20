import { Link } from 'react-router-dom';
import { Button } from './ui/button';

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <Icon className="h-7 w-7 text-gray-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-xs text-gray-400">{description}</p>}
      {actionLabel && (actionHref || onAction) && (
        <div className="mt-5">
          {actionHref ? (
            <Link to={actionHref}>
              <Button size="sm">{actionLabel}</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

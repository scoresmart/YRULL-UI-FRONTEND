import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export function ErrorState({ title = 'Something went wrong', description = 'Please try again.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50/30 px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-gray-400">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4 gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

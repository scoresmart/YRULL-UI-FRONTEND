import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function LegalPageShell({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/login" className="text-lg font-semibold text-slate-900">
            FlowDesk
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {lastUpdated ? (
          <p className="mt-2 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        ) : null}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">{children}</div>
        <div className="mt-12 border-t border-slate-200 pt-8 text-center text-xs text-slate-500">
          <Link to="/privacy" className="font-medium text-slate-600 hover:text-green-600">
            Privacy Policy
          </Link>
          <span className="mx-2 text-slate-300" aria-hidden>
            ·
          </span>
          <Link to="/terms" className="font-medium text-slate-600 hover:text-green-600">
            Terms of Service
          </Link>
          <span className="mx-2 text-slate-300" aria-hidden>
            ·
          </span>
          <Link to="/data-deletion" className="font-medium text-slate-600 hover:text-green-600">
            Data deletion
          </Link>
        </div>
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { LegalPageShell } from '../../components/legal/LegalPageShell';

export function DataDeletionPage() {
  return (
    <LegalPageShell title="Data deletion instructions" lastUpdated="March 21, 2026">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">How to request deletion</h2>
        <p>
          If you have a Yrull account and want your account and associated personal data deleted, you may
          request deletion by contacting us using the same email address you use for your account. We will
          process verified requests in line with applicable law and our{' '}
          <Link to="/privacy" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          If you connected third-party services (for example Meta or Instagram) through Yrull, you may also
          manage or revoke permissions in those services&apos; own settings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">What we delete</h2>
        <p>
          When we fulfill a deletion request, we aim to remove or anonymize your account data and content we
          hold as described in our Privacy Policy, subject to legal or legitimate retention needs (for example
          fraud prevention or accounting records where required).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Timing</h2>
        <p>
          We will confirm receipt of your request when possible and respond within a reasonable period, in line
          with applicable regulations.
        </p>
      </section>
    </LegalPageShell>
  );
}

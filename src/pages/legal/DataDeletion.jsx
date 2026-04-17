import { Link } from 'react-router-dom';
import { LegalPageShell } from '../../components/legal/LegalPageShell';

export function DataDeletionPage() {
  return (
    <LegalPageShell title="Data Deletion Instructions" lastUpdated="April 17, 2026">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Option 1 — Delete from within Yrull</h2>
        <p>
          Log into your Yrull account &rarr; Settings &rarr; Delete Account. Confirm deletion. All your data,
          including connected platform data, will be permanently deleted within 30 days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Option 2 — Request deletion by email</h2>
        <p>
          Send an email to{' '}
          <a href="mailto:privacy@yrull.com" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">
            privacy@yrull.com
          </a>{' '}
          with the subject line &quot;Data Deletion Request&quot; from the email address associated with your
          Yrull account. We will confirm receipt within 48 hours and complete deletion within 30 days.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">What gets deleted</h2>
        <p>
          Your account, profile, all connected Instagram/WhatsApp/Facebook account data, conversation history,
          comments, automations, tags, notes, and any uploaded media. Aggregated, anonymized analytics may be
          retained as they cannot be linked back to you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Meta Platform data</h2>
        <p>
          For requests relating to data obtained through Meta Platforms (Instagram, WhatsApp, Facebook), the
          same procedures above apply. Meta data is deleted as part of the full account deletion process. You
          may also manage or revoke permissions directly in those services&apos; own settings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Legal basis for retention</h2>
        <p>
          In limited cases, we may retain certain records after account deletion where required by law (for
          example, fraud prevention or accounting records). This is described in our{' '}
          <Link to="/privacy" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">
            Privacy Policy
          </Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Contact</h2>
        <p>
          If you have questions about the deletion process, contact us at{' '}
          <a href="mailto:privacy@yrull.com" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">
            privacy@yrull.com
          </a>{' '}
          or write to: Prepsmart Pty Ltd, 97 Waverly Street, Moonee Ponds, Melbourne, Victoria 3039, Australia.
        </p>
      </section>
    </LegalPageShell>
  );
}

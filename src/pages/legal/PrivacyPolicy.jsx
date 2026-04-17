import { LegalPageShell } from '../../components/legal/LegalPageShell';

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="April 17, 2026">
      <section className="space-y-3">
        <p className="font-medium text-slate-800">
          This Privacy Policy applies to services provided by Prepsmart Pty Ltd, trading as Yrull.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">1. Introduction</h2>
        <p>
          Yrull (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy. This Privacy Policy
          describes how we collect, use, disclose, and safeguard information when you use our website and
          services (the &quot;Service&quot;). Please read this policy carefully. If you do not agree with its
          terms, please do not use the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">2. Information we collect</h2>
        <p>We may collect information that you provide directly and information collected automatically:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-slate-800">Account data:</span> name, email, company or workspace
            name, and credentials you use to register or sign in.
          </li>
          <li>
            <span className="font-medium text-slate-800">Service usage:</span> features you use, preferences,
            and communications you send or receive through integrated channels when you connect them to
            Yrull.
          </li>
          <li>
            <span className="font-medium text-slate-800">Technical data:</span> device type, browser, IP address,
            approximate location, and cookies or similar technologies as described in our cookie practices
            (where applicable).
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">3. How we use information</h2>
        <p>We use collected information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, operate, and improve the Service;</li>
          <li>Authenticate users and secure accounts;</li>
          <li>Communicate with you about the Service, updates, and support;</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">4. Sharing of information</h2>
        <p>
          We do not sell your personal information. We may share information with service providers who assist
          us in hosting, analytics, or communications, subject to appropriate safeguards. We may also disclose
          information if required by law or to protect our rights and the safety of users.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">5. Data retention and security</h2>
        <p>
          We retain information as long as necessary to provide the Service and for legitimate business
          purposes. We implement reasonable technical and organizational measures to protect your information;
          no method of transmission over the Internet is completely secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">6. Meta Platform data</h2>
        <p>
          When you connect your Instagram, WhatsApp, or Facebook account to Yrull, we access data through
          Meta&apos;s APIs in accordance with Meta Platform Terms and Developer Policies. Data obtained via Meta
          APIs is used solely to provide the features you have authorized (such as reading messages, replying
          to comments, and managing conversations on the connected account&apos;s behalf). We do not use this
          data for advertising, sell it to third parties, or use it for any purpose other than providing the
          Yrull service. You can disconnect your Meta accounts at any time from Settings &rarr; Integrations,
          which will immediately revoke our access.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">7. Your rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, or export your personal
          information, or to object to or restrict certain processing. Contact us using the details below to
          exercise these rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">8. Australian Privacy Principles</h2>
        <p>
          As an Australian company, Prepsmart Pty Ltd complies with the Australian Privacy Principles (APPs)
          set out in the Privacy Act 1988 (Cth). You have the right to request access to the personal
          information we hold about you and to request its correction. If you believe we have breached the APPs,
          you may lodge a complaint with us at{' '}
          <a href="mailto:privacy@yrull.com" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">privacy@yrull.com</a>{' '}
          or with the Office of the Australian Information Commissioner (OAIC) at{' '}
          <a href="https://www.oaic.gov.au" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800" target="_blank" rel="noopener noreferrer">www.oaic.gov.au</a>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">9. Rights for EU/EEA users (GDPR)</h2>
        <p>
          If you are located in the European Union or European Economic Area, you have additional rights under
          the General Data Protection Regulation (GDPR), including:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li><span className="font-medium text-slate-800">Access:</span> request a copy of the personal data we hold about you.</li>
          <li><span className="font-medium text-slate-800">Rectification:</span> request correction of inaccurate or incomplete data.</li>
          <li><span className="font-medium text-slate-800">Erasure:</span> request deletion of your personal data.</li>
          <li><span className="font-medium text-slate-800">Data portability:</span> receive your data in a structured, machine-readable format.</li>
          <li><span className="font-medium text-slate-800">Restriction:</span> request restriction of processing in certain circumstances.</li>
          <li><span className="font-medium text-slate-800">Objection:</span> object to processing based on legitimate interests.</li>
        </ul>
        <p>
          To exercise these rights, contact us at{' '}
          <a href="mailto:privacy@yrull.com" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">privacy@yrull.com</a>.
          We will respond within 30 days. You also have the right to lodge a complaint with your local data
          protection authority.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">10. International transfers</h2>
        <p>
          If you access the Service from outside Australia, your information may be
          transferred to and processed in Australia or other countries with different data protection laws.
          We take appropriate safeguards to ensure your data is protected in accordance with this Privacy Policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">11. Children</h2>
        <p>
          The Service is not directed to children under 16 (or the age required in your jurisdiction). We do
          not knowingly collect personal information from children.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">12. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the revised policy on this page and
          update the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes
          acceptance of the updated policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">13. Contact</h2>
        <p>For questions about this Privacy Policy or your personal information, contact us at:</p>
        <ul className="list-none space-y-1 pl-0">
          <li><span className="font-medium text-slate-800">Email:</span>{' '}
            <a href="mailto:privacy@yrull.com" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">privacy@yrull.com</a>
          </li>
          <li><span className="font-medium text-slate-800">Postal:</span> Prepsmart Pty Ltd, 97 Waverly Street, Moonee Ponds, Melbourne, Victoria 3039, Australia</li>
          <li><span className="font-medium text-slate-800">Website:</span>{' '}
            <a href="https://yrull.com" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800" target="_blank" rel="noopener noreferrer">https://yrull.com</a>
          </li>
        </ul>
      </section>
    </LegalPageShell>
  );
}

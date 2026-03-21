import { LegalPageShell } from '../../components/legal/LegalPageShell';

export function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="March 21, 2026">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">1. Introduction</h2>
        <p>
          FlowDesk (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy. This Privacy Policy
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
            FlowDesk.
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
        <h2 className="text-base font-semibold text-slate-900">6. Your rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, or export your personal
          information, or to object to or restrict certain processing. Contact us using the details below to
          exercise these rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">7. International transfers</h2>
        <p>
          If you access the Service from outside the country where we operate, your information may be
          transferred to and processed in other countries with different data protection laws.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">8. Children</h2>
        <p>
          The Service is not directed to children under 16 (or the age required in your jurisdiction). We do
          not knowingly collect personal information from children.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">9. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the revised policy on this page and
          update the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes
          acceptance of the updated policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">10. Contact</h2>
        <p>
          For questions about this Privacy Policy or your personal information, please contact us at the
          support email or address provided on our website.
        </p>
      </section>
    </LegalPageShell>
  );
}

import { LegalPageShell } from '../../components/legal/LegalPageShell';

export function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="March 21, 2026">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">1. Agreement</h2>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of FlowDesk&apos;s website,
          applications, and related services (collectively, the &quot;Service&quot;). By creating an account or
          using the Service, you agree to these Terms. If you use the Service on behalf of an organization, you
          represent that you have authority to bind that organization.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">2. The Service</h2>
        <p>
          FlowDesk provides tools to help you manage messaging channels, automations, and related workflows.
          Features may change over time. We may suspend or discontinue parts of the Service with reasonable
          notice where practicable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">3. Accounts and security</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity under your account. You must provide accurate registration information and notify us promptly
          of any unauthorized use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Violate applicable laws or third-party rights;</li>
          <li>Send spam, malware, or deceptive or harmful content;</li>
          <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems;</li>
          <li>Reverse engineer or circumvent security or usage limits, except where prohibited by law;</li>
          <li>Use the Service in a way that could damage, disable, or overburden our infrastructure.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">5. Third-party services</h2>
        <p>
          The Service may integrate with third-party platforms (for example, messaging or analytics providers).
          Your use of those services is subject to their respective terms and privacy policies. We are not
          responsible for third-party services.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">6. Intellectual property</h2>
        <p>
          The Service, including its software, branding, and content we provide, is owned by FlowDesk or its
          licensors. We grant you a limited, non-exclusive, non-transferable license to use the Service in
          accordance with these Terms. You retain ownership of content you submit; you grant us a license to
          host and process that content as needed to operate the Service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">7. Fees</h2>
        <p>
          If you subscribe to paid plans, fees, billing cycles, and payment terms will be presented at purchase
          or in your account. Unless stated otherwise, fees are non-refundable except as required by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">8. Disclaimer of warranties</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">9. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLOWDESK AND ITS AFFILIATES WILL NOT BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR
          GOODWILL. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE WILL NOT EXCEED
          THE GREATER OF THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR ONE
          HUNDRED DOLLARS (USD), UNLESS APPLICABLE LAW REQUIRES OTHERWISE.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">10. Indemnity</h2>
        <p>
          You will defend and indemnify FlowDesk against claims arising from your use of the Service, your
          content, or your violation of these Terms, subject to applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">11. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate your access if you breach
          these Terms or if we need to do so for legal or operational reasons. Provisions that by their nature
          should survive will survive termination.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">12. Governing law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction we designate for our business operations,
          without regard to conflict-of-law principles, unless mandatory consumer protections in your country
          apply.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">13. Changes</h2>
        <p>
          We may modify these Terms by posting updated Terms on this page. Material changes may be communicated
          by email or in-app notice. Continued use after the effective date constitutes acceptance of the revised
          Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">14. Contact</h2>
        <p>
          For questions about these Terms, contact us using the support information provided on our website.
        </p>
      </section>
    </LegalPageShell>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/button';
import { CheckCircle2, ArrowRight, ChevronDown } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: 29,
    desc: 'For small businesses getting started with conversation automation.',
    features: [
      '500 contacts',
      '2,000 messages / month',
      '5 automations',
      '1 team member',
      '1 connected channel',
      'Email support',
    ],
    popular: false,
  },
  {
    name: 'Growth',
    price: 99,
    desc: 'For growing teams that need more power and AI features.',
    features: [
      '5,000 contacts',
      '20,000 messages / month',
      '25 automations',
      '5 team members',
      '3 connected channels',
      'Priority support',
      'AI-powered replies',
    ],
    popular: true,
  },
  {
    name: 'Pro',
    price: 299,
    desc: 'For agencies and enterprises operating at scale.',
    features: [
      '25,000 contacts',
      '100,000 messages / month',
      'Unlimited automations',
      '15 team members',
      'Unlimited channels',
      'Dedicated success manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    popular: false,
  },
];

const FAQS = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. You can upgrade, downgrade, or cancel your plan at any time from your billing settings. Changes take effect at the start of your next billing cycle.',
  },
  {
    q: 'What happens when my trial ends?',
    a: 'After 14 days, you\'ll be asked to select a paid plan. If you don\'t, your account will be paused — your data is safe, and you can reactivate anytime.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes. Annual plans save 20% compared to monthly billing. Contact us for details.',
  },
  {
    q: 'What counts as a "contact"?',
    a: 'A contact is any unique person who has exchanged at least one message with your connected channels. Contacts that are archived or blocked still count toward your limit.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. All data is encrypted in transit and at rest. We comply with Meta Platform Terms and only access data you\'ve explicitly authorized. Workspaces are fully isolated.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-medium text-gray-900">{q}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-5 text-sm leading-relaxed text-gray-500">{a}</p>}
    </div>
  );
}

export function PricingPage() {
  useDocumentTitle(
    'Pricing',
    'Simple, transparent pricing for businesses of all sizes. 14-day free trial, no credit card required.',
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-sidebar py-20 text-center text-white sm:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">Pricing</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Simple plans, transparent pricing
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
            Start free for 14 days. No credit card required. Upgrade when you&apos;re ready.
          </p>
        </div>
      </section>

      {/* Cards */}
      <section className="-mt-16 pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm ${
                  p.popular ? 'border-brand-accent ring-2 ring-brand-accent/20' : 'border-gray-200'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-accent px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{p.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{p.desc}</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">${p.price}</span>
                  <span className="text-sm text-gray-500"> / month</span>
                </div>
                <Link to="/register" className="mt-6">
                  <Button
                    className="w-full"
                    variant={p.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    Start free trial <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
                <ul className="mt-8 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-gray-400">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-100 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-gray-900">Frequently asked questions</h2>
          <div className="mt-10">
            {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
          <p className="mt-8 text-center text-sm text-gray-500">
            Have another question?{' '}
            <Link to="/contact" className="font-medium text-brand-accent hover:underline">Get in touch</Link>
          </p>
        </div>
      </section>
    </>
  );
}

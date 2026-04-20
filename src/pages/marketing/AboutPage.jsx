import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/button';
import { MapPin, Heart, Shield, Zap, ArrowRight } from 'lucide-react';

const VALUES = [
  {
    icon: Heart,
    title: 'Customer-first',
    desc: 'Every feature we build starts with a real customer problem. We listen before we code.',
  },
  {
    icon: Shield,
    title: 'Privacy by design',
    desc: 'Workspace isolation, encrypted data, and strict compliance with Meta Platform policies. Your data stays yours.',
  },
  {
    icon: Zap,
    title: 'Speed matters',
    desc: 'Customer conversations happen in real time. Our infrastructure is built for sub-second response times.',
  },
];

export function AboutPage() {
  useDocumentTitle(
    'About',
    'Yrull is built by Prepsmart Pty Ltd in Melbourne, Australia. We build conversation automation tools for modern businesses.',
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-sidebar py-20 text-center text-white sm:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">About</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">About Yrull</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
            Building conversation automation tools for modern businesses.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900">Our story</h2>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600">
            <p>
              Yrull is a product of Prepsmart Pty Ltd, an Australian software company building conversation automation
              tools for modern businesses. We believe customer service and marketing should be seamless, personalized,
              and scalable — without requiring a massive support team.
            </p>
            <p>
              Too many businesses lose customers to slow response times and disconnected messaging tools. Yrull brings
              Instagram, WhatsApp, and Facebook Messenger into one inbox with powerful automations that handle the
              repetitive work, so your team can focus on conversations that actually close deals.
            </p>
            <p>Based in Melbourne, Australia, we serve businesses globally.</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">What we stand for</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company info */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900">Company</h2>
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-accent" />
              <div>
                <h3 className="font-semibold text-gray-900">Prepsmart Pty Ltd</h3>
                <p className="mt-1 text-sm text-gray-500">
                  97 Waverly Street, Moonee Ponds
                  <br />
                  Melbourne, Victoria 3039, Australia
                </p>
                <div className="mt-3 space-y-1 text-sm text-gray-500">
                  <p>
                    General:{' '}
                    <a href="mailto:support@yrull.com" className="font-medium text-brand-accent hover:underline">
                      support@yrull.com
                    </a>
                  </p>
                  <p>
                    Privacy:{' '}
                    <a href="mailto:privacy@yrull.com" className="font-medium text-brand-accent hover:underline">
                      privacy@yrull.com
                    </a>
                  </p>
                  <p>
                    Web:{' '}
                    <a
                      href="https://yrull.com"
                      className="font-medium text-brand-accent hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      yrull.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-sidebar py-16 text-center text-white">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-bold">Ready to try Yrull?</h2>
          <p className="mt-3 text-gray-400">Start your 14-day free trial today.</p>
          <div className="mt-8">
            <Link to="/register">
              <Button size="lg" className="h-12 px-8 text-base">
                Create free account <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

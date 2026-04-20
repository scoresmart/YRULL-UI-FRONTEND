import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/button';
import {
  MessageSquare,
  MessagesSquare,
  Workflow,
  Inbox,
  Sparkles,
  BarChart3,
  Instagram,
  Phone,
  Facebook,
  ArrowRight,
  Zap,
  Users,
  ShoppingBag,
  Megaphone,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Auto-reply to DMs',
    desc: 'Instant replies 24/7 based on keywords, intent, or custom rules. Never miss a lead while you sleep.',
  },
  {
    icon: MessagesSquare,
    title: 'Comment-to-DM',
    desc: 'Turn public comments into private conversations automatically. Capture buyer intent from Instagram posts.',
  },
  {
    icon: Workflow,
    title: 'Visual flow builder',
    desc: 'Design conversation flows with a drag-and-drop builder. No code required.',
  },
  {
    icon: Inbox,
    title: 'Unified inbox',
    desc: 'Instagram, WhatsApp, and Facebook Messenger in one place. Your team never switches apps.',
  },
  {
    icon: Sparkles,
    title: 'AI-powered replies',
    desc: 'Let AI handle common questions in your brand voice. Escalate to humans when needed.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & insights',
    desc: 'Track response times, conversion rates, and which automations drive revenue.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Connect your channels',
    desc: 'Link your Instagram, WhatsApp Business, or Facebook Page in minutes. No code, no tech setup.',
  },
  {
    num: '02',
    title: 'Design your automations',
    desc: 'Use our visual builder to create conversation flows. Triggers, conditions, replies — all drag-and-drop.',
  },
  {
    num: '03',
    title: 'Grow your business',
    desc: 'Watch conversations convert into customers. Your team focuses on high-value chats while Yrull handles the rest.',
  },
];

const AUDIENCES = [
  {
    icon: ShoppingBag,
    title: 'E-commerce brands',
    bullets: [
      'Answer product questions instantly',
      'Recover abandoned carts via DM',
      'Turn comment engagement into sales',
    ],
  },
  {
    icon: Users,
    title: 'Creators & influencers',
    bullets: [
      'Manage high-volume DMs at scale',
      'Auto-respond to story replies',
      'Convert followers into community members',
    ],
  },
  {
    icon: Megaphone,
    title: 'Marketing agencies',
    bullets: ['Manage multiple client channels', 'Workspace isolation per client', 'White-label conversation flows'],
  },
];

function AnimatedSection({ children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('animate-in');
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`opacity-0 translate-y-6 transition-all duration-700 ease-out ${className}`}>
      {children}
    </div>
  );
}

export function HomePage() {
  useDocumentTitle(
    null,
    'Yrull helps businesses automate Instagram, WhatsApp, and Facebook Messenger conversations. Manage DMs, replies, comments, and automations in one unified inbox.',
  );

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-brand-sidebar text-white">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-brand-accent2/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Automate every customer conversation across{' '}
              <span className="bg-gradient-to-r from-brand-accent to-emerald-400 bg-clip-text text-transparent">
                Instagram, WhatsApp, and Facebook
              </span>
              .
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
              Yrull helps businesses respond instantly, capture more leads, and never miss a message. Built for teams
              who care about every customer.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start free trial <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10 hover:text-white"
                >
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          {/* Product mockup placeholder */}
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
              <div className="flex h-[280px] items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent/20 via-brand-sidebar to-brand-accent2/20 sm:h-[360px]">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="h-10 w-48 rounded-lg bg-white/10" />
                    <div className="h-10 w-40 rounded-lg bg-white/10" />
                    <div className="h-10 w-44 rounded-lg bg-white/10" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="ml-auto h-10 w-52 rounded-lg bg-brand-accent/30" />
                    <div className="h-10 w-44 rounded-lg bg-white/10" />
                    <div className="ml-auto h-10 w-48 rounded-lg bg-brand-accent/30" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-b border-gray-100 bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Built for teams using</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-8 text-gray-400">
            <div className="flex items-center gap-2">
              <Instagram className="h-6 w-6" />
              <span className="text-sm font-medium text-gray-500">Instagram</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-6 w-6" />
              <span className="text-sm font-medium text-gray-500">WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <Facebook className="h-6 w-6" />
              <span className="text-sm font-medium text-gray-500">Messenger</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section id="features" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to win at messaging
            </h2>
          </AnimatedSection>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <AnimatedSection key={f.title}>
                <div className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Up and running in minutes
            </h2>
          </AnimatedSection>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <AnimatedSection key={s.num}>
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-accent text-xl font-bold text-white">
                    {s.num}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{s.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">Who it&apos;s for</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Built for businesses that live in the inbox
            </h2>
          </AnimatedSection>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <AnimatedSection key={a.title}>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-gray-900">{a.title}</h3>
                  <ul className="mt-3 space-y-2">
                    {a.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-gray-500">
                        <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-accent" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-brand-sidebar py-20 text-center text-white sm:py-28">
        <AnimatedSection className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start automating in minutes</h2>
          <p className="mt-4 text-lg text-gray-400">14-day free trial. No credit card required.</p>
          <div className="mt-8">
            <Link to="/register">
              <Button size="lg" className="h-12 px-8 text-base">
                Create free account <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </section>
    </>
  );
}

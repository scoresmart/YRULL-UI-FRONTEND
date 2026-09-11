import { Link } from 'react-router-dom';
import { BarChart3, BrainCircuit, Database, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const FEATURES = [
  {
    icon: Database,
    title: 'Fetch campaign data',
    description: 'Pull campaigns, ad sets, creatives, spend, CTR, CPC, and audience signals into one workspace view.',
  },
  {
    icon: BrainCircuit,
    title: 'Analyze with any LLM',
    description: 'Send your Meta Ads performance context to GPT, Claude, or any other model for strategy, copy, and optimization ideas.',
  },
  {
    icon: BarChart3,
    title: 'Turn data into actions',
    description: 'Spot winning creatives, weak audiences, wasted spend, and messaging opportunities faster.',
  },
];

const STEPS = [
  'Connect your Meta account',
  'We fetch your ad data securely into this workspace',
  'Use GPT, Claude, or other LLMs to analyze performance and plan next moves',
];

export function MetaAdsPage() {
  useDocumentTitle('Meta Ads', 'Connect Meta Ads data and analyze campaign performance with Claude, GPT, and other LLMs.');

  return (
    <div className="-mx-4 -my-4 min-h-[calc(100vh-56px)] overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(29,78,216,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.15),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] px-4 py-8 sm:-mx-6 sm:-my-6 sm:min-h-[calc(100vh-4rem)] sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-sky-100 bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                <Sparkles className="h-3.5 w-3.5" /> New channel
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Connect Meta to unlock ad data analysis inside your app.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Connect your Meta account to access campaign performance, fetch your ad data, and analyze it with different LLMs like GPT, Claude, and more.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/integrations">
                  <Button size="lg" className="gap-2 bg-slate-950 text-white hover:bg-slate-800">
                    Connect Meta in Integrations <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/instagram">
                  <Button variant="outline" size="lg" className="gap-2 border-sky-200 bg-white text-slate-900 hover:bg-sky-50">
                    View connected channels
                  </Button>
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {FEATURES.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-3 text-sm font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-[linear-gradient(160deg,#0f172a_0%,#111827_45%,#0c4a6e_100%)] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                  <BrainCircuit className="h-6 w-6 text-cyan-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cyan-200">LLM-ready workflow</p>
                  <p className="text-xs text-slate-300">Bring ad performance and AI analysis together</p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">What this section will do</p>
                <div className="mt-4 space-y-3">
                  {STEPS.map((step) => (
                    <div key={step} className="flex items-start gap-3 rounded-2xl bg-white/5 px-4 py-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <p className="text-sm leading-6 text-slate-100">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-semibold text-white">Beautiful analysis layer</p>
                <p className="mt-2 text-sm leading-6 text-cyan-50/90">
                  Once connected, this area can surface campaign summaries, creative performance, spend anomalies, audience insights, and prompt-ready exports for Claude, GPT, or other LLMs.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
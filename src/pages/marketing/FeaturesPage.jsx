import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui/button';
import {
  Inbox,
  Workflow,
  MessageSquare,
  Zap,
  Users,
  Phone,
  Instagram,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const SECTIONS = [
  {
    icon: Inbox,
    title: 'Unified Inbox',
    intro: 'Every conversation from every channel, in one place.',
    paragraphs: [
      'Yrull pulls messages from Instagram DMs, WhatsApp, and Facebook Messenger into a single inbox. Your team sees every conversation without switching between apps.',
      'Conversations are organized by contact, not by channel. If a customer messages you on WhatsApp and later DMs you on Instagram, you see the full picture in one thread.',
    ],
    bullets: [
      'Cross-channel conversation history',
      'Contact sidebar with notes, tags, and custom fields',
      'Unread counts and smart sorting',
      'Real-time message updates',
    ],
  },
  {
    icon: Workflow,
    title: 'Visual Flow Builder',
    intro: 'Design powerful automations without writing a single line of code.',
    paragraphs: [
      'Our drag-and-drop flow builder lets you create conversation automations visually. Set triggers (new message, keyword match, comment), define conditions, and add actions — all with a few clicks.',
      'Flows support branching logic, time delays, AI-generated replies, and handoff to human agents when needed.',
    ],
    bullets: [
      'Drag-and-drop canvas with React Flow',
      'Trigger, condition, and action nodes',
      'Keyword matching and intent detection',
      'Time-delay and scheduling support',
    ],
  },
  {
    icon: MessageSquare,
    title: 'Comment Management',
    intro: 'Control the conversation on your public posts.',
    paragraphs: [
      'Monitor and respond to Instagram comments from within Yrull. Hide spam, delete inappropriate comments, and reply directly — all without leaving your inbox.',
      'Combine comment management with automations to auto-reply to comments and trigger DM flows when users comment specific keywords on your posts.',
    ],
    bullets: [
      'Reply to comments inline',
      'Hide or delete with confirmation',
      'Filter by post or status',
      'Comment-to-DM automation triggers',
    ],
  },
  {
    icon: Zap,
    title: 'Automations',
    intro: 'Let Yrull handle repetitive conversations so your team can focus on what matters.',
    paragraphs: [
      'Create automations for common scenarios: welcome messages, FAQ responses, lead qualification, appointment booking, and more. Each automation runs per workspace, so different teams can have different flows.',
      'AI-powered reply nodes let you generate contextual responses based on conversation history and your brand guidelines.',
    ],
    bullets: [
      'AI reply generation in your brand voice',
      'Keyword and pattern matching',
      'Time-based triggers and delays',
      'Auto-tag and auto-assign contacts',
    ],
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    intro: 'Work together without stepping on each other.',
    paragraphs: [
      'Assign conversations to team members, leave internal notes, and use tags to organize your pipeline. Role-based access ensures everyone sees only what they need.',
    ],
    bullets: [
      'Conversation assignment',
      'Internal notes per conversation',
      'Tags and audience segments',
      'Role-based permissions',
    ],
  },
  {
    icon: Phone,
    title: 'WhatsApp Business Features',
    intro: 'Full WhatsApp Business API integration per workspace.',
    paragraphs: [
      'Each workspace connects its own WhatsApp Business account through Meta. Messages are isolated per workspace — your clients\u2019 data never mixes.',
    ],
    bullets: [
      'Per-workspace WhatsApp connection via OAuth',
      'Template message management',
      'Broadcast messaging (Coming soon)',
      'Message delivery and read receipts',
    ],
  },
  {
    icon: Instagram,
    title: 'Instagram Business Features',
    intro: 'Full Instagram Messaging and Comment API support.',
    paragraphs: [
      'Connect your Instagram Business or Creator account to receive and reply to DMs, manage comments, and respond to story replies — all from your Yrull inbox.',
    ],
    bullets: [
      'Instagram DM reading and replying',
      'Comment monitoring and moderation',
      'Story reply handling',
      'Media support (images, videos)',
    ],
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    intro: 'Understand what\u2019s working and where to improve.',
    paragraphs: [
      'Track key metrics like response times, message volume, automation success rates, and contact growth. Use insights to optimize your conversation flows and team performance.',
    ],
    bullets: [
      'Response time tracking',
      'Message volume and trends',
      'Automation performance metrics',
      'Contact growth over time',
    ],
  },
];

export function FeaturesPage() {
  useDocumentTitle(
    'Features',
    'Everything you need to run customer conversations at scale. Unified inbox, flow builder, automations, AI replies, and analytics.',
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-sidebar py-20 text-center text-white sm:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">Features</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Everything you need to run customer conversations at scale
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
            From a unified inbox to AI-powered automations, Yrull gives your team the tools to delight every customer.
          </p>
        </div>
      </section>

      {/* Feature sections */}
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        {SECTIONS.map((s, i) => (
          <section key={s.title} className={`py-12 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                <s.icon className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{s.title}</h2>
            </div>
            <p className="mt-3 text-lg font-medium text-gray-700">{s.intro}</p>
            {s.paragraphs.map((p, j) => (
              <p key={j} className="mt-4 text-sm leading-relaxed text-gray-500">{p}</p>
            ))}
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {s.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-accent" />
                  {b}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="bg-gray-50 py-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-bold text-gray-900">Ready to get started?</h2>
          <p className="mt-3 text-gray-500">14-day free trial. No credit card required.</p>
          <div className="mt-8">
            <Link to="/register">
              <Button size="lg" className="h-12 px-8 text-base">
                Start your free trial <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

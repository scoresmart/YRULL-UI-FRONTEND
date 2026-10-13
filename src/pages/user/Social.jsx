import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles, Send, ThumbsUp, ThumbsDown, RefreshCw,
  Copy, ChevronDown, ChevronUp, MessageCircle, Instagram,
  Youtube, Linkedin, Facebook, Video, HelpCircle, AtSign,
  Bot, X, Loader2, Check, ExternalLink, Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn } from '../../lib/utils';
import { socialApi } from '../../lib/api';
import toast from 'react-hot-toast';

// ─── Platform config ────────────────────────────────────────────────────────
const PLATFORMS = [
  { key: 'all',       label: 'All Platforms',   Icon: Sparkles,       dot: 'bg-gray-400',   iconCls: 'text-gray-500' },
  { key: 'tiktok',    label: 'TikTok',           Icon: Video,          dot: 'bg-gray-900',   iconCls: 'text-gray-900' },
  { key: 'instagram', label: 'Instagram',         Icon: Instagram,      dot: 'bg-pink-500',   iconCls: 'text-pink-500' },
  { key: 'youtube',   label: 'YouTube',           Icon: Youtube,        dot: 'bg-red-600',    iconCls: 'text-red-600' },
  { key: 'linkedin',  label: 'LinkedIn',          Icon: Linkedin,       dot: 'bg-blue-700',   iconCls: 'text-blue-700' },
  { key: 'reddit',    label: 'Reddit',            Icon: MessageCircle,  dot: 'bg-orange-500', iconCls: 'text-orange-500' },
  { key: 'quora',     label: 'Quora',             Icon: HelpCircle,     dot: 'bg-red-700',    iconCls: 'text-red-700' },
  { key: 'facebook',  label: 'Facebook Groups',   Icon: Facebook,       dot: 'bg-blue-600',   iconCls: 'text-blue-600' },
  { key: 'threads',   label: 'Threads',           Icon: AtSign,         dot: 'bg-gray-800',   iconCls: 'text-gray-800' },
  { key: 'whatsapp',  label: 'WhatsApp Channel',  Icon: MessageCircle,  dot: 'bg-green-500',  iconCls: 'text-green-500' },
];

const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map((p) => [p.key, p]));

const STATUS_TABS = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' },
];

// ─── Sample ideas (shown until backend generates real ones) ─────────────────
const SAMPLE_IDEAS = [
  {
    id: 'demo-1',
    platform: 'tiktok',
    category: 'CCL Tips',
    hook: '80% of NAATI CCL fails happen because of THIS one mistake',
    script: `"Are you preparing for NAATI CCL? Here's what nobody tells you: most students fail not because they can't translate — they fail because they miss the register.

Hindi registers: formal vs informal. Your examiner expects you to match the register of the dialogue. If the patient says 'mujhe dard ho raha hai' (informal), your translation should stay informal: 'I'm in pain' — not 'I am experiencing discomfort.'

Our students who focused on this one thing improved by 6–10 marks on their first retry.

Follow for more NAATI CCL tips 👇"

#NAATICCL #NaatiHindi #PTEprep #AustraliaVisa #NaatiPreparation`,
    why_it_works: `Language Academy uses this "one mistake" hook format and consistently gets 50K–200K views. The register tip is genuinely useful and not widely known, driving saves and shares. Our TikTok account already showed 1.7M views on a pinned video — this format can replicate that.`,
    utm_link: 'https://naati.prepsmart.au/hindi?utm_source=tiktok&utm_medium=organic&utm_campaign=ccl_tips&utm_content=register_mistake',
    status: 'pending',
  },
  {
    id: 'demo-2',
    platform: 'instagram',
    category: 'Student Story',
    hook: "She scored 63 in NAATI CCL on her second attempt. Here's what changed.",
    script: `Carousel post (5 slides):

Slide 1: "Priya failed NAATI CCL by 2 marks. She was devastated." [photo: sad face with 61/70 score]

Slide 2: "She changed ONE thing: daily 10-minute AI mock practice." [screenshot of mock test]

Slide 3: "3 weeks later: 63/70. ✅ Pass." [celebration photo]

Slide 4: "The secret? Practising under real exam conditions EVERY day — not just watching tutorials." [tip card]

Slide 5: "Try Score Smart's NAATI CCL AI mock free: link in bio" [CTA card with logo]

Caption: Real student stories 💚 Have a success story to share? DM us!

#NaatiCCL #MigrantAustralia #ScoreSmart #LanguageCertification #NaatiPrep`,
    why_it_works: `Transformation stories outperform tips posts on Instagram by 3–4x. Specific numbers (63/70, 2 marks short) create emotional hooks. E2Language uses this format for their best-performing posts. Our best reel already hit 250K views — student stories are proven performers.`,
    utm_link: 'https://naati.prepsmart.au/hindi?utm_source=instagram&utm_medium=organic&utm_campaign=student_story&utm_content=priya_carousel',
    status: 'pending',
  },
  {
    id: 'demo-3',
    platform: 'youtube',
    category: 'Full Mock Test',
    hook: 'NAATI CCL Hindi Full Mock Test + Feedback (2025) — Medical & Legal Dialogues',
    script: `Video structure (target: 50–60 minutes for maximum watch time):

0:00 — What this mock covers (Hindi ↔ English, Dialogue + Monologue)
1:30 — Exam instructions (same as real exam: no pausing, natural speed)
3:00 — MOCK BEGINS: Dialogue 1 — Medical appointment
12:00 — Dialogue 2 — Legal matter (immigration)
22:00 — Monologue — Community announcement
35:00 — FEEDBACK: Register errors, omission patterns, vocabulary gaps
48:00 — Score estimate + what to focus on for your next attempt

End screen: "Take your next free mock at naati.prepsmart.au/hindi — get AI feedback in seconds"`,
    why_it_works: `Language Academy has 12 videos over 200K views — ALL are full mock tests with timestamps. YouTube rewards watch time. A 50-minute structured mock keeps viewers to the end. This format also ranks for "NAATI CCL mock test Hindi 2025" search terms. Our channel has 9.91K subscribers but hasn't uploaded in 4 months — this would restart momentum.`,
    utm_link: 'https://naati.prepsmart.au/hindi?utm_source=youtube&utm_medium=organic&utm_campaign=mock_test&utm_content=hindi_full_mock',
    status: 'pending',
  },
  {
    id: 'demo-4',
    platform: 'reddit',
    category: 'Community Answer',
    hook: 'r/NAATI: "Best resources for NAATI CCL preparation in Australia?"',
    script: `Reply helpfully on active threads in r/NAATI (search: "Hindi CCL resources 2025"):

---
Here's what's actually working for Hindi CCL prep in 2025:

**Free to start:**
- NAATI's own sample dialogues (naati.com.au) — do these first to understand the format
- YouTube: Language Academy has full mock tests with feedback at @LanguageAcademyPTE

**Paid (worth it):**
- Score Smart's AI mock at naati.prepsmart.au/hindi — gives you instant scores per segment, not just pass/fail. Flags exactly where your register or omissions are losing marks.
- They also have Punjabi and Nepali CCL mocks if that's your language

**The thing nobody mentions:** The pass mark is 63/70. Most people underestimate the monologue. Practise it separately from dialogues.

Happy to answer specific Hindi questions!
---

Note: Be genuinely helpful. Mention Score Smart as one of several options, not as an advertisement.`,
    why_it_works: `No competitor has any Reddit presence at all — this is completely open ground. A helpful, upvoted answer on a high-traffic thread stays visible for years and ranks on Google. A single top answer on r/NAATI can drive 500+ monthly visitors indefinitely. First-mover advantage here is huge.`,
    utm_link: 'https://naati.prepsmart.au/hindi?utm_source=reddit&utm_medium=organic&utm_campaign=community&utm_content=resources_thread',
    status: 'pending',
  },
  {
    id: 'demo-5',
    platform: 'quora',
    category: 'Expert Answer',
    hook: '"What is the passing score for NAATI CCL and how hard is it to achieve?"',
    script: `Detailed Quora answer (500–700 words):

Opening: "The passing score is 63 out of 70 — that's 90%. Here's why that sounds terrifying but is actually achievable with the right preparation."

Cover these points:
1. How scoring works: Dialogue 1 (25 pts) + Dialogue 2 (25 pts) + Monologue (20 pts)
2. What loses marks: register mismatch, omissions, proper nouns not carried over
3. The national pass rate (~55–60% on first attempt)
4. A realistic 4-week preparation schedule
5. Natural mention: "AI mock tests like Score Smart's (naati.prepsmart.au) give you segment-level scores so you know exactly where you're losing marks before exam day"

Close with: invitation to ask follow-up questions in comments.

Write in first-person expert voice. Never sound like an ad.`,
    why_it_works: `This is the single most-searched question about NAATI CCL. No competitor has answered it on Quora. A well-researched answer starts ranking on Google within weeks. Quora answers about exams routinely get 10K–50K monthly views indefinitely. Quora + Reddit together are completely unclaimed territory for this niche.`,
    utm_link: 'https://naati.prepsmart.au?utm_source=quora&utm_medium=organic&utm_campaign=expert_qa&utm_content=passing_score',
    status: 'pending',
  },
  {
    id: 'demo-6',
    platform: 'linkedin',
    category: 'Thought Leadership',
    hook: 'Why migrants keep failing language tests — and what AI can now see that human coaches miss',
    script: `LinkedIn long-form post (600–800 words):

Hook: "Last month, a student told me she'd failed NAATI CCL twice. Both times she scored 61/70 — 2 marks short. She'd studied for months. What went wrong?"

The insight: Students fail not on knowledge but on segment-level consistency — register, omissions, proper nouns — which no classroom course specifically identifies.

The bridge: "This is exactly why we built an AI scoring system at Score Smart that analyses your CCL performance at the segment level, not just your total."

Data point (use real data if available): "Our platform shows that 70%+ of Hindi CCL failures come from Dialogue 2, not the Monologue — the opposite of what most students expect."

CTA (no URL in post): "If you work with migrants or are preparing for NAATI yourself, follow Score Smart. We share weekly insights on what actually moves the score."

Post during Tuesday–Thursday 8–10am AEST for maximum LinkedIn reach.`,
    why_it_works: `LinkedIn is where migration agents, English teachers, settlement workers, and community leaders are. E2Language has 3.7K LinkedIn followers and posts this style regularly. Our LinkedIn has 3 followers — this is a massive growth opportunity with minimal competition. A thought-leadership post reaching 2,000 professionals creates more leads than 50,000 TikTok views.`,
    utm_link: 'https://scoresmart.au?utm_source=linkedin&utm_medium=organic&utm_campaign=thought_leadership&utm_content=ai_accuracy',
    status: 'pending',
  },
];

// ─── Idea Card ───────────────────────────────────────────────────────────────
function IdeaCard({ idea, onApprove, onDecline, onRegenerate }) {
  const [scriptOpen, setScriptOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const plat = PLATFORM_MAP[idea.platform] ?? PLATFORM_MAP.all;
  const { Icon } = plat;

  function copyLink() {
    navigator.clipboard.writeText(idea.utm_link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const statusVariant =
    idea.status === 'approved' ? 'success'
    : idea.status === 'declined' ? 'danger'
    : 'muted';

  const statusLabel =
    idea.status === 'approved' ? 'Approved'
    : idea.status === 'declined' ? 'Declined'
    : 'Pending';

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-white shadow-sm transition-all duration-200',
        idea.status === 'approved' && 'border-emerald-200 ring-1 ring-emerald-100',
        idea.status === 'declined' && 'border-gray-200 opacity-60',
        idea.status === 'pending' && 'border-gray-100 hover:shadow-md',
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <Icon className={cn('h-4 w-4', plat.iconCls)} />
          </span>
          <span className="text-sm font-semibold text-gray-800">{plat.label}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{idea.category}</span>
        </div>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </div>

      {/* Hook */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm font-semibold leading-snug text-gray-900">{idea.hook}</p>
      </div>

      {/* Script (collapsible) */}
      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={() => setScriptOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <span>Script / Caption</span>
          {scriptOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {scriptOpen && (
          <div className="mt-2 rounded-lg bg-gray-50 p-3">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 font-sans">{idea.script}</pre>
          </div>
        )}
      </div>

      {/* Why it works (collapsible) */}
      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={() => setWhyOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
        >
          <span>Why it should work</span>
          {whyOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {whyOpen && (
          <div className="mt-2 rounded-lg bg-amber-50 p-3">
            <p className="text-xs leading-relaxed text-amber-800">{idea.why_it_works}</p>
          </div>
        )}
      </div>

      {/* UTM link */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{idea.utm_link}</span>
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
            title="Copy tracked link"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Actions */}
      {idea.status === 'pending' && (
        <div className="flex items-center gap-2 border-t border-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={() => onApprove(idea.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <ThumbsUp className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={() => onDecline(idea.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            <ThumbsDown className="h-3.5 w-3.5" /> Decline
          </button>
          <button
            type="button"
            onClick={() => onRegenerate(idea.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
          </button>
        </div>
      )}
      {idea.status === 'approved' && (
        <div className="border-t border-gray-50 px-4 py-3 text-xs text-emerald-600 font-medium flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" /> Ready for Harry to post
        </div>
      )}
    </div>
  );
}

// ─── Regenerate Dialog ───────────────────────────────────────────────────────
function RegenerateDialog({ ideaId, onClose, onConfirm, loading }) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Regenerate this idea</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600">
            Tell the AI what to change. Leave blank to generate a fresh idea for the same platform.
          </p>
          <textarea
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent resize-none"
            rows={3}
            placeholder='e.g. "Make it shorter" or "Focus on Punjabi CCL, not Hindi" or "More conversational tone"'
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button size="sm" onClick={() => onConfirm(note)} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────
const CHAT_WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: `Hi! I'm your Score Smart social media manager 👋

I know your business: NAATI CCL (Hindi, Punjabi, Nepali), PTE, and IELTS coaching in Australia. I've also analysed your top 10 competitors — Language Academy, E2Language, Milestone Study, and more.

Ask me anything:
• "What's working for Language Academy on TikTok?"
• "Generate 3 Quora answer ideas for NAATI CCL Punjabi"
• "What should we post on LinkedIn this week?"
• "How do we compete with Milestone Study's TikTok presence?"`,
};

function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([CHAT_WELCOME]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  const chatMutation = useMutation({
    mutationFn: (message) => socialApi.chat(message, messages),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'assistant', text: data.reply },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          text: "I'm not connected to the AI backend yet — it's being set up. In the meantime, check the competitor analysis in the Ideas tab for inspiration.",
        },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text }]);
    setInput('');
    chatMutation.mutate(text);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent/10">
            <Bot className="h-4 w-4 text-brand-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Social Manager</p>
            <p className="text-xs text-gray-400">AI • Knows your competitors</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-brand-accent text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm',
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <textarea
            className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            placeholder="Ask about competitors, content strategy…"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            style={{ maxHeight: 120 }}
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || chatMutation.isPending}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent text-white disabled:opacity-40 hover:bg-[#1fb85a] transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-gray-400">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SocialPage() {
  useDocumentTitle('Social Manager');
  const [platform, setPlatform] = useState('all');
  const [statusTab, setStatusTab] = useState('all');
  const [ideas, setIdeas] = useState(SAMPLE_IDEAS);
  const [chatOpen, setChatOpen] = useState(false);
  const [regenerateTarget, setRegenerateTarget] = useState(null);

  const generateMutation = useMutation({
    mutationFn: () => socialApi.generateIdeas(),
    onSuccess: (data) => {
      if (data?.ideas?.length) {
        setIdeas((prev) => [...data.ideas, ...prev.filter((i) => !i.id.startsWith('demo-'))]);
        toast.success(`Generated ${data.ideas.length} new ideas`);
      } else {
        toast('AI is warming up — try again in a moment', { icon: '⏳' });
      }
    },
    onError: () => {
      toast.error('Generation not available yet — backend setup in progress');
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: ({ id, note }) => socialApi.regenerateIdea(id, note),
    onSuccess: (data, { id }) => {
      if (data?.idea) {
        setIdeas((prev) => prev.map((i) => (i.id === id ? data.idea : i)));
        toast.success('Idea regenerated');
      }
      setRegenerateTarget(null);
    },
    onError: () => {
      toast.error('Regeneration not available yet — backend setup in progress');
      setRegenerateTarget(null);
    },
  });

  function handleApprove(id) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'approved' } : i)));
    toast.success("Idea approved — ready for Harry to post");
    socialApi.approveIdea(id).catch(() => {});
  }

  function handleDecline(id) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'declined' } : i)));
    toast('Idea declined', { icon: '👎' });
    socialApi.declineIdea(id).catch(() => {});
  }

  function handleRegenerate(id) {
    setRegenerateTarget(id);
  }

  function confirmRegenerate(note) {
    if (!regenerateTarget) return;
    regenerateMutation.mutate({ id: regenerateTarget, note });
  }

  // Filter ideas
  const filtered = ideas.filter((idea) => {
    const platMatch = platform === 'all' || idea.platform === platform;
    const statusMatch = statusTab === 'all' || idea.status === statusTab;
    return platMatch && statusMatch;
  });

  // Status counts
  const counts = {
    all: ideas.filter((i) => platform === 'all' || i.platform === platform).length,
    pending: ideas.filter((i) => (platform === 'all' || i.platform === platform) && i.status === 'pending').length,
    approved: ideas.filter((i) => (platform === 'all' || i.platform === platform) && i.status === 'approved').length,
    declined: ideas.filter((i) => (platform === 'all' || i.platform === platform) && i.status === 'declined').length,
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Main content */}
      <div className={cn('flex flex-1 flex-col min-w-0 overflow-hidden', chatOpen && 'lg:mr-[380px]')}>
        {/* Header */}
        <div className="border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Social Manager</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Content ideas for Harry to post · competitor-informed · UTM tracked
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChatOpen((v) => !v)}
                className={cn(chatOpen && 'bg-gray-100')}
              >
                <Bot className="h-4 w-4" />
                Ask AI
              </Button>
              <Button
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Generate Ideas
              </Button>
            </div>
          </div>

          {/* Demo banner */}
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <p className="text-xs text-blue-700">
              <strong>Example ideas</strong> — these are sample ideas based on your competitors. Click <strong>Generate Ideas</strong> to create fresh AI-generated ideas for your accounts.
            </p>
          </div>
        </div>

        {/* Platform tabs */}
        <div className="border-b border-gray-100 bg-white">
          <div className="flex gap-0.5 overflow-x-auto px-4 py-2 scrollbar-none">
            {PLATFORMS.map(({ key, label, Icon: PIcon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setPlatform(key); setStatusTab('all'); }}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  platform === key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                )}
              >
                <PIcon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 border-b border-gray-100 bg-white px-4 py-2">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusTab(key)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                statusTab === key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              )}
            >
              {label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  statusTab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                )}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Ideas grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No ideas here</p>
              <p className="text-xs text-gray-400 mt-1">
                {statusTab !== 'all'
                  ? `No ${statusTab} ideas for this platform yet`
                  : 'Click Generate Ideas to create your first batch'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onApprove={handleApprove}
                  onDecline={handleDecline}
                  onRegenerate={handleRegenerate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat panel - fixed right sidebar */}
      {chatOpen && (
        <>
          {/* Mobile overlay */}
          <div
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setChatOpen(false)}
          />
          <div className="fixed right-0 top-0 z-40 flex h-full w-full max-w-[380px] flex-col border-l border-gray-100 bg-white shadow-xl lg:top-0">
            <ChatPanel onClose={() => setChatOpen(false)} />
          </div>
        </>
      )}

      {/* Regenerate dialog */}
      {regenerateTarget && (
        <RegenerateDialog
          ideaId={regenerateTarget}
          onClose={() => setRegenerateTarget(null)}
          onConfirm={confirmRegenerate}
          loading={regenerateMutation.isPending}
        />
      )}
    </div>
  );
}

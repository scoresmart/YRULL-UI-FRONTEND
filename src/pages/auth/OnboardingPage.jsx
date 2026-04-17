import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, ChevronRight, Check, Loader2,
  Instagram, MessageCircle, Sparkles, Rocket,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BrandMark } from '../../components/brand/BrandMark';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { ENV } from '../../lib/env';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn } from '../../lib/utils';

const BUSINESS_TYPES = [
  'E-commerce', 'Creator / Influencer', 'Marketing Agency', 'Service Business', 'SaaS', 'Other',
];
const TEAM_SIZES = ['Just me', '2–5', '6–20', '20+'];

const CHANNELS = [
  {
    key: 'instagram',
    name: 'Instagram',
    desc: 'DMs, comments, story replies',
    icon: Instagram,
    gradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    path: '/integrations',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Business messaging',
    icon: MessageCircle,
    gradient: 'from-[#25D366] to-[#128C7E]',
    path: '/integrations',
  },
  {
    key: 'messenger',
    name: 'Facebook Messenger',
    desc: 'Page conversations',
    icon: MessageCircle,
    gradient: 'from-[#0084FF] to-[#0062CC]',
    path: '/integrations',
  },
];

const TOTAL_STEPS = 4;

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="flex-1">
          <div className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i < step ? 'bg-green-500' : i === step ? 'bg-green-400' : 'bg-gray-200',
          )} />
        </div>
      ))}
      <span className="ml-2 text-xs text-gray-400">{step + 1}/{TOTAL_STEPS}</span>
    </div>
  );
}

function StepWelcome({ onNext }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-lg">
        <Sparkles className="h-10 w-10 text-white" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Welcome to Yrull</h1>
      <p className="mt-3 max-w-md text-gray-500">
        Automate every customer conversation across Instagram, WhatsApp, and Facebook.
        Let's get you set up in just a few steps.
      </p>
      <Button onClick={onNext} className="mt-8 gap-2 px-8">
        Let's get started <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StepBusiness({ data, setData, onNext, onBack }) {
  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-900">Tell us about your business</h2>
      <p className="mt-1 text-sm text-gray-500">This helps us tailor your experience.</p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Business Name</label>
          <Input
            className="mt-1.5"
            placeholder="Your business name"
            value={data.businessName}
            onChange={(e) => setData((d) => ({ ...d, businessName: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Business Type</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map((bt) => (
              <button
                key={bt}
                type="button"
                onClick={() => setData((d) => ({ ...d, businessType: bt }))}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all',
                  data.businessType === bt
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {bt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-gray-400">Team Size</label>
          <div className="mt-1.5 flex gap-2">
            {TEAM_SIZES.map((ts) => (
              <button
                key={ts}
                type="button"
                onClick={() => setData((d) => ({ ...d, teamSize: ts }))}
                className={cn(
                  'flex-1 rounded-lg border px-2 py-2.5 text-center text-sm font-medium transition-all',
                  data.teamSize === ts
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {ts}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <Button onClick={onNext} className="gap-1.5" disabled={!data.businessName.trim()}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StepChannels({ selected, setSelected, onNext, onBack }) {
  function toggle(key) {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-900">Which channels do you want to connect?</h2>
      <p className="mt-1 text-sm text-gray-500">You can always connect more later.</p>

      <div className="mt-6 space-y-3">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const active = selected.includes(ch.key);
          return (
            <button
              key={ch.key}
              type="button"
              onClick={() => toggle(ch.key)}
              className={cn(
                'group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all',
                active
                  ? 'border-green-400 bg-green-50/50 ring-1 ring-green-200'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
              )}
            >
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-white', ch.gradient)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900">{ch.name}</div>
                <div className="text-xs text-gray-500">{ch.desc}</div>
              </div>
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
                active ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300',
              )}>
                {active && <Check className="h-3.5 w-3.5" />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onNext} className="text-sm text-gray-500 hover:text-gray-900">
            I'll do this later
          </button>
          <Button onClick={onNext} className="gap-1.5">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepDone({ loading, onFinish }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
        <Rocket className="h-10 w-10 text-white" />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-gray-900">You're all set!</h1>
      <p className="mt-3 max-w-md text-gray-500">
        Your workspace is ready. Start managing conversations, connect your channels, and build automations.
      </p>
      <Button onClick={onFinish} disabled={loading} className="mt-8 gap-2 px-8">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Go to inbox
      </Button>
    </div>
  );
}

export function OnboardingPage() {
  useDocumentTitle('Get Started');
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [bizData, setBizData] = useState({
    businessName: profile?.workspace?.name || '',
    businessType: '',
    teamSize: '',
  });
  const [selectedChannels, setSelectedChannels] = useState([]);

  async function handleFinish() {
    setSaving(true);
    const workspaceId = profile?.workspace_id;
    try {
      if (!ENV.USE_MOCK && workspaceId) {
        await supabase.from('workspaces').update({
          name: bizData.businessName.trim() || profile?.workspace?.name,
          metadata: {
            business_type: bizData.businessType,
            team_size: bizData.teamSize,
            onboarded: true,
          },
          onboarded: true,
        }).eq('id', workspaceId);

        if (selectedChannels.length > 0) {
          const rows = selectedChannels.map((ch) => ({
            workspace_id: workspaceId,
            channel: ch,
            connected: false,
          }));
          await supabase.from('workspace_channels').upsert(rows, { onConflict: 'workspace_id,channel' });
        }
      }
      await fetchProfile();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to complete setup');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <BrandMark variant="light" className="text-sm font-semibold" />
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            Skip setup
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-6 py-4">
        <ProgressBar step={step} />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
        {step === 1 && (
          <StepBusiness
            data={bizData}
            setData={setBizData}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepChannels
            selected={selectedChannels}
            setSelected={setSelectedChannels}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && <StepDone loading={saving} onFinish={handleFinish} />}
      </div>
    </div>
  );
}

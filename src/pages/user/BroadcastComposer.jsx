import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MessageCircle,
  Instagram,
  Facebook,
  ArrowLeft,
  ArrowRight,
  Check,
  Users,
  FileText,
  Clock,
  Send,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { broadcastsApi, templatesApi } from '../../lib/api';
import { useTags } from '../../lib/dataHooks';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

const STEPS = [
  { key: 'channel', label: 'Channel', icon: MessageCircle },
  { key: 'audience', label: 'Audience', icon: Users },
  { key: 'message', label: 'Message', icon: FileText },
  { key: 'schedule', label: 'Schedule', icon: Clock },
  { key: 'review', label: 'Review & Send', icon: Send },
];

const CHANNELS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'bg-green-50 border-green-200 text-green-700',
    iconColor: 'text-green-600',
  },
  {
    id: 'instagram',
    label: 'Instagram DM',
    icon: Instagram,
    color: 'bg-pink-50 border-pink-200 text-pink-700',
    iconColor: 'text-pink-600',
  },
  {
    id: 'facebook',
    label: 'Facebook Messenger',
    icon: Facebook,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconColor: 'text-blue-600',
  },
];

function StepIndicator({ steps, current }) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                done ? 'bg-green-600 text-white' : active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            <span className={cn('hidden text-xs font-medium sm:inline', active ? 'text-gray-900' : 'text-gray-400')}>
              {step.label}
            </span>
            {i < steps.length - 1 && <div className="mx-2 h-px w-6 bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}

function ChannelStep({ selected, onSelect }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Choose a channel</h2>
        <p className="mt-1 text-sm text-gray-500">Select the platform you want to send this broadcast on.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {CHANNELS.map((ch) => {
          const Icon = ch.icon;
          const isSelected = selected === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onSelect(ch.id)}
              className={cn(
                'flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                isSelected
                  ? `${ch.color} ring-2 ring-offset-2 ring-gray-300`
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <Icon className={cn('h-8 w-8', isSelected ? ch.iconColor : 'text-gray-400')} />
              <span className={cn('text-sm font-semibold', isSelected ? '' : 'text-gray-700')}>{ch.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AudienceStep({ audience, setAudience, estimate }) {
  const tagsQ = useTags();
  const [tagSearch, setTagSearch] = useState('');

  const filteredTags = useMemo(() => {
    const q = tagSearch.toLowerCase();
    return (tagsQ.data ?? []).filter((t) => t.name.toLowerCase().includes(q));
  }, [tagsQ.data, tagSearch]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Who do you want to send this to?</h2>
        <p className="mt-1 text-sm text-gray-500">Define your audience for this broadcast.</p>
      </div>
      <div className="space-y-3">
        {[
          { value: 'all', label: 'All contacts', desc: 'Send to every contact in your workspace' },
          { value: 'tags', label: 'Contacts with specific tag(s)', desc: 'Filter by one or more tags' },
          { value: 'segment', label: 'Audience segment', desc: 'Use a saved audience segment' },
        ].map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors',
              audience.type === opt.value ? 'border-green-500 bg-green-50/50' : 'border-gray-200 hover:border-gray-300',
            )}
          >
            <input
              type="radio"
              name="audience"
              value={opt.value}
              checked={audience.type === opt.value}
              onChange={() => setAudience({ ...audience, type: opt.value, tags: [], segment: '' })}
              className="mt-0.5 accent-green-600"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {audience.type === 'tags' && (
        <Card className="p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">Select tags</div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              className="pl-9 text-sm"
              placeholder="Search tags..."
            />
          </div>
          {tagsQ.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => {
                const sel = (audience.tags ?? []).includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      const next = sel
                        ? audience.tags.filter((id) => id !== tag.id)
                        : [...(audience.tags ?? []), tag.id];
                      setAudience({ ...audience, tags: next });
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      sel
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {sel && <Check className="mr-1 inline h-3 w-3" />}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {estimate !== null && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-800">
            <Users className="h-4 w-4" /> {estimate.toLocaleString()} contacts will receive this broadcast
          </div>
          {estimate === 0 && (
            <p className="mt-1 text-xs text-yellow-700">
              No contacts match your criteria. Adjust your audience to continue.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MessageStep({ channel, message, setMessage, templates }) {
  if (channel === 'whatsapp') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Compose your message</h2>
          <p className="mt-1 text-sm text-gray-500">
            WhatsApp requires an approved template for broadcasts outside the 24-hour window.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Template</label>
            <select
              value={message.template_id ?? ''}
              onChange={(e) => setMessage({ ...message, template_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
            >
              <option value="">Select a template...</option>
              {(templates ?? [])
                .filter((t) => t.status === 'APPROVED')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.language})
                  </option>
                ))}
            </select>
          </div>

          {message.template_id &&
            (() => {
              const tpl = (templates ?? []).find((t) => t.id === message.template_id);
              if (!tpl) return null;
              const vars = (tpl.body ?? '').match(/\{\{\d+\}\}/g) ?? [];
              return (
                <div className="space-y-4">
                  {vars.length > 0 && (
                    <Card className="p-4">
                      <div className="mb-3 text-sm font-medium text-gray-700">Template variables</div>
                      <div className="space-y-3">
                        {vars.map((v, i) => (
                          <div key={v}>
                            <label className="mb-1 block text-xs text-gray-500">{v}</label>
                            <Input
                              value={(message.variables ?? {})[v] ?? ''}
                              onChange={(e) =>
                                setMessage({
                                  ...message,
                                  variables: { ...(message.variables ?? {}), [v]: e.target.value },
                                })
                              }
                              placeholder={`Value for ${v} (e.g. contact.first_name)`}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                  <Card className="bg-green-50/30 p-4">
                    <div className="mb-2 text-xs font-medium uppercase text-gray-400">Preview</div>
                    <div className="rounded-lg bg-white p-3 text-sm text-gray-800 shadow-sm">
                      {tpl.header && <div className="mb-1 font-semibold">{tpl.header}</div>}
                      <div>{(tpl.body ?? '').replace(/\{\{(\d+)\}\}/g, (m) => (message.variables ?? {})[m] || m)}</div>
                      {tpl.footer && <div className="mt-1 text-xs text-gray-400">{tpl.footer}</div>}
                    </div>
                  </Card>
                </div>
              );
            })()}

          <div className="text-xs text-gray-400">
            Need a new template?{' '}
            <a
              href="/broadcasts/templates/new"
              target="_blank"
              rel="noreferrer"
              className="text-green-600 hover:underline"
            >
              Create one
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Compose your message</h2>
        <p className="mt-1 text-sm text-gray-500">Write the message you want to send to your audience.</p>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <div className="flex items-start gap-2 text-sm text-yellow-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
          <div>
            <span className="font-medium">{channel === 'instagram' ? 'Instagram' : 'Messenger'} 24-hour window:</span>{' '}
            Only contacts who messaged you in the last 24 hours are eligible to receive this broadcast.
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Message</label>
        <textarea
          value={message.text ?? ''}
          onChange={(e) => setMessage({ ...message, text: e.target.value })}
          rows={6}
          maxLength={1000}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
          placeholder="Write your message here..."
        />
        <div className="mt-1 text-right text-xs text-gray-400">{(message.text ?? '').length} / 1000</div>
      </div>
    </div>
  );
}

function ScheduleStep({ schedule, setSchedule }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">When do you want to send this?</h2>
        <p className="mt-1 text-sm text-gray-500">Choose to send now or schedule for a specific date and time.</p>
      </div>
      <div className="space-y-3">
        {[
          { value: 'now', label: 'Send now', desc: 'Broadcast will be sent immediately after review' },
          { value: 'later', label: 'Schedule for later', desc: 'Pick a date and time' },
        ].map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors',
              schedule.when === opt.value ? 'border-green-500 bg-green-50/50' : 'border-gray-200 hover:border-gray-300',
            )}
          >
            <input
              type="radio"
              name="schedule"
              value={opt.value}
              checked={schedule.when === opt.value}
              onChange={() => setSchedule({ ...schedule, when: opt.value })}
              className="mt-0.5 accent-green-600"
            />
            <div>
              <div className="text-sm font-medium text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>
      {schedule.when === 'later' && (
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
              <Input
                type="date"
                value={schedule.date ?? ''}
                onChange={(e) => setSchedule({ ...schedule, date: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Time</label>
              <Input
                type="time"
                value={schedule.time ?? ''}
                onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">Scheduled in your workspace timezone.</p>
        </Card>
      )}
    </div>
  );
}

function ReviewStep({ data, estimate, agreed, setAgreed }) {
  const chInfo = CHANNELS.find((c) => c.id === data.channel);
  const ChIcon = chInfo?.icon || MessageCircle;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review & Send</h2>
        <p className="mt-1 text-sm text-gray-500">Double-check everything before sending.</p>
      </div>
      <Card className="divide-y divide-gray-100">
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-gray-500">Channel</span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <ChIcon className="h-4 w-4" /> {chInfo?.label}
          </span>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-gray-500">Audience</span>
          <span className="text-sm font-medium">
            {data.audience.type === 'all'
              ? 'All contacts'
              : data.audience.type === 'tags'
                ? `${(data.audience.tags ?? []).length} tag(s)`
                : 'Segment'}
          </span>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-gray-500">Recipients</span>
          <Badge variant="success">{(estimate ?? 0).toLocaleString()} contacts</Badge>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm text-gray-500">When</span>
          <span className="text-sm font-medium">
            {data.schedule.when === 'now' ? 'Immediately' : `${data.schedule.date} at ${data.schedule.time}`}
          </span>
        </div>
        {data.message.text && (
          <div className="px-5 py-3">
            <div className="text-sm text-gray-500">Message preview</div>
            <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{data.message.text}</div>
          </div>
        )}
      </Card>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-gray-200 p-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 accent-green-600"
        />
        <span className="text-xs text-gray-600">
          I confirm that all recipients have consented to receive messages from my business, and my message complies
          with Meta's policies and the Australian Spam Act 2003.
        </span>
      </label>
    </div>
  );
}

export function BroadcastComposerPage() {
  useDocumentTitle('New Broadcast');
  const navigate = useNavigate();
  const location = useLocation();
  const duplicate = location.state?.duplicate;

  const [step, setStep] = useState('channel');
  const [name, setName] = useState(duplicate?.name ? `${duplicate.name} (copy)` : '');
  const [channel, setChannel] = useState(duplicate?.channel ?? '');
  const [audience, setAudience] = useState(duplicate?.audience ?? { type: 'all', tags: [], segment: '' });
  const [message, setMessage] = useState(duplicate?.message ?? { text: '', template_id: '', variables: {} });
  const [schedule, setSchedule] = useState({ when: 'now', date: '', time: '' });
  const [agreed, setAgreed] = useState(false);

  const templatesQ = useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: () => templatesApi.list(),
    enabled: channel === 'whatsapp',
  });

  const estimateQ = useQuery({
    queryKey: ['broadcast_estimate', audience],
    queryFn: () =>
      broadcastsApi
        .estimateAudience(audience)
        .then((r) => r.count)
        .catch(() => null),
    enabled: step === 'audience' || step === 'review',
  });

  const sendMut = useMutation({
    mutationFn: (payload) => {
      return broadcastsApi.create(payload).then((b) => {
        if (schedule.when === 'now') return broadcastsApi.send(b.id).then(() => b);
        return b;
      });
    },
    onSuccess: (b) => {
      toast.success(schedule.when === 'now' ? 'Broadcast sent!' : 'Broadcast scheduled!');
      navigate(`/broadcasts/${b.id}`);
    },
    onError: () => toast.error('Failed to create broadcast'),
  });

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const canContinue = useMemo(() => {
    switch (step) {
      case 'channel':
        return !!channel;
      case 'audience':
        return audience.type && (audience.type !== 'tags' || (audience.tags ?? []).length > 0);
      case 'message':
        return channel === 'whatsapp' ? !!message.template_id : (message.text ?? '').trim().length > 0;
      case 'schedule':
        return schedule.when === 'now' || (schedule.date && schedule.time);
      case 'review':
        return agreed;
      default:
        return false;
    }
  }, [step, channel, audience, message, schedule, agreed]);

  function handleNext() {
    if (step === 'review') {
      const est = estimateQ.data ?? 0;
      if (
        est > 100 &&
        !window.confirm(`You're about to send to ${est.toLocaleString()} contacts. This cannot be undone. Continue?`)
      )
        return;
      sendMut.mutate({
        name: name || `Broadcast ${new Date().toLocaleDateString()}`,
        channel,
        audience,
        message,
        scheduled_at: schedule.when === 'later' ? `${schedule.date}T${schedule.time}` : null,
      });
      return;
    }
    setStep(STEPS[stepIdx + 1].key);
  }

  function handleBack() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1].key);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/broadcasts')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">New Broadcast</h1>
        </div>
        <StepIndicator steps={STEPS} current={step} />
      </div>

      {step !== 'channel' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Broadcast name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly promo — May 2025"
            className="max-w-md"
          />
        </div>
      )}

      <Card className="p-6">
        {step === 'channel' && <ChannelStep selected={channel} onSelect={setChannel} />}
        {step === 'audience' && (
          <AudienceStep audience={audience} setAudience={setAudience} estimate={estimateQ.data ?? null} />
        )}
        {step === 'message' && (
          <MessageStep channel={channel} message={message} setMessage={setMessage} templates={templatesQ.data} />
        )}
        {step === 'schedule' && <ScheduleStep schedule={schedule} setSchedule={setSchedule} />}
        {step === 'review' && (
          <ReviewStep
            data={{ channel, audience, message, schedule }}
            estimate={estimateQ.data ?? 0}
            agreed={agreed}
            setAgreed={setAgreed}
          />
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={stepIdx === 0} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNext} disabled={!canContinue || sendMut.isPending} className="gap-1.5">
          {sendMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {step === 'review' ? (schedule.when === 'now' ? 'Send broadcast' : 'Schedule broadcast') : 'Continue'}
          {step !== 'review' && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

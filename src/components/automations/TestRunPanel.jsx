import { useState, useMemo } from 'react';
import {
  X,
  Play,
  Check,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import {
  simulateAutomation,
  DEFAULT_SAMPLE_INPUT,
  TRIGGER_LABELS,
} from '../../lib/automationSimulator';

// Triggers that start from an inbound message, and so need a sample message to
// test a keyword against. A missed-call trigger has nothing to type in.
const MESSAGE_TRIGGERS = new Set([
  'new_message',
  'instagram_dm',
  'instagram_comment',
  'instagram_story_reply',
]);

const STEP_STYLES = {
  ok: { icon: Check, tone: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'border-emerald-100' },
  warning: { icon: AlertTriangle, tone: 'text-amber-600', bg: 'bg-amber-50', ring: 'border-amber-100' },
  error: { icon: XCircle, tone: 'text-red-600', bg: 'bg-red-50', ring: 'border-red-100' },
  skipped: { icon: Clock, tone: 'text-gray-500', bg: 'bg-gray-100', ring: 'border-gray-200' },
};

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

function StepRow({ step, index }) {
  const style = STEP_STYLES[step.status] || STEP_STYLES.ok;
  const Icon = style.icon;
  return (
    <li className={cn('rounded-lg border bg-white p-3', style.ring)}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', style.bg)}>
          <Icon className={cn('h-4 w-4', style.tone)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold text-gray-400">{index + 1}</span>
            <span className="text-sm font-semibold text-gray-900">{step.label}</span>
            {step.status === 'skipped' && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                not run
              </span>
            )}
          </div>
          {step.detail && (
            <p className="mt-0.5 break-words text-sm text-gray-600">{step.detail}</p>
          )}
          {step.issues?.length > 0 && (
            <ul className="mt-1.5 space-y-1">
              {step.issues.map((issue) => (
                <li key={issue} className={cn('text-xs', step.status === 'error' ? 'text-red-600' : 'text-amber-700')}>
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Dry-run panel for the automation builder.
 *
 * Runs the flow against a sample event entirely in the browser and shows every
 * step it would take. Nothing is sent and no integration is called, so it is
 * safe to run against a draft as many times as you like before Set Live.
 */
export default function TestRunPanel({ nodes, edges, onClose }) {
  const triggerType = nodes.find((n) => n.type === 'trigger')?.data?.triggerType || null;
  const [input, setInput] = useState(DEFAULT_SAMPLE_INPUT);
  const [result, setResult] = useState(null);

  const set = (key) => (e) => setInput((prev) => ({ ...prev, [key]: e.target.value }));

  const run = () => setResult(simulateAutomation({ nodes, edges, input }));

  const reset = () => {
    setInput(DEFAULT_SAMPLE_INPUT);
    setResult(null);
  };

  const summary = useMemo(() => {
    if (!result) return null;
    const errors = result.errors.length;
    const warnings = result.warnings.length;
    if (errors) return { tone: 'error', text: `${errors} problem${errors === 1 ? '' : 's'} to fix before going live` };
    if (warnings) return { tone: 'warning', text: `Looks runnable — ${warnings} thing${warnings === 1 ? '' : 's'} worth checking` };
    return { tone: 'ok', text: 'No problems found — safe to set live' };
  }, [result]);

  return (
    <div className="absolute right-0 top-0 z-40 flex h-full w-[400px] flex-col border-l border-gray-200 bg-white shadow-xl">
      <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Test this automation</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            A dry run against a sample contact. Nothing is sent.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close test panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Sample event ------------------------------------------------ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Sample event
          </div>

          {triggerType && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Trigger: <span className="font-medium text-gray-900">{TRIGGER_LABELS[triggerType] || triggerType}</span>
            </div>
          )}

          {/* Only the fields this trigger can actually be tested against.
              A sample message on a missed-call trigger is just noise. */}
          {(!triggerType || MESSAGE_TRIGGERS.has(triggerType)) && (
            <Field label="Message the contact sends" hint="Tested against the trigger's keyword, if it has one.">
              <Input value={input.message} onChange={set('message')} placeholder="hi" />
            </Field>
          )}

          {triggerType === 'airtable_status' && (
            <Field label="New lead status" hint="Tested against the status the trigger waits for.">
              <Input value={input.status} onChange={set('status')} placeholder="Enrolled" />
            </Field>
          )}

          <Field label="Contact name" hint="Fills {first_name} and {caller_name} in your message text.">
            <Input value={input.contactName} onChange={set('contactName')} placeholder="Test Contact" />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone">
              <Input value={input.contactPhone} onChange={set('contactPhone')} />
            </Field>
            <Field label="Email">
              <Input value={input.contactEmail} onChange={set('contactEmail')} />
            </Field>
          </div>

          <Field label="Course name" hint="Fills {course_name}.">
            <Input value={input.courseName} onChange={set('courseName')} />
          </Field>
        </div>

        {/* Result ------------------------------------------------------ */}
        {result && (
          <div className="mt-6">
            <div
              className={cn(
                'rounded-lg border px-3 py-2.5 text-sm font-medium',
                summary.tone === 'error' && 'border-red-200 bg-red-50 text-red-700',
                summary.tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800',
                summary.tone === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              )}
            >
              {summary.text}
            </div>

            {/* Whether the sample event fires the automation at all. A flow
                that never starts is the failure people miss most often. */}
            <div
              className={cn(
                'mt-3 rounded-lg border p-3',
                result.trigger.matched ? 'border-emerald-100 bg-white' : 'border-amber-200 bg-amber-50',
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    result.trigger.matched ? 'bg-emerald-50' : 'bg-amber-100',
                  )}
                >
                  {result.trigger.matched ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{result.trigger.label}</div>
                  <p className="mt-0.5 text-xs text-gray-600">{result.trigger.reason}</p>
                </div>
              </div>
            </div>

            {result.steps.length > 0 && (
              <>
                <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Steps ({result.steps.length})
                </div>
                <ul className="space-y-2">
                  {result.steps.map((step, i) => (
                    <StepRow key={step.nodeId} step={step} index={i} />
                  ))}
                </ul>
              </>
            )}

            {/* Flow-level problems that belong to no single step. */}
            {result.warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="mb-1.5 text-xs font-semibold text-amber-800">Worth checking</div>
                <ul className="space-y-1">
                  {result.warnings.map((w) => (
                    <li key={w} className="text-xs text-amber-800">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-xs text-gray-500">
                Nothing was sent.{' '}
                {result.sent.length > 0 && (
                  <>
                    A live run would have delivered {result.sent.length} message
                    {result.sent.length === 1 ? '' : 's'}.{' '}
                  </>
                )}
                Webhooks, code and integrations are described but never called.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-gray-200 px-5 py-3">
        <Button onClick={run} className="flex-1">
          <Play className="mr-2 h-4 w-4" />
          {result ? 'Run again' : 'Run test'}
        </Button>
        {result && (
          <Button variant="outline" size="icon" onClick={reset} title="Reset sample event">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

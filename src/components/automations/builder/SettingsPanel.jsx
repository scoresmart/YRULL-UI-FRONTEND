import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Switch } from '../../ui/switch';
import { DEFAULT_SETTINGS, TIMEZONES } from './catalog';

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20';

function Section({ title, description, children }) {
  return (
    <section className="border-b border-gray-100 px-5 py-5 last:border-b-0">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description ? <p className="mt-0.5 text-[13px] leading-relaxed text-gray-500">{description}</p> : null}
      <div className="mt-3.5 space-y-3">{children}</div>
    </section>
  );
}

const REENTRY = [
  {
    value: 'after_complete',
    label: 'After the previous run finishes',
    help: 'A contact can go through again, but never twice at the same time.',
  },
  { value: 'once', label: 'Only once per contact', help: 'Each contact goes through this automation one time, ever.' },
  { value: 'always', label: 'Every time it triggers', help: 'Runs can overlap for the same contact.' },
];

/**
 * Automation-level settings. The details are columns on the automation; the
 * behaviour settings live on the trigger node (data.settings), which is where
 * the engine reads them — no database change needed.
 */
export function SettingsPanel({ name, description, folder, platform, settings, onDetails, onSettings, onClose }) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const quiet = { ...DEFAULT_SETTINGS.quietHours, ...(s.quietHours || {}) };
  const setQuiet = (patch) => onSettings({ ...s, quietHours: { ...quiet, ...patch } });

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Automation</div>
          <div className="text-base font-semibold text-gray-900">Settings</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close settings" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Details">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Name</span>
            <input value={name} onChange={(e) => onDetails({ name: e.target.value })} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Description</span>
            <textarea
              value={description || ''}
              onChange={(e) => onDetails({ description: e.target.value })}
              rows={3}
              placeholder="What this automation is for, so teammates know"
              className={cn(inputCls, 'resize-y')}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Folder</span>
            <input value={folder || ''} onChange={(e) => onDetails({ folder: e.target.value })} placeholder="e.g. Lead nurturing" className={inputCls} />
          </label>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-gray-500">Channel</span>
            <span className="font-medium capitalize text-gray-800">{platform || 'whatsapp'}</span>
          </div>
        </Section>

        <Section title="Re-entry" description="Can the same contact go through this automation more than once?">
          {REENTRY.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                s.reentry === opt.value ? 'border-[#25D366] bg-emerald-50/50' : 'border-gray-200 hover:bg-gray-50',
              )}
            >
              <input
                type="radio"
                name="reentry"
                value={opt.value}
                checked={s.reentry === opt.value}
                onChange={() => onSettings({ ...s, reentry: opt.value })}
                className="mt-0.5 accent-[#25D366]"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{opt.help}</span>
              </span>
            </label>
          ))}
        </Section>

        <Section title="Stop when the contact replies" description="End a waiting run as soon as the contact sends a WhatsApp message — useful for follow-up sequences.">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-800">Stop on reply</span>
            <Switch checked={Boolean(s.stopOnReply)} onCheckedChange={(v) => onSettings({ ...s, stopOnReply: v })} />
          </label>
        </Section>

        <Section title="Quiet hours" description="Messages due during quiet hours wait and send when they end.">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-800">Pause sending overnight</span>
            <Switch checked={Boolean(quiet.enabled)} onCheckedChange={(v) => setQuiet({ enabled: v })} />
          </label>
          {quiet.enabled ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-gray-700">From</span>
                  <input type="time" value={quiet.start} onChange={(e) => setQuiet({ start: e.target.value })} className={inputCls} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Until</span>
                  <input type="time" value={quiet.end} onChange={(e) => setQuiet({ end: e.target.value })} className={inputCls} />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Time zone</span>
                <select value={quiet.timezone} onChange={(e) => setQuiet({ timezone: e.target.value })} className={inputCls}>
                  {[...new Set([quiet.timezone, ...TIMEZONES])].map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </Section>
      </div>
    </aside>
  );
}

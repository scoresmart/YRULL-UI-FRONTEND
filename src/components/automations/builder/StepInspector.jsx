import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Braces, Plus, Repeat, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../../../lib/utils';
import { tagsApi } from '../../../lib/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import {
  ACTIONS_BY_TYPE,
  CLAUDE_MODES,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  DELAY_UNITS,
  TONES,
  TRIGGERS_BY_TYPE,
  UNSUPPORTED_ACTION_LABELS,
  VARIABLES,
  nodeIssues,
} from './catalog';

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20 disabled:bg-gray-50';

const AIRTABLE_FIELDS = [
  'Status',
  'Caller',
  'Notes',
  'Exam Type',
  'Desired Score',
  'Exam Deadline',
  'Objection Reason',
  'Price Quoted',
  'SOURCE',
];

const TAG_DOT = { green: 'bg-green-500', blue: 'bg-blue-500', purple: 'bg-purple-500', orange: 'bg-amber-500', red: 'bg-red-500' };

function Field({ label, hint, children, action }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-[13px] font-medium text-gray-700">{label}</label>
        {action}
      </div>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{hint}</p> : null}
    </div>
  );
}

/** Insert {first_name}-style variables at the cursor of the field it belongs to. */
function VariableMenu({ targetRef, value, onChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-[#008069] hover:bg-emerald-50">
          <Braces className="h-3.5 w-3.5" />
          Insert variable
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {VARIABLES.map((v) => (
          <DropdownMenuItem
            key={v.token}
            onSelect={() => {
              const el = targetRef.current;
              const text = value || '';
              const start = el?.selectionStart ?? text.length;
              const end = el?.selectionEnd ?? text.length;
              onChange(text.slice(0, start) + v.token + text.slice(end));
              requestAnimationFrame(() => {
                el?.focus();
                el?.setSelectionRange(start + v.token.length, start + v.token.length);
              });
            }}
            className="justify-between"
          >
            <span>{v.label}</span>
            <code className="text-[11px] text-gray-400">{v.token}</code>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TextWithVariables({ label, hint, value, onChange, rows = 4, placeholder, mono }) {
  const ref = useRef(null);
  const Tag = rows > 1 ? 'textarea' : 'input';
  return (
    <Field label={label} hint={hint} action={<VariableMenu targetRef={ref} value={value} onChange={onChange} />}>
      <Tag
        ref={ref}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows > 1 ? rows : undefined}
        placeholder={placeholder}
        spellCheck={!mono}
        className={cn(inputCls, rows > 1 && 'resize-y leading-relaxed', mono && 'font-mono text-[12.5px]')}
      />
    </Field>
  );
}

const templateParamCount = (template) => {
  const body = (template?.components || []).find((c) => (c.type || '').toUpperCase() === 'BODY');
  const nums = (body?.text || '').match(/{{\s*(\d+)\s*}}/g)?.map((m) => Number(m.replace(/\D/g, ''))) || [];
  return nums.length ? Math.max(...nums) : 0;
};

function TemplateFields({ data, onChange, templates, templatesLoading, nameField, label, hint, optional }) {
  const name = data[nameField] || '';
  const selected = templates.find((t) => t.name === name && (!data.templateLang || t.language === data.templateLang))
    || templates.find((t) => t.name === name);
  const params = Array.isArray(data.templateParams)
    ? data.templateParams
    : String(data.templateParams || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const count = selected ? templateParamCount(selected) : params.length;
  const body = (selected?.components || []).find((c) => (c.type || '').toUpperCase() === 'BODY')?.text;

  return (
    <div className="space-y-3">
      <Field label={label} hint={hint}>
        {templates.length ? (
          <select
            value={name ? `${name}::${data.templateLang || selected?.language || ''}` : ''}
            onChange={(e) => {
              const [n, lang] = e.target.value.split('::');
              onChange({ [nameField]: n, templateLang: lang || '', templateParams: [] });
            }}
            className={inputCls}
          >
            <option value="">{optional ? 'No fallback template' : templatesLoading ? 'Loading templates…' : 'Choose a template'}</option>
            {templates.map((t) => (
              <option key={`${t.name}::${t.language}`} value={`${t.name}::${t.language}`}>
                {t.name} · {t.language}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => onChange({ [nameField]: e.target.value })}
              placeholder="Template name, exactly as approved"
              className={inputCls}
            />
            <input
              value={data.templateLang || ''}
              onChange={(e) => onChange({ templateLang: e.target.value })}
              placeholder="Language code, e.g. en_US"
              className={inputCls}
            />
            {!templatesLoading ? (
              <p className="text-xs text-amber-700">
                Couldn&apos;t load your templates — reconnect Facebook under Templates to choose from a list. Typing the
                exact name still works.
              </p>
            ) : null}
          </div>
        )}
      </Field>
      {body ? (
        <div className="rounded-lg border border-gray-100 bg-[#F0F2F5] p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Preview</div>
          <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800">{body}</div>
        </div>
      ) : null}
      {name && count > 0
        ? Array.from({ length: count }, (_, i) => (
            <TextWithVariables
              key={i}
              label={`Value for {{${i + 1}}}`}
              rows={1}
              value={params[i] || ''}
              placeholder={i === 0 ? '{first_name}' : ''}
              onChange={(v) => {
                const next = Array.from({ length: count }, (_, j) => (j === i ? v : params[j] || ''));
                onChange({ templateParams: next });
              }}
            />
          ))
        : null}
    </div>
  );
}

function TagFields({ data, onChange, tags }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const current = data.tag || data.tagName || '';

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const tag = await tagsApi.create({ name, color: 'green', description: '' });
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      onChange({ tag: tag?.name || name, tagId: tag?.id, tagName: tag?.name || name, tagColor: tag?.color || 'green' });
      setCreating(false);
      setNewName('');
    } catch (err) {
      toast.error(err.message || 'Could not create the tag');
    }
  };

  return (
    <Field label="Tag">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange({ tag: t.name, tagId: t.id, tagName: t.name, tagColor: t.color })}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] transition-colors',
              current === t.name ? 'border-[#25D366] bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', TAG_DOT[t.color] || 'bg-gray-400')} />
            {t.name}
          </button>
        ))}
        {creating ? (
          <div className="flex w-full items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="New tag name"
              className={inputCls}
            />
            <button type="button" onClick={create} className="shrink-0 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:bg-[#1fb85a]">
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-[13px] text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New tag
          </button>
        )}
      </div>
      {current && !tags.some((t) => t.name === current) ? (
        <p className="mt-2 text-xs text-gray-500">
          Current: <span className="font-medium text-gray-700">{current}</span>
        </p>
      ) : null}
    </Field>
  );
}

function AirtableFields({ data, onChange }) {
  const op = data.airtableOp || 'update_lead';
  const rows = Array.isArray(data.airtableFields) ? data.airtableFields : [];
  const setRows = (next) => onChange({ airtableFields: next });
  return (
    <div className="space-y-4">
      <Field label="What to do">
        <select value={op} onChange={(e) => onChange({ airtableOp: e.target.value })} className={inputCls}>
          <option value="update_lead">Update the lead</option>
          <option value="create_lead">Add the contact to the CRM</option>
          <option value="add_note">Add a note to the lead</option>
        </select>
      </Field>
      {op === 'add_note' ? (
        <TextWithVariables label="Note" value={data.airtableNote} onChange={(v) => onChange({ airtableNote: v })} rows={3} placeholder="Asked about weekend classes" />
      ) : (
        <Field label="Fields to write" hint="Field names must match your Airtable columns exactly.">
          <datalist id="airtable-field-names">
            {AIRTABLE_FIELDS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  list="airtable-field-names"
                  value={row.field || ''}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, field: e.target.value } : r)))}
                  placeholder="Field"
                  className={cn(inputCls, 'w-[42%]')}
                />
                <input
                  value={row.value || ''}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
                  placeholder="Value or {variable}"
                  className={inputCls}
                />
                <button
                  type="button"
                  aria-label="Remove field"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows([...rows, { field: '', value: '' }])}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-[#008069] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add field
            </button>
          </div>
        </Field>
      )}
      <Field label="Find the lead by email (optional)" hint="Leave empty to match on the contact's phone number.">
        <input value={data.airtableEmail || ''} onChange={(e) => onChange({ airtableEmail: e.target.value })} placeholder="{email}" className={inputCls} />
      </Field>
    </div>
  );
}

const PLAN_FIELDS = [
  ['crash', 'Short plan', 'our 2-Week PTE Crash Course'],
  ['month', 'Longer plan', 'our 1-Month PTE Course'],
  ['mocks', 'Practice only', 'our scored PTE mock tests'],
];

/** A template picker without {{1}} inputs — the Qualify step fills those itself. */
function TemplateSelect({ label, hint, name, lang, onChange, templates, emptyLabel }) {
  return (
    <Field label={label} hint={hint}>
      {templates.length ? (
        <select
          value={name ? `${name}::${lang || templates.find((t) => t.name === name)?.language || ''}` : ''}
          onChange={(e) => {
            const [n, l] = e.target.value.split('::');
            onChange(n || '', l || '');
          }}
          className={inputCls}
        >
          <option value="">{emptyLabel}</option>
          {templates.map((t) => (
            <option key={`${t.name}::${t.language}`} value={`${t.name}::${t.language}`}>
              {t.name} · {t.language}
            </option>
          ))}
        </select>
      ) : (
        <input value={name || ''} onChange={(e) => onChange(e.target.value, lang)} placeholder={emptyLabel} className={inputCls} />
      )}
    </Field>
  );
}

function ClaudeFields({ data, onChange, templates }) {
  const mode = data.mode || 'reply';
  const plans = data.plans || {};
  return (
    <div className="space-y-5">
      <Field label="What should Claude do?">
        <div className="grid grid-cols-3 gap-2">
          {CLAUDE_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ mode: m.value })}
              className={cn(
                'rounded-lg border px-2 py-2 text-[13px] transition-colors',
                mode === m.value ? 'border-violet-400 bg-violet-50 font-medium text-violet-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
              )}
            >
              {m.short}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">{CLAUDE_MODES.find((m) => m.value === mode)?.description}</p>
      </Field>

      {mode === 'qualify' ? (
        <>
          <div className="rounded-lg border border-gray-100 bg-[#F0F2F5] p-3 text-[13px] leading-relaxed text-gray-800">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Example</div>
            Hi Priya, we have received your enquiry regarding the PTE course. We have noted your previous score of 6 each
            after 2 attempts. To help you further, could you tell us your desired score and your exam deadline?
          </div>
          <TemplateSelect
            label="Template for new leads"
            hint="Leads who haven't messaged you can only get an approved template. It must take {{1}} name, {{2}} course and {{3}} the question. If they've written in the last 24 hours, a plain message is sent instead."
            name={data.templateName}
            lang={data.templateLang}
            templates={templates}
            emptyLabel="new_lead_personalised (default)"
            onChange={(n, l) => onChange({ templateName: n, templateLang: l })}
          />
          <TemplateSelect
            label="Backup template"
            hint="Sent while the template above is waiting for Meta's approval, paused or disabled. Gets only {{1}} name."
            name={data.backupTemplate}
            lang={data.backupTemplateLang}
            templates={templates}
            emptyLabel="No backup"
            onChange={(n, l) => onChange({ backupTemplate: n, backupTemplateLang: l })}
          />
          <Field label="Plans Claude can recommend" hint="Chosen by the gap between their scores and the time left. Leave a box empty to keep the default.">
            <div className="space-y-2">
              {PLAN_FIELDS.map(([key, label, placeholder]) => (
                <div key={key}>
                  <div className="mb-1 text-xs text-gray-500">{label}</div>
                  <input
                    value={plans[key] || ''}
                    onChange={(e) => onChange({ plans: { ...plans, [key]: e.target.value } })}
                    placeholder={placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </Field>
          <TextWithVariables
            label="How to word the recommendation (optional)"
            value={data.instructions}
            onChange={(v) => onChange({ instructions: v })}
            rows={3}
            placeholder="Mention we have weekend batches. Keep it short."
            hint="Claude rewords the reply to follow this, but always keeps the plan that was chosen."
          />
        </>
      ) : null}

      {mode === 'reply' ? (
        <>
          <TextWithVariables
            label="Instructions for Claude"
            value={data.instructions}
            onChange={(v) => onChange({ instructions: v })}
            rows={5}
            placeholder="Answer their question, then suggest a free scored mock test and offer a call. Don't quote prices."
            hint="Claude also sees their CRM details and the last 20 messages. It never quotes prices or guarantees scores."
          />
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            WhatsApp only delivers these to contacts who messaged you in the last 24 hours, so use this after a “Message
            received” trigger. For brand-new CRM leads use Qualify, which sends a template. When this step answers a
            message, the automatic AI reply is skipped so they don&apos;t get two.
          </p>
        </>
      ) : null}

      {mode === 'analyse' ? (
        <>
          <label className="flex items-start gap-2.5 text-[13px] text-gray-700">
            <input type="checkbox" checked={data.addTag !== false} onChange={(e) => onChange({ addTag: e.target.checked })} className="mt-0.5 h-4 w-4 accent-violet-600" />
            <span>
              Tag them <span className="font-medium">Hot lead</span>, <span className="font-medium">Warm lead</span> or{' '}
              <span className="font-medium">Cold lead</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-[13px] text-gray-700">
            <input type="checkbox" checked={!!data.saveToCrm} onChange={(e) => onChange({ saveToCrm: e.target.checked })} className="mt-0.5 h-4 w-4 accent-violet-600" />
            <span>Write the scores and deadline they mention to the CRM, with a one-line summary in Notes</span>
          </label>
          <p className="text-xs leading-relaxed text-gray-500">
            Add a Condition step after this and check <span className="font-medium">Claude: hot / warm / cold</span> or{' '}
            <span className="font-medium">Claude: intent</span> (enquiry, pricing, ready_to_enrol, wants_call, not_interested,
            other). Later messages can use {'{ai_summary}'}.
          </p>
        </>
      ) : null}
    </div>
  );
}

function TriggerFields({ data, onChange, tags }) {
  if (data.triggerType === 'new_message') {
    const mode = data.keyword ? 'keyword' : data.keywordMode || 'any';
    return (
      <div className="space-y-3">
        <Field label="Start when">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['any', 'Any message'],
              ['keyword', 'Message contains…'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange(value === 'any' ? { keyword: '', keywordMode: 'any' } : { keywordMode: 'keyword' })}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm transition-colors',
                  mode === value ? 'border-[#25D366] bg-emerald-50 font-medium text-emerald-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        {mode === 'keyword' ? (
          <Field label="Keyword" hint="Matches anywhere in the message, ignoring capital letters — “price” also matches “What’s the PRICE?”">
            <input autoFocus value={data.keyword || ''} onChange={(e) => onChange({ keyword: e.target.value })} placeholder="e.g. price" className={inputCls} />
          </Field>
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            Runs on every incoming message. Pair it with a Condition step or the “re-entry” setting so contacts aren&apos;t
            messaged repeatedly.
          </p>
        )}
      </div>
    );
  }
  if (data.triggerType === 'airtable_status') {
    return (
      <Field label="Status" hint="Leave empty to run on any status change. Must match the CRM status text.">
        <input value={data.status || ''} onChange={(e) => onChange({ status: e.target.value })} placeholder="e.g. Enrolled" className={inputCls} />
      </Field>
    );
  }
  if (data.triggerType === 'tag_added') {
    return (
      <Field label="Tag" hint="Leave empty to run whenever any tag is added. Fires when an automation's Add tag step adds it.">
        <select value={data.tag || ''} onChange={(e) => onChange({ tag: e.target.value })} className={inputCls}>
          <option value="">Any tag</option>
          {tags.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return <p className="text-sm text-gray-500">This trigger has no extra options.</p>;
}

function ActionFields({ data, onChange, templates, templatesLoading, tags, members }) {
  switch (data.actionType) {
    case 'send_message':
      return (
        <div className="space-y-5">
          <TextWithVariables label="Message" value={data.message} onChange={(v) => onChange({ message: v })} rows={5} placeholder="Hi {first_name}, thanks for reaching out!" hint="WhatsApp formatting works: *bold*, _italic_, ~strike~." />
          <TemplateFields
            data={data}
            onChange={onChange}
            templates={templates}
            templatesLoading={templatesLoading}
            nameField="fallbackTemplate"
            label="Fallback template"
            optional
            hint="Plain messages only reach contacts who messaged you in the last 24 hours. If the window is closed, this template is sent instead — set one unless the trigger is an incoming message."
          />
        </div>
      );
    case 'send_template':
      return (
        <TemplateFields
          data={data}
          onChange={onChange}
          templates={templates}
          templatesLoading={templatesLoading}
          nameField="templateName"
          label="Template"
          hint="Approved templates can be sent at any time, even outside the 24-hour window."
        />
      );
    case 'send_call_button':
      return (
        <div className="space-y-5">
          <TextWithVariables label="Message" value={data.message} onChange={(v) => onChange({ message: v })} rows={3} placeholder="Tap below to call us!" />
          <Field label="Button text" hint="Up to 20 characters.">
            <input value={data.displayText || ''} maxLength={20} onChange={(e) => onChange({ displayText: e.target.value })} placeholder="Call ScoreSmart" className={inputCls} />
          </Field>
        </div>
      );
    case 'request_call_permission':
      return (
        <div className="space-y-5">
          <TextWithVariables
            label="What to ask"
            value={data.message}
            onChange={(v) => onChange({ message: v })}
            rows={3}
            placeholder="May we call you on WhatsApp about your enquiry?"
          />
          <p className="text-xs leading-relaxed text-gray-500">
            The contact gets an Allow / Decline prompt. Allow lets you call them for the next 7 days, or
            permanently if they choose that. WhatsApp only delivers this inside the 24-hour window and
            allows one ask per contact per day, so put this step after they reply.
          </p>
        </div>
      );
    case 'send_email':
      return (
        <div className="space-y-5">
          <Field label="Send to" hint="Leave empty to use the contact's email address.">
            <input value={data.to || ''} onChange={(e) => onChange({ to: e.target.value })} placeholder="Contact's email" className={inputCls} />
          </Field>
          <TextWithVariables label="Subject" rows={1} value={data.subject} onChange={(v) => onChange({ subject: v })} placeholder="Your course details, {first_name}" />
          <TextWithVariables label="Body (HTML)" value={data.body} onChange={(v) => onChange({ body: v })} rows={10} mono placeholder="<p>Hi {first_name},</p>" />
        </div>
      );
    case 'send_ig_dm':
      return <TextWithVariables label="Message" value={data.message} onChange={(v) => onChange({ message: v })} rows={5} placeholder="Thanks for your message, {first_name}!" />;
    case 'add_tag':
    case 'remove_tag':
      return <TagFields data={data} onChange={onChange} tags={tags} />;
    case 'assign':
      return (
        <Field label="Teammate" hint="Recorded on the contact so your team knows who owns the conversation.">
          {members.length ? (
            <select
              value={data.assignee || ''}
              onChange={(e) => {
                const m = members.find((x) => x.email === e.target.value);
                onChange({ assignee: e.target.value, assigneeName: m?.full_name || e.target.value });
              }}
              className={inputCls}
            >
              <option value="">Choose a teammate</option>
              {members.map((m) => (
                <option key={m.id || m.email} value={m.email}>
                  {m.full_name ? `${m.full_name} (${m.email})` : m.email}
                </option>
              ))}
            </select>
          ) : (
            <input value={data.assignee || ''} onChange={(e) => onChange({ assignee: e.target.value, assigneeName: e.target.value })} placeholder="Teammate's email" className={inputCls} />
          )}
        </Field>
      );
    case 'delay':
      return (
        <Field label="Wait for" hint="Waiting steps survive restarts; the next step runs once the time is up.">
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={data.duration ?? ''}
              onChange={(e) => onChange({ duration: e.target.value === '' ? '' : Math.max(1, Number(e.target.value)) })}
              className={cn(inputCls, 'w-28')}
            />
            <select value={data.unit || 'seconds'} onChange={(e) => onChange({ unit: e.target.value })} className={inputCls}>
              {DELAY_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </Field>
      );
    case 'condition': {
      const noValue = ['exists', 'not_exists'].includes(data.operator);
      return (
        <div className="space-y-4">
          <Field label="Check">
            <select value={data.field || ''} onChange={(e) => onChange({ field: e.target.value, operator: data.operator || 'contains' })} className={inputCls}>
              <option value="">Choose a field</option>
              {CONDITION_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rule">
            <select value={data.operator || 'contains'} onChange={(e) => onChange({ operator: e.target.value })} className={inputCls}>
              {CONDITION_OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          {!noValue ? (
            <Field label="Value" hint="Not case-sensitive.">
              <input value={data.value || ''} onChange={(e) => onChange({ value: e.target.value })} placeholder={data.field === 'tags' ? 'e.g. Hot lead' : ''} className={inputCls} />
            </Field>
          ) : null}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
              <span className="font-semibold">Yes</span> — the rule matches
            </div>
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">
              <span className="font-semibold">No</span> — it doesn&apos;t
            </div>
          </div>
        </div>
      );
    }
    case 'claude_ai':
      return <ClaudeFields data={data} onChange={onChange} templates={templates} />;
    case 'custom_integration':
      return <AirtableFields data={data} onChange={onChange} />;
    case 'webhook':
      return (
        <div className="space-y-4">
          <Field label="URL" hint="Receives a POST with the contact (name, phone, tags), the trigger details and the automation id.">
            <input value={data.url || ''} onChange={(e) => onChange({ url: e.target.value.trim() })} placeholder="https://example.com/hooks/yrull" className={inputCls} />
          </Field>
        </div>
      );
    default:
      return (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {UNSUPPORTED_ACTION_LABELS[data.actionType] || 'This'} steps aren&apos;t run by the automation engine, so this step is
          skipped. Change it to a supported step or delete it.
        </div>
      );
  }
}

/** Right-hand panel for the selected trigger or step. */
export function StepInspector({ node, stepNumber, templates, templatesLoading, tags, members, onChange, onChangeType, onDelete, onClose }) {
  const isTrigger = node.type === 'trigger';
  const def = isTrigger ? TRIGGERS_BY_TYPE[node.data.triggerType] : ACTIONS_BY_TYPE[node.data.actionType];
  const tone = TONES[isTrigger ? 'trigger' : def?.tone || 'slate'];
  const Icon = def?.icon || AlertTriangle;
  const issues = useMemo(() => nodeIssues(node), [node]);

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone.chip)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {isTrigger ? 'Trigger' : stepNumber ? `Step ${stepNumber}` : 'Step'}
          </div>
          <div className="truncate text-base font-semibold text-gray-900">
            {def?.label || UNSUPPORTED_ACTION_LABELS[node.data.actionType] || (isTrigger ? 'Choose a trigger' : 'Unknown step')}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close panel" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {def?.description ? <p className="text-[13px] leading-relaxed text-gray-500">{def.description}</p> : null}
        {issues.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            {issues.map((i) => (
              <div key={i} className="flex items-start gap-2 text-[13px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {i}
              </div>
            ))}
          </div>
        ) : null}
        {isTrigger ? (
          def ? <TriggerFields data={node.data} onChange={onChange} tags={tags} /> : null
        ) : (
          <ActionFields data={node.data} onChange={onChange} templates={templates} templatesLoading={templatesLoading} tags={tags} members={members} />
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3">
        <button
          type="button"
          onClick={onChangeType}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
        >
          <Repeat className="h-3.5 w-3.5" />
          {isTrigger ? 'Change trigger' : 'Change step'}
        </button>
        {!isTrigger ? (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete step
          </button>
        ) : null}
      </div>
    </aside>
  );
}

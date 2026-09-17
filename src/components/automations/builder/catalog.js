import {
  AtSign,
  Clock,
  FileText,
  GitBranch,
  Instagram,
  Mail,
  MessageSquare,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Table2,
  Tag,
  Tags,
  UserCheck,
  UserPlus,
  Webhook,
  Zap,
} from 'lucide-react';

/*
 * Everything the builder offers, limited to what the automation engine
 * (scoresmart-automations/automation_engine.py) actually executes. A step the
 * engine doesn't know is logged as "skipped" there, so offering one would
 * build automations that silently do nothing.
 */

export const TRIGGER_GROUPS = ['WhatsApp', 'Calls', 'Instagram', 'CRM', 'Contacts'];

export const TRIGGERS = [
  {
    type: 'new_message',
    group: 'WhatsApp',
    label: 'Message received',
    description: 'A contact sends a WhatsApp message — any message, or one containing a keyword.',
    icon: MessageSquare,
  },
  {
    type: 'contact_created',
    group: 'WhatsApp',
    label: 'New WhatsApp contact',
    description: 'Someone messages your number for the first time.',
    icon: UserPlus,
  },
  {
    type: 'incoming_call',
    group: 'Calls',
    label: 'Incoming call',
    description: 'A contact calls your WhatsApp number.',
    icon: PhoneIncoming,
  },
  {
    type: 'missed_call',
    group: 'Calls',
    label: 'Missed call',
    description: 'A WhatsApp call to your number goes unanswered.',
    icon: PhoneMissed,
  },
  {
    type: 'instagram_dm',
    group: 'Instagram',
    label: 'Instagram DM',
    description: 'Someone sends your Instagram account a direct message.',
    icon: Instagram,
  },
  {
    type: 'instagram_comment',
    group: 'Instagram',
    label: 'Instagram comment',
    description: 'Someone comments on one of your posts.',
    icon: MessageSquare,
  },
  {
    type: 'instagram_story_reply',
    group: 'Instagram',
    label: 'Instagram story reply',
    description: 'Someone replies to your story.',
    icon: AtSign,
  },
  {
    type: 'lead_created',
    group: 'CRM',
    label: 'New CRM lead',
    description: 'A lead is added to the Airtable CRM.',
    icon: UserPlus,
  },
  {
    type: 'airtable_status',
    group: 'CRM',
    label: 'Lead status changes',
    description: "A lead's status changes in the CRM — to any status, or a specific one.",
    icon: Zap,
  },
  {
    type: 'tag_added',
    group: 'Contacts',
    label: 'Tag added',
    description: 'A tag is added to a contact by another automation step.',
    icon: Tag,
  },
];

export const ACTION_GROUPS = ['Send', 'Contact', 'Flow', 'Integrations'];

// Variables the engine fills in (_resolve_variables). Both {x} and {{x}} work.
export const VARIABLES = [
  { token: '{first_name}', label: 'First name' },
  { token: '{name}', label: 'Full name' },
  { token: '{phone}', label: 'Phone' },
  { token: '{email}', label: 'Email' },
  { token: '{message}', label: 'Their message' },
  { token: '{course_name}', label: 'Course' },
  { token: '{status}', label: 'CRM status' },
  { token: '{source}', label: 'Lead source' },
];

export const DELAY_UNITS = ['minutes', 'hours', 'days', 'seconds'];

export const CONDITION_FIELDS = [
  { value: 'tags', label: 'Tags' },
  { value: 'message', label: 'Their last message' },
  { value: 'name', label: 'Name' },
  { value: 'source', label: 'Lead source' },
  { value: 'campaign_name', label: 'Ad campaign' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

export const CONDITION_OPERATORS = [
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: "doesn't contain" },
  { value: 'equals', label: 'is exactly' },
  { value: 'not_equals', label: 'is not' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'exists', label: 'has any value' },
  { value: 'not_exists', label: 'is empty' },
];

const plural = (n, unit) => `${n} ${Number(n) === 1 ? unit.replace(/s$/, '') : unit}`;
const clip = (s, n = 70) => {
  const text = String(s || '').replace(/\s+/g, ' ').trim();
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
};

export const ACTIONS = [
  {
    type: 'send_message',
    group: 'Send',
    label: 'WhatsApp message',
    description: 'Send a text. Uses a fallback template if the 24-hour window is closed.',
    icon: MessageSquare,
    tone: 'green',
    summary: (d) => (d.message ? `“${clip(d.message)}”` : ''),
    issues: (d) => (d.message?.trim() ? [] : ['Write the message']),
  },
  {
    type: 'send_template',
    group: 'Send',
    label: 'WhatsApp template',
    description: 'Send a Meta-approved template. Works at any time.',
    icon: FileText,
    tone: 'green',
    summary: (d) => d.templateName || '',
    issues: (d) => (d.templateName ? [] : ['Choose a template']),
  },
  {
    type: 'send_call_button',
    group: 'Send',
    label: 'Call button',
    description: 'Send a message with a button that calls your WhatsApp number.',
    icon: PhoneCall,
    tone: 'green',
    summary: (d) => clip(d.message || 'Tap below to call us!'),
    issues: () => [],
  },
  {
    type: 'send_email',
    group: 'Send',
    label: 'Email',
    description: "Send an email to the contact's address.",
    icon: Mail,
    tone: 'rose',
    summary: (d) => d.subject || '',
    issues: (d) => [!d.subject?.trim() && 'Add a subject', !d.body?.trim() && 'Write the email'].filter(Boolean),
  },
  {
    type: 'send_ig_dm',
    group: 'Send',
    label: 'Instagram DM',
    description: 'Reply in Instagram direct messages.',
    icon: Instagram,
    tone: 'purple',
    summary: (d) => (d.message ? `“${clip(d.message)}”` : ''),
    issues: (d) => (d.message?.trim() ? [] : ['Write the message']),
  },
  {
    type: 'add_tag',
    group: 'Contact',
    label: 'Add tag',
    description: 'Label the contact, e.g. "Hot lead".',
    icon: Tag,
    tone: 'orange',
    summary: (d) => d.tag || d.tagName || '',
    issues: (d) => (d.tag ? [] : ['Choose a tag']),
  },
  {
    type: 'remove_tag',
    group: 'Contact',
    label: 'Remove tag',
    description: 'Take a label off the contact.',
    icon: Tags,
    tone: 'orange',
    summary: (d) => d.tag || d.tagName || '',
    issues: (d) => (d.tag ? [] : ['Choose a tag']),
  },
  {
    type: 'assign',
    group: 'Contact',
    label: 'Assign to teammate',
    description: 'Mark who is responsible for this contact.',
    icon: UserCheck,
    tone: 'blue',
    summary: (d) => d.assigneeName || d.assignee || '',
    issues: (d) => (d.assignee ? [] : ['Choose a teammate']),
  },
  {
    type: 'delay',
    group: 'Flow',
    label: 'Wait',
    description: 'Pause before the next step.',
    icon: Clock,
    tone: 'slate',
    defaults: { duration: 1, unit: 'hours' },
    summary: (d) => (d.duration ? `Wait ${plural(d.duration, d.unit || 'seconds')}` : ''),
    issues: (d) => (Number(d.duration) > 0 ? [] : ['Set how long to wait']),
  },
  {
    type: 'condition',
    group: 'Flow',
    label: 'Condition',
    description: 'Split into Yes / No paths based on the contact.',
    icon: GitBranch,
    tone: 'cyan',
    defaults: { field: 'tags', operator: 'contains', value: '' },
    summary: (d) => {
      if (!d.field) return '';
      const field = CONDITION_FIELDS.find((f) => f.value === d.field)?.label || d.field;
      const op = CONDITION_OPERATORS.find((o) => o.value === d.operator)?.label || d.operator || 'contains';
      return ['exists', 'not_exists'].includes(d.operator) ? `${field} ${op}` : `${field} ${op} “${clip(d.value, 30)}”`;
    },
    issues: (d) => {
      if (!d.field) return ['Choose what to check'];
      if (!['exists', 'not_exists'].includes(d.operator) && !String(d.value ?? '').trim()) return ['Enter a value'];
      return [];
    },
  },
  {
    type: 'custom_integration',
    group: 'Integrations',
    label: 'Airtable CRM',
    description: 'Update or create the lead, or add a note, in Airtable.',
    icon: Table2,
    tone: 'indigo',
    defaults: { integrationKey: 'airtable', integrationName: 'Airtable', airtableOp: 'update_lead' },
    summary: (d) =>
      ({ update_lead: 'Update the lead', create_lead: 'Add lead to the CRM', add_note: 'Add a note' })[
        d.airtableOp || 'update_lead'
      ],
    issues: (d) => {
      if ((d.integrationKey || '').toLowerCase() !== 'airtable') return ['This integration is not supported'];
      if (d.airtableOp === 'add_note') return d.airtableNote?.trim() ? [] : ['Write the note'];
      const rows = Array.isArray(d.airtableFields) ? d.airtableFields : [];
      return rows.some((r) => r.field && String(r.value ?? '').trim()) ? [] : ['Add at least one field'];
    },
  },
  {
    type: 'webhook',
    group: 'Integrations',
    label: 'Webhook',
    description: 'POST the contact and trigger details to another system.',
    icon: Webhook,
    tone: 'amber',
    summary: (d) => clip(d.url, 40),
    issues: (d) => (/^https?:\/\/\S+\.\S+/.test(d.url || '') ? [] : ['Enter a valid https:// URL']),
  },
];

export const ACTIONS_BY_TYPE = Object.fromEntries(ACTIONS.map((a) => [a.type, a]));
export const TRIGGERS_BY_TYPE = Object.fromEntries(TRIGGERS.map((t) => [t.type, t]));

export const TONES = {
  green: { chip: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-200', bar: 'bg-emerald-500' },
  rose: { chip: 'bg-rose-50 text-rose-600', ring: 'ring-rose-200', bar: 'bg-rose-500' },
  purple: { chip: 'bg-purple-50 text-purple-600', ring: 'ring-purple-200', bar: 'bg-purple-500' },
  orange: { chip: 'bg-orange-50 text-orange-600', ring: 'ring-orange-200', bar: 'bg-orange-500' },
  blue: { chip: 'bg-blue-50 text-blue-600', ring: 'ring-blue-200', bar: 'bg-blue-500' },
  slate: { chip: 'bg-slate-100 text-slate-600', ring: 'ring-slate-200', bar: 'bg-slate-500' },
  cyan: { chip: 'bg-cyan-50 text-cyan-600', ring: 'ring-cyan-200', bar: 'bg-cyan-500' },
  indigo: { chip: 'bg-indigo-50 text-indigo-600', ring: 'ring-indigo-200', bar: 'bg-indigo-500' },
  amber: { chip: 'bg-amber-50 text-amber-600', ring: 'ring-amber-200', bar: 'bg-amber-500' },
  trigger: { chip: 'bg-violet-50 text-violet-600', ring: 'ring-violet-200', bar: 'bg-violet-500' },
};

// Old builders offered these; the engine skips them. Shown so existing
// automations explain themselves instead of looking fine and doing nothing.
export const UNSUPPORTED_ACTION_LABELS = {
  randomizer: 'Randomizer',
  code: 'Code',
  database: 'Database',
  note: 'Note',
};

export function triggerSummary(data = {}) {
  switch (data.triggerType) {
    case 'new_message':
      return data.keyword ? `Message contains “${data.keyword}”` : 'Any message';
    case 'airtable_status':
      return data.status ? `Status becomes “${data.status}”` : 'Any status change';
    case 'tag_added':
      return data.tag ? `Tag “${data.tag}” is added` : 'Any tag is added';
    default:
      return TRIGGERS_BY_TYPE[data.triggerType]?.description || '';
  }
}

export function triggerIssues(data = {}) {
  if (!data.triggerType) return ['Choose what starts this automation'];
  if (!TRIGGERS_BY_TYPE[data.triggerType]) return ['This trigger is not supported'];
  return [];
}

export function nodeIssues(node) {
  if (!node) return [];
  if (node.type === 'trigger') return triggerIssues(node.data);
  const def = ACTIONS_BY_TYPE[node.data?.actionType];
  if (!def) {
    const legacy = UNSUPPORTED_ACTION_LABELS[node.data?.actionType];
    return [legacy ? `${legacy} steps are not run by the engine — replace or delete this step` : 'Choose a step type'];
  }
  return def.issues(node.data || {});
}

export const DEFAULT_SETTINGS = {
  reentry: 'after_complete',
  stopOnReply: false,
  quietHours: { enabled: false, start: '21:00', end: '08:00', timezone: 'Australia/Melbourne' },
};

export const TIMEZONES = [
  'Australia/Melbourne',
  'Australia/Sydney',
  'Australia/Brisbane',
  'Australia/Adelaide',
  'Australia/Perth',
  'Pacific/Auckland',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Manila',
  'Europe/London',
  'America/New_York',
  'UTC',
];


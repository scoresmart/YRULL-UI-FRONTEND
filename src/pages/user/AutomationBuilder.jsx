import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Settings,
  Zap,
  MessageSquare,
  Phone,
  PhoneMissed,
  PhoneIncoming,
  Check,
  Eye,
  Plus,
  Sparkles,
  HelpCircle,
  Edit2,
  Loader2,
  Plug,
  Shuffle,
  GitBranch,
  Webhook,
  Code,
  Database,
  FileText,
  X,
  Trash2,
  Instagram,
  AtSign,
  Mail,
  UserPlus,
  MousePointerClick,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { StatusPill } from '../../components/ui/status-pill';
import { cn } from '../../lib/utils';
import { automationsApi, integrationsApi, claudePromptApi, tagsApi, templatesApi } from '../../lib/api';
import { INTEGRATIONS, isIntegrationConnected } from '../../lib/integrationsCatalog';
import { useTags } from '../../lib/dataHooks';
import TestRunPanel from '../../components/automations/TestRunPanel';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Custom Node: Trigger Node (When...)
const TriggerNode = ({ data, selected, id }) => {
  const getIcon = () => {
    if (data.triggerType === 'new_message') return <MessageSquare className="h-5 w-5" />;
    if (data.triggerType === 'missed_call') return <PhoneMissed className="h-5 w-5" />;
    if (data.triggerType === 'incoming_call') return <PhoneIncoming className="h-5 w-5" />;
    if (data.triggerType === 'instagram_dm') return <Instagram className="h-5 w-5" />;
    if (data.triggerType === 'instagram_comment') return <MessageSquare className="h-5 w-5" />;
    if (data.triggerType === 'instagram_story_reply') return <AtSign className="h-5 w-5" />;
    if (data.triggerType === 'airtable_status') return <Zap className="h-5 w-5" />;
    if (data.triggerType === 'lead_created') return <UserPlus className="h-5 w-5" />;
    return <Zap className="h-5 w-5" />;
  };

  const isConfigured =
    data.triggerType === 'new_message' ||
    data.triggerType === 'missed_call' ||
    data.triggerType === 'incoming_call' ||
    data.triggerType === 'instagram_dm' ||
    data.triggerType === 'instagram_comment' ||
    data.triggerType === 'instagram_story_reply' ||
    // Started by the CRM rather than by a message. The email sequences use
    // these two, and without them the card reads as an unconfigured trigger.
    data.triggerType === 'airtable_status' ||
    data.triggerType === 'lead_created';

  return (
    <div
      className={cn(
        // A ring rather than a thicker border on select, so nothing shifts by a
        // pixel as cards are clicked around the canvas.
        'relative rounded-xl border bg-white p-4 shadow-sm transition-all',
        selected ? 'border-emerald-400 ring-2 ring-emerald-100 shadow-md' : 'border-gray-200 hover:shadow-md',
        'min-w-[280px] max-w-[320px]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Zap className="h-5 w-5" />
        </div>
        <div className="flex-1">
          {/* An eyebrow so trigger and action read as different kinds of thing
              at a glance, instead of two identically-shaped white cards. */}
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Trigger</div>
          <div className="text-base font-semibold text-gray-900">When...</div>
          {isConfigured ? (
            <div className="mt-3 space-y-2">
              {data.triggerType === 'new_message' && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span>User sends a message</span>
                  </div>
                  {data.keyword ? (
                    <div className="text-sm text-gray-600">
                      Message contains <span className="font-semibold text-gray-900">{data.keyword}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">Any message (no keyword)</div>
                  )}
                </>
              )}
              {data.triggerType === 'missed_call' && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <PhoneMissed className="h-4 w-4 text-red-600" />
                  <span>Missed call</span>
                </div>
              )}
              {data.triggerType === 'incoming_call' && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <PhoneIncoming className="h-4 w-4 text-blue-600" />
                  <span>Incoming call</span>
                </div>
              )}
              {data.triggerType === 'instagram_dm' && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Instagram className="h-4 w-4 text-purple-600" />
                  <span>Instagram DM received</span>
                </div>
              )}
              {data.triggerType === 'instagram_comment' && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MessageSquare className="h-4 w-4 text-amber-600" />
                  <span>Instagram comment received</span>
                </div>
              )}
              {data.triggerType === 'instagram_story_reply' && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <AtSign className="h-4 w-4 text-pink-600" />
                  <span>Instagram story reply</span>
                </div>
              )}
              {data.triggerType === 'airtable_status' && (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Zap className="h-4 w-4 text-green-600" />
                    <span>Lead status changes in the CRM</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Status becomes <span className="font-semibold text-gray-900">{data.status || 'any'}</span>
                  </div>
                </>
              )}
              {data.triggerType === 'lead_created' && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <UserPlus className="h-4 w-4 text-green-600" />
                  <span>New lead added to the CRM</span>
                </div>
              )}
              {/* Change trigger button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (data?.onConfigureTrigger) {
                    data.onConfigureTrigger(id);
                  }
                }}
                className="mt-2 w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
              >
                <Edit2 className="h-3 w-3" />
                Change Trigger
              </button>
            </div>
          ) : (
            <>
              {data.description && <div className="mt-2 text-sm text-gray-600">{data.description}</div>}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (data?.onConfigureTrigger) {
                    data.onConfigureTrigger(id);
                  }
                }}
                className="mt-3 w-full rounded-md border border-dashed border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="h-4 w-4" />
                New Trigger
              </button>
            </>
          )}
        </div>
      </div>
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ right: -12 }}
      />
    </div>
  );
};

// Custom Node: Action Selection Node (Choose first step)
const ActionSelectionNode = ({ data, selected }) => {
  const actionOptions = [
    { type: 'send_message', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-50' },
    {
      type: 'send_template',
      label: 'WhatsApp Template',
      icon: FileText,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
    },
    { type: 'send_email', label: 'Email', icon: Mail, color: 'text-rose-600', bgColor: 'bg-rose-50' },
    { type: 'send_ig_dm', label: 'Instagram DM', icon: Instagram, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { type: 'add_tag', label: 'Add Tag', icon: Zap, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { type: 'assign', label: 'Assign', icon: Settings, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { type: 'delay', label: 'Delay', icon: Pause, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { type: 'condition', label: 'Condition', icon: GitBranch, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
    {
      type: 'custom_integration',
      label: 'Custom Integration',
      icon: Plug,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    { type: 'randomizer', label: 'Randomizer', icon: Shuffle, color: 'text-pink-600', bgColor: 'bg-pink-50' },
    { type: 'webhook', label: 'Webhook', icon: Webhook, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { type: 'code', label: 'Code', icon: Code, color: 'text-slate-600', bgColor: 'bg-slate-50' },
    { type: 'database', label: 'Database', icon: Database, color: 'text-teal-600', bgColor: 'bg-teal-50' },
    { type: 'note', label: 'Note', icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  ];

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-dashed bg-white p-4 shadow-sm transition-all',
        selected ? 'border-blue-400' : 'border-gray-300',
        'min-w-[300px] max-w-[340px]',
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">👆</span>
        <div className="text-base font-semibold text-gray-900">
          {data?.parentId && data.parentId !== 'trigger-1' ? 'Choose next step' : 'Choose first step'}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Actions</div>
        <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
          {actionOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                onClick={() => data?.onAddAction?.(option.type)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 transition-colors',
                  option.bgColor,
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', option.color)} />
                <span className="text-sm font-medium text-gray-900">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ left: -12 }}
      />
    </div>
  );
};

// The fields CRM steps write to. Names have to match Airtable exactly, so they
// are offered as suggestions rather than left for the user to remember.
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

// Configuration for the Airtable custom integration. Values carry the same
// {{name}} / {{phone}} / {{message}} variables a message body does — the
// backend resolves them against the contact before writing to the CRM.
export const AirtableIntegrationFields = ({ id, data }) => {
  const op = data.airtableOp || 'update_lead';
  const rows = Array.isArray(data.airtableFields) ? data.airtableFields : [];
  const update = (value, field) => data?.onUpdateMessage?.(id, value, field);
  const stop = (e) => e.stopPropagation();

  const setRow = (index, patch) =>
    update(
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      'airtableFields',
    );

  const inputClass =
    'w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none';

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">What to do</label>
        <select
          value={op}
          onChange={(e) => update(e.target.value, 'airtableOp')}
          onClick={stop}
          className={inputClass}
        >
          <option value="update_lead">Update the lead</option>
          <option value="create_lead">Add to the CRM</option>
          <option value="add_note">Add a note</option>
        </select>
      </div>

      {(op === 'update_lead' || op === 'create_lead') && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fields to write</label>
          <datalist id="airtable-field-names">
            {AIRTABLE_FIELDS.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="space-y-1.5">
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <input
                  type="text"
                  list="airtable-field-names"
                  placeholder="Field"
                  value={row.field || ''}
                  onChange={(e) => setRow(index, { field: e.target.value })}
                  onClick={stop}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={row.value || ''}
                  onChange={(e) => setRow(index, { value: e.target.value })}
                  onClick={stop}
                  className={inputClass}
                />
                <button
                  type="button"
                  aria-label="Remove field"
                  onClick={(e) => {
                    stop(e);
                    update(
                      rows.filter((_, i) => i !== index),
                      'airtableFields',
                    );
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              update([...rows, { field: '', value: '' }], 'airtableFields');
            }}
            className="mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            + Add field
          </button>
        </div>
      )}

      {op === 'add_note' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Note</label>
          <textarea
            placeholder="What should be recorded on the lead?"
            value={data.airtableNote || ''}
            onChange={(e) => update(e.target.value, 'airtableNote')}
            onClick={stop}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Match by email (optional)
        </label>
        <input
          type="text"
          placeholder="Leave empty to match on phone number"
          value={data.airtableEmail || ''}
          onChange={(e) => update(e.target.value, 'airtableEmail')}
          onClick={stop}
          className={inputClass}
        />
      </div>

      <p className="text-[10px] text-gray-400">
        Use {'{{name}}'}, {'{{phone}}'} or {'{{message}}'} to insert the contact&apos;s details.
      </p>
    </div>
  );
};

// Picks an approved WhatsApp template plus its positional {{1}}, {{2}} values.
// Shared by the Template step and by the fallback on a plain WhatsApp step.
const TemplatePicker = ({ id, data, nameField, langField, label, hint }) => {
  const templates = data.approvedTemplates || [];
  const selectedName = data[nameField] || "";
  // The list comes from Meta through the workspace OAuth token, which expires
  // and needs a Facebook reconnect. Sending a template does not use that token
  // at all, so a stale login must not be able to block configuring the step --
  // fall back to typing the name, which is all the engine actually needs.
  const canList = templates.length > 0;

  const setName = (value) => data?.onUpdateMessage?.(id, value, nameField);

  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {canList ? (
        <select
          value={selectedName}
          onChange={(e) => {
            const next = templates.find((t) => t.name === e.target.value);
            setName(e.target.value);
            // Language is part of the template identity to Meta; keeping it in
            // step with the name avoids a send refused for a mismatched locale.
            if (next?.language) data?.onUpdateMessage?.(id, next.language, langField);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:bg-white focus:outline-none"
        >
          <option value="">Select a template…</option>
          {templates.map((t) => (
            <option key={`${t.name}-${t.language}`} value={t.name}>
              {t.name} ({t.language})
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            type="text"
            placeholder="Template name, exactly as approved by Meta"
            value={selectedName}
            onChange={(e) => setName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none"
          />
          <input
            type="text"
            placeholder="Language code (e.g. en_US)"
            value={data[langField] || ""}
            onChange={(e) => data?.onUpdateMessage?.(id, e.target.value, langField)}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none"
          />
          <p className="text-[10px] text-amber-700">
            Could not load your template list — reconnect Facebook under Templates to pick from a
            menu. Typing the name still works: sending uses different credentials from the list.
          </p>
        </>
      )}
      {selectedName && (
        <input
          type="text"
          placeholder="Values for {{1}}, {{2}} — comma separated"
          value={data.templateParams || ""}
          onChange={(e) => data?.onUpdateMessage?.(id, e.target.value, "templateParams")}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none"
        />
      )}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
};

// Custom Node: Action Node
export const ActionNode = ({ data, selected, id }) => {
  const getIcon = () => {
    if (data.actionType === 'send_message') return <MessageSquare className="h-5 w-5" />;
    if (data.actionType === 'send_template') return <FileText className="h-5 w-5" />;
    if (data.actionType === 'send_email') return <Mail className="h-5 w-5" />;
    if (data.actionType === 'add_tag') return <Zap className="h-5 w-5" />;
    if (data.actionType === 'assign') return <Settings className="h-5 w-5" />;
    if (data.actionType === 'delay') return <Pause className="h-5 w-5" />;
    if (data.actionType === 'condition') return <GitBranch className="h-5 w-5" />;
    if (data.actionType === 'custom_integration') return <Plug className="h-5 w-5" />;
    if (data.actionType === 'randomizer') return <Shuffle className="h-5 w-5" />;
    if (data.actionType === 'webhook') return <Webhook className="h-5 w-5" />;
    if (data.actionType === 'code') return <Code className="h-5 w-5" />;
    if (data.actionType === 'database') return <Database className="h-5 w-5" />;
    if (data.actionType === 'note') return <FileText className="h-5 w-5" />;
    return <Zap className="h-5 w-5" />;
  };

  const getLabel = () => {
    if (data.actionType === 'send_message') return 'WhatsApp';
    if (data.actionType === 'send_template') return 'WhatsApp Template';
    if (data.actionType === 'send_email') return 'Email';
    if (data.actionType === 'add_tag') return 'Add Tag';
    if (data.actionType === 'assign') return 'Assign';
    if (data.actionType === 'delay') return 'Delay';
    if (data.actionType === 'condition') return 'Condition';
    if (data.actionType === 'custom_integration') return 'Custom Integration';
    if (data.actionType === 'randomizer') return 'Randomizer';
    if (data.actionType === 'webhook') return 'Webhook';
    if (data.actionType === 'code') return 'Code';
    if (data.actionType === 'database') return 'Database';
    if (data.actionType === 'note') return 'Note';
    return 'Action';
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-white p-4 shadow-sm transition-all',
        selected ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-gray-200 hover:shadow-md',
        'min-w-[280px] max-w-[320px]',
      )}
    >
      {/* Delete and Change buttons - top right */}
      <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (data?.onChangeAction) {
              data.onChangeAction(id);
            }
          }}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Change action"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (data?.onDeleteAction) {
              data.onDeleteAction(id);
            }
          }}
          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Delete action"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Action</div>
          <div className="text-base font-semibold text-gray-900">{getLabel()}</div>
          <div className="mt-1 text-sm text-gray-500">
            {data.actionType === 'send_message' && 'Send Message'}
            {data.actionType === 'send_template' && 'Send Approved Template'}
            {data.actionType === 'send_email' && (data.label || 'Send Email')}
            {data.actionType === 'add_tag' && 'Add Tag to Contact'}
            {data.actionType === 'assign' && 'Assign to User'}
            {data.actionType === 'delay' && 'Wait Before Next Step'}
            {data.actionType === 'condition' && 'Check Condition'}
            {data.actionType === 'custom_integration' && 'Run Custom Integration'}
            {data.actionType === 'randomizer' && 'Random Selection'}
            {data.actionType === 'webhook' && 'Call Webhook'}
            {data.actionType === 'code' && 'Execute Code'}
            {data.actionType === 'database' && 'Database Operation'}
            {data.actionType === 'note' && 'Add Note'}
          </div>
          {data.actionType === 'send_message' && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="Add a text"
                value={data.message || ''}
                onChange={(e) => {
                  data?.onUpdateMessage?.(id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none"
              />
              {/* Plain text only reaches a contact who messaged in the last 24
                  hours. A CRM lead never has, so without a fallback this step
                  is refused by Meta however well it is written. */}
              <TemplatePicker
                id={id}
                data={data}
                nameField="fallbackTemplate"
                langField="templateLang"
                label="Fallback template (used if the 24-hour window is closed)"
                hint="Leave empty only if this automation is started by an inbound message."
              />
            </div>
          )}
          {data.actionType === 'send_template' && (
            <TemplatePicker
              id={id}
              data={data}
              nameField="templateName"
              langField="templateLang"
              label="Template"
              hint="Approved templates send at any time, inside or outside the 24-hour window."
            />
          )}
          {data.actionType === 'send_email' && (
            <div className="mt-3 space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Subject line"
                  value={data.subject || ''}
                  onChange={(e) => {
                    data?.onUpdateMessage?.(id, e.target.value, 'subject');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-500">Body (HTML)</label>
                  <span className="text-[10px] text-gray-400">
                    {(data.body || '').length.toLocaleString()} characters
                  </span>
                </div>
                <textarea
                  placeholder="<p>Hi {first_name},</p>"
                  value={data.body || ''}
                  onChange={(e) => {
                    data?.onUpdateMessage?.(id, e.target.value, 'body');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  rows={8}
                  spellCheck={false}
                  className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-mono text-[11px] leading-relaxed text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {'{first_name}'}, {'{course_name}'} and {'{caller_name}'} are filled in from the lead.
              </p>
            </div>
          )}
          {data.actionType === 'add_tag' && (
            <div className="mt-3 space-y-2">
              {data.tagId ? (
                <>
                  <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          data.tagColor === 'green'
                            ? 'bg-green-500'
                            : data.tagColor === 'blue'
                              ? 'bg-blue-500'
                              : data.tagColor === 'purple'
                                ? 'bg-purple-500'
                                : data.tagColor === 'orange'
                                  ? 'bg-amber-500'
                                  : data.tagColor === 'red'
                                    ? 'bg-red-500'
                                    : 'bg-gray-500'
                        }`}
                      />
                      <span className="text-sm font-medium text-gray-700">{data.tagName || 'Selected Tag'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (data?.onConfigureTag) {
                          data.onConfigureTag(id);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Change
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (data?.onConfigureTag) {
                      data.onConfigureTag(id);
                    }
                  }}
                  className="w-full rounded-md border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  Select Tag
                </button>
              )}
            </div>
          )}
          {(data.actionType === 'delay' || data.actionType === 'randomizer') && (
            <div className="mt-3 flex items-center gap-1.5">
              <input
                type="number"
                placeholder={data.actionType === 'delay' ? 'Duration' : 'Number of options'}
                value={data.duration || data.options || ''}
                onChange={(e) => {
                  // Was written to `message`, where nothing reads it, so a wait
                  // never actually changed. Write the field each one is read from.
                  data?.onUpdateMessage?.(
                    id,
                    e.target.value,
                    data.actionType === 'delay' ? 'duration' : 'options',
                  );
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none"
              />
              {/* A wait is stored as a number plus its unit. Without the unit
                  shown, a 4-day wait in an email sequence reads as 4 seconds. */}
              {data.actionType === 'delay' && (
                <select
                  value={data.unit || 'seconds'}
                  onChange={(e) => {
                    data?.onUpdateMessage?.(id, e.target.value, 'unit');
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-2 py-2 text-sm text-gray-700 focus:border-green-500 focus:bg-white focus:outline-none"
                >
                  <option value="seconds">seconds</option>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              )}
            </div>
          )}
          {data.actionType === 'custom_integration' && (
            <div className="mt-3 space-y-2">
              {data.integrationKey ? (
                <>
                  <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="text-sm font-medium text-gray-700">
                      {data.integrationName || data.integrationKey}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (data?.onConfigureIntegration) {
                          data.onConfigureIntegration(id);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Change
                    </button>
                  </div>
                  {data.integrationKey === 'anthropic' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Prompt</label>
                      <textarea
                        placeholder="Enter your prompt for Claude AI..."
                        value={data.prompt || ''}
                        onChange={(e) => {
                          data?.onUpdateMessage?.(id, e.target.value, 'prompt');
                        }}
                        onClick={(e) => e.stopPropagation()}
                        rows={4}
                        className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none resize-none"
                      />
                    </div>
                  )}
                  {data.integrationKey === 'airtable' && (
                    <AirtableIntegrationFields id={id} data={data} />
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (data?.onConfigureIntegration) {
                      data.onConfigureIntegration(id);
                    }
                  }}
                  className="w-full rounded-md border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  Select Integration
                </button>
              )}
            </div>
          )}
          {(data.actionType === 'webhook' || data.actionType === 'code') && (
            <div className="mt-3">
              <input
                type="text"
                placeholder={data.actionType === 'webhook' ? 'Webhook URL' : 'Code snippet'}
                value={data.config || ''}
                onChange={(e) => {
                  data?.onUpdateMessage?.(id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none"
              />
            </div>
          )}
          {data.actionType === 'note' && (
            <div className="mt-3">
              <textarea
                placeholder="Add a note"
                value={data.note || ''}
                onChange={(e) => {
                  data?.onUpdateMessage?.(id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                rows={3}
                className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:bg-white focus:outline-none resize-none"
              />
            </div>
          )}
        </div>
      </div>
      {/* Nothing followed a step before, so an automation could only ever be one
          action long. Offered only when this step has no next step yet. */}
      {!data.hasNextStep && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data?.onAddNextStep?.(id);
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add next step
        </button>
      )}
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ left: -12 }}
      />
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ right: -12 }}
      />
    </div>
  );
};

// Custom Node: Claude AI Node (for system automation)
const ClaudeAINode = ({ data, selected, id }) => {
  return (
    <div
      className={cn(
        'relative rounded-lg border-2 bg-white p-4 shadow-sm transition-all',
        selected ? 'border-[#D4A574] shadow-md' : 'border-gray-300',
        'min-w-[300px] max-w-[380px]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4A574] text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M17.304 3.541l-5.497 16.918H14.93L20.426 3.54h-3.122zm-10.608 0L1.2 20.459h3.166l1.188-3.776h5.862l1.19 3.776h3.165L10.275 3.54H6.696zM6.47 13.828l2.03-6.449h.073l2.03 6.449H6.47z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-gray-900">Claude AI</div>
          <div className="mt-1 text-sm text-gray-600">Analyze + Reply</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
              claude-sonnet-4
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              500 tokens
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">System Prompt</label>
        <textarea
          value={data.prompt || ''}
          onChange={(e) => data?.onUpdatePrompt?.(id, e.target.value, 'prompt')}
          onClick={(e) => e.stopPropagation()}
          rows={5}
          className="w-full rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 placeholder-gray-400 focus:border-[#D4A574] focus:bg-white focus:outline-none resize-y"
          placeholder="Enter system prompt..."
        />
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ left: -12 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ right: -12 }}
      />
    </div>
  );
};

// Custom Node: Send Reply Node (for system automation)
const SendReplyNode = ({ data, selected }) => {
  return (
    <div
      className={cn(
        'relative rounded-lg border-2 bg-white p-4 shadow-sm transition-all',
        selected ? 'border-blue-500 shadow-md' : 'border-gray-300',
        'min-w-[260px] max-w-[300px]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-gray-900">WhatsApp</div>
          <div className="mt-1 text-sm text-gray-600">Send Reply</div>
          <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Sends Claude's generated reply back via WhatsApp
          </div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ left: -12 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ right: -12 }}
      />
    </div>
  );
};

// Custom Node: Save to DB Node (for system automation)
const SaveNode = ({ data, selected }) => {
  return (
    <div
      className={cn(
        'relative rounded-lg border-2 bg-white p-4 shadow-sm transition-all',
        selected ? 'border-gray-500 shadow-md' : 'border-gray-300',
        'min-w-[260px] max-w-[300px]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          <Database className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold text-gray-900">Save</div>
          <div className="mt-1 text-sm text-gray-600">Intent + tags to DB</div>
          <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Stores intent, confidence, tags, and is_lead to Supabase
          </div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-6 !w-6 !rounded-full !border-2 !border-gray-400 !bg-white"
        style={{ left: -12 }}
      />
    </div>
  );
};

const nodeTypes = {
  trigger: TriggerNode,
  actionSelection: ActionSelectionNode,
  action: ActionNode,
  claudeAI: ClaudeAINode,
  sendReply: SendReplyNode,
  saveNode: SaveNode,
};

// Initial nodes - trigger and action selection
// Positioned with proper spacing matching the reference design
// Nodes should be well-spaced horizontally with good vertical alignment
const initialNodes = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 100, y: 200 },
    data: {
      triggerType: null,
      keyword: null,
      description: 'A Trigger is an event that starts your Automation. Click to add a Trigger.',
    },
  },
  {
    id: 'action-selection-1',
    type: 'actionSelection',
    position: { x: 800, y: 200 },
    data: { parentId: 'trigger-1' },
  },
];

const initialEdges = [
  {
    id: 'e1-2',
    source: 'trigger-1',
    target: 'action-selection-1',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#9CA3AF', strokeWidth: 2 },
    label: 'Then',
    labelStyle: { fill: '#6B7280', fontWeight: 500, fontSize: 12 },
    labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
    labelBgPadding: [4, 8],
    labelBgBorderRadius: 4,
  },
];

function AutomationBuilderContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const isSystem = id === 'system-ai-reply';
  const [isEditingName, setIsEditingName] = useState(false);
  const [showTriggerTypePanel, setShowTriggerTypePanel] = useState(false);
  const [showTriggerConfig, setShowTriggerConfig] = useState(false);
  const [configuringTriggerId, setConfiguringTriggerId] = useState(null);
  const [selectedTriggerType, setSelectedTriggerType] = useState(null);
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [triggerMode, setTriggerMode] = useState('any'); // 'any' or 'keyword'
  const [showIntegrationPanel, setShowIntegrationPanel] = useState(false);
  const [configuringActionId, setConfiguringActionId] = useState(null);
  const [integrationConfigs, setIntegrationConfigs] = useState({});
  const [integrationsLoading, setIntegrationsLoading] = useState(true);
  const [integrationsError, setIntegrationsError] = useState(false);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [configuringTagActionId, setConfiguringTagActionId] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('green');
  const [showCreateTag, setShowCreateTag] = useState(false);

  // Load tags
  const tagsQ = useTags();

  // Approved WhatsApp templates, for steps that reach a contact with no open
  // 24-hour window — a CRM lead has never messaged in, so freeform is refused.
  const templatesQ = useQuery({
    queryKey: ['whatsapp_templates'],
    queryFn: () => templatesApi.list(),
    staleTime: 5 * 60 * 1000,
    select: (data) => {
      const list = Array.isArray(data) ? data : (data?.templates ?? data?.data ?? []);
      return list.filter((t) => t.status === 'APPROVED');
    },
  });
  // Memoised so the identity is stable: the node memo below depends on it, and
  // a fresh [] each render would rebuild every node on every render.
  const approvedTemplates = useMemo(() => templatesQ.data ?? [], [templatesQ.data]);
  const queryClient = useQueryClient();
  const [automationId, setAutomationId] = useState(isNew ? null : id);
  const [saving, setSaving] = useState(false);
  const [loadingAutomation, setLoadingAutomation] = useState(!isNew && id && !isSystem);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [automationName, setAutomationName] = useState(isSystem ? 'AI Auto-Reply (Claude)' : isNew ? 'Untitled' : '');
  const [status, setStatus] = useState(isSystem ? 'live' : 'draft');
  // An automation's platform is set when it is created — email sequences are
  // 'email'. Saving used to stamp 'whatsapp' over it and relabel them.
  const [platform, setPlatform] = useState('whatsapp');
  const [isSaved, setIsSaved] = useState(false);
  // The dry-run panel. Testing a draft before it goes live is the whole point,
  // so it opens without saving and never calls the API.
  const [showTestPanel, setShowTestPanel] = useState(false);

  // Load which integrations this workspace has configured. The catalogue of
  // what Yrull supports is static (integrationsCatalog); the API only tells us
  // which ones have credentials saved, so the picker can show the rest as
  // "Not configured" instead of rendering an empty, dead-end panel.
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const configs = await integrationsApi.list();
        setIntegrationConfigs(configs || {});
        setIntegrationsError(false);
      } catch (error) {
        console.error("Failed to load integrations:", error);
        setIntegrationsError(true);
      } finally {
        setIntegrationsLoading(false);
      }
    };
    loadIntegrations();
  }, []);

  // Everything Yrull can talk to, ready ones first so the common case is on top.
  const integrations = useMemo(
    () =>
      INTEGRATIONS.map((integration) => ({
        ...integration,
        connected: isIntegrationConnected(integration, integrationConfigs[integration.key]),
      })).sort((a, b) => Number(b.connected) - Number(a.connected)),
    [integrationConfigs],
  );

  // Load existing automation when editing
  useEffect(() => {
    if (isSystem) {
      // Load system AI automation with nodes on canvas
      setLoadingAutomation(true);
      claudePromptApi
        .get()
        .then((data) => {
          const prompt = data?.prompt || '';
          const systemNodes = [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 50, y: 200 },
              data: { triggerType: 'new_message', keyword: null, description: 'Any incoming WhatsApp message' },
            },
            {
              id: 'claude-ai-1',
              type: 'claudeAI',
              position: { x: 450, y: 150 },
              data: { prompt },
            },
            {
              id: 'send-reply-1',
              type: 'sendReply',
              position: { x: 900, y: 200 },
              data: {},
            },
            {
              id: 'save-1',
              type: 'saveNode',
              position: { x: 1280, y: 200 },
              data: {},
            },
          ];
          const systemEdges = [
            {
              id: 'e-trigger-claude',
              source: 'trigger-1',
              target: 'claude-ai-1',
              type: 'smoothstep',
              style: { stroke: '#D4A574', strokeWidth: 2 },
              label: 'Then',
              labelStyle: { fill: '#6B7280', fontWeight: 500, fontSize: 12 },
              labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
              labelBgPadding: [4, 8],
              labelBgBorderRadius: 4,
            },
            {
              id: 'e-claude-reply',
              source: 'claude-ai-1',
              target: 'send-reply-1',
              type: 'smoothstep',
              style: { stroke: '#3B82F6', strokeWidth: 2 },
              label: 'Reply',
              labelStyle: { fill: '#6B7280', fontWeight: 500, fontSize: 12 },
              labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
              labelBgPadding: [4, 8],
              labelBgBorderRadius: 4,
            },
            {
              id: 'e-reply-save',
              source: 'send-reply-1',
              target: 'save-1',
              type: 'smoothstep',
              style: { stroke: '#9CA3AF', strokeWidth: 2 },
              label: 'Log',
              labelStyle: { fill: '#6B7280', fontWeight: 500, fontSize: 12 },
              labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
              labelBgPadding: [4, 8],
              labelBgBorderRadius: 4,
            },
          ];
          setNodes(systemNodes);
          setEdges(systemEdges);
        })
        .catch(() => toast.error('Failed to load system prompt'))
        .finally(() => setLoadingAutomation(false));
      return;
    }

    if (!isNew && id) {
      setLoadingAutomation(true);
      automationsApi
        .get(id)
        .then((auto) => {
          if (auto && auto.id) {
            setAutomationName(auto.name || 'Untitled');
            setStatus(auto.status || 'draft');
            setPlatform(auto.platform || 'whatsapp');
            setAutomationId(auto.id);
            try {
              // Try to load nodes and edges, but don't fail if they don't exist
              const loadedNodes =
                typeof auto.nodes === 'string' ? JSON.parse(auto.nodes) : Array.isArray(auto.nodes) ? auto.nodes : null;
              const loadedEdges =
                typeof auto.edges === 'string' ? JSON.parse(auto.edges) : Array.isArray(auto.edges) ? auto.edges : null;

              // Only update if we have valid arrays
              if (loadedNodes && Array.isArray(loadedNodes) && loadedNodes.length > 0) {
                setNodes(loadedNodes);
              }
              if (loadedEdges && Array.isArray(loadedEdges) && loadedEdges.length > 0) {
                // Clean up any JSX labels in edges - convert to strings
                const cleanedEdges = loadedEdges.map((edge) => {
                  if (edge.label && typeof edge.label !== 'string') {
                    // If label is an object (JSX), convert to string
                    return { ...edge, label: 'Then' };
                  }
                  return edge;
                });
                setEdges(cleanedEdges);
              }
              // If no nodes/edges, keep the initial ones - that's fine
            } catch (parseError) {
              console.error('Error parsing automation data:', parseError);
              // Don't show error toast - just keep initial nodes/edges
            }
          } else {
            // Automation not found or invalid - show warning but don't redirect
            console.warn('Automation not found or invalid:', auto);
            toast.error('Automation data incomplete - using default flow');
          }
        })
        .catch((error) => {
          console.error('Error loading automation:', error);
          // Don't redirect on error - just show a warning and use initial nodes
          toast.error('Failed to load automation - using default flow');
        })
        .finally(() => setLoadingAutomation(false));
    } else {
      // For new automations, ensure loading is false
      setLoadingAutomation(false);
    }
  }, [id, isNew, navigate, setNodes, setEdges]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addActionNode = useCallback(
    (actionType) => {
      setNodes((nds) => {
        // The placeholder marks where the new step goes and what it follows.
        // Steps used to always be pinned to the trigger at one fixed spot, so a
        // second one landed on top of the first and nothing could be chained.
        const placeholder = nds.find((n) => n.id === 'action-selection-1');
        const source = placeholder?.data?.parentId || 'trigger-1';
        const filtered = nds.filter((n) => n.id !== 'action-selection-1');
        const newActionNode = {
          id: `action-${Date.now()}`,
          type: 'action',
          position: placeholder?.position || { x: 800, y: 200 },
          data: {
            actionType,
            message: actionType === 'send_message' ? '' : undefined,
            duration: actionType === 'delay' ? 60 : undefined,
          },
        };
        setEdges((eds) => [
          ...eds.filter((e) => e.target !== 'action-selection-1'),
          {
            id: `e-${source}-${newActionNode.id}`,
            source,
            target: newActionNode.id,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#9CA3AF', strokeWidth: 2 },
            label: 'Then',
            labelStyle: { fill: '#6B7280', fontWeight: 500, fontSize: 12 },
            labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
            labelBgPadding: [4, 8],
            labelBgBorderRadius: 4,
          },
        ]);
        return [...filtered, newActionNode];
      });
    },
    [setNodes, setEdges],
  );

  // Drop a "choose a step" placeholder after an existing step, so the flow can
  // be built out past the first action. Only one placeholder exists at a time.
  const handleAddNextStep = useCallback(
    (afterNodeId) => {
      setNodes((nds) => {
        const source = nds.find((n) => n.id === afterNodeId);
        if (!source) return nds;
        const filtered = nds.filter((n) => n.id !== 'action-selection-1');
        const placeholder = {
          id: 'action-selection-1',
          type: 'actionSelection',
          position: { x: source.position.x + 420, y: source.position.y },
          data: { parentId: afterNodeId },
        };
        setEdges((eds) => [
          ...eds.filter((e) => e.target !== 'action-selection-1'),
          {
            id: `e-${afterNodeId}-action-selection-1`,
            source: afterNodeId,
            target: 'action-selection-1',
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#9CA3AF', strokeWidth: 2 },
            label: 'Then',
            labelStyle: { fill: '#6B7280', fontWeight: 500, fontSize: 12 },
            labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
            labelBgPadding: [4, 8],
            labelBgBorderRadius: 4,
          },
        ]);
        return [...filtered, placeholder];
      });
    },
    [setNodes, setEdges],
  );

  // The floating + appends to the end of the chain: the last step nothing
  // follows, or the trigger when there are no steps yet.
  const handleAddStepAtEnd = useCallback(() => {
    if (nodes.some((n) => n.id === 'action-selection-1')) return;
    const actions = nodes.filter((n) => n.type === 'action');
    const last = actions.find((n) => !edges.some((e) => e.source === n.id));
    if (last) {
      handleAddNextStep(last.id);
      return;
    }
    const trigger = nodes.find((n) => n.type === 'trigger');
    if (trigger) handleAddNextStep(trigger.id);
  }, [nodes, edges, handleAddNextStep]);

  const handleConfigureTrigger = useCallback((nodeId) => {
    setConfiguringTriggerId(nodeId);
    setShowTriggerTypePanel(true);
  }, []);

  const handleDeleteAction = useCallback(
    (nodeId) => {
      setNodes((nds) => {
        const filtered = nds.filter((n) => n.id !== nodeId);
        // Also remove edges connected to this node
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        // If no action nodes remain, add back the action selection node
        const hasActionNodes = filtered.some((n) => n.type === 'action');
        const hasActionSelection = filtered.some((n) => n.id === 'action-selection-1');
        if (!hasActionNodes && !hasActionSelection) {
          const triggerNode = filtered.find((n) => n.type === 'trigger');
          if (triggerNode) {
            const actionSelectionNode = {
              id: 'action-selection-1',
              type: 'actionSelection',
              position: { x: 800, y: 200 },
              data: { parentId: triggerNode.id },
            };
            // Add edge from trigger to action selection
            setEdges((eds) => [
              ...eds,
              {
                id: 'e-trigger-action-selection',
                source: triggerNode.id,
                target: 'action-selection-1',
                type: 'smoothstep',
                animated: false,
                style: { stroke: '#9CA3AF', strokeWidth: 2 },
                label: 'Then',
                labelStyle: { fill: '#6B7280', fontWeight: 500, fontSize: 12 },
                labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
                labelBgPadding: [4, 8],
                labelBgBorderRadius: 4,
              },
            ]);
            return [...filtered, actionSelectionNode];
          }
        }
        return filtered;
      });
    },
    [setNodes, setEdges],
  );

  const handleChangeAction = useCallback(
    (nodeId) => {
      // Delete the current action and show action selection
      handleDeleteAction(nodeId);
    },
    [handleDeleteAction],
  );

  const handleSelectTriggerType = useCallback(
    (triggerType) => {
      setSelectedTriggerType(triggerType);
      setShowTriggerTypePanel(false);

      // If it's new_message, show keyword config. Otherwise, just save the trigger type
      if (triggerType === 'new_message') {
        setShowTriggerConfig(true);
        const node = nodes.find((n) => n.id === configuringTriggerId);
        // If keyword is null or undefined, it means "any message"
        const existingKeyword = node?.data?.keyword;
        if (existingKeyword) {
          setTriggerKeyword(existingKeyword);
          setTriggerMode('keyword');
        } else {
          setTriggerKeyword('');
          setTriggerMode('any');
        }
      } else {
        // For missed_call and incoming_call, just save directly
        if (configuringTriggerId) {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === configuringTriggerId) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    triggerType,
                  },
                };
              }
              return node;
            }),
          );
        }
        setConfiguringTriggerId(null);
        setSelectedTriggerType(null);
      }
    },
    [configuringTriggerId, nodes, setNodes],
  );

  const handleSaveTrigger = useCallback(() => {
    if (configuringTriggerId && selectedTriggerType === 'new_message') {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === configuringTriggerId) {
            return {
              ...node,
              data: {
                ...node.data,
                triggerType: selectedTriggerType,
                // If mode is 'any' or keyword is empty, save as null to indicate "any message"
                keyword: triggerMode === 'keyword' && triggerKeyword.trim() ? triggerKeyword.trim() : null,
              },
            };
          }
          return node;
        }),
      );
    }
    setShowTriggerConfig(false);
    setConfiguringTriggerId(null);
    setSelectedTriggerType(null);
    setTriggerKeyword('');
    setTriggerMode('any');
  }, [configuringTriggerId, selectedTriggerType, triggerKeyword, triggerMode, setNodes]);

  const handleUpdateMessage = useCallback(
    (nodeId, value, field = 'message') => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                [field]: value,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  const handleConfigureIntegration = useCallback((nodeId) => {
    setConfiguringActionId(nodeId);
    setShowIntegrationPanel(true);
  }, []);

  const handleSelectIntegration = useCallback(
    (integration) => {
      if (configuringActionId) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === configuringActionId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  integrationKey: integration.key,
                  integrationName: integration.name,
                  prompt: integration.key === 'anthropic' ? node.data.prompt || '' : undefined,
                },
              };
            }
            return node;
          }),
        );
      }
      setShowIntegrationPanel(false);
      setConfiguringActionId(null);
    },
    [configuringActionId, setNodes],
  );

  const handleConfigureTag = useCallback((nodeId) => {
    setConfiguringTagActionId(nodeId);
    setShowTagPanel(true);
  }, []);

  const handleSelectTag = useCallback(
    (tag) => {
      if (configuringTagActionId) {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === configuringTagActionId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  tagId: tag.id,
                  tagName: tag.name,
                  tagColor: tag.color,
                },
              };
            }
            return node;
          }),
        );
      }
      setShowTagPanel(false);
      setConfiguringTagActionId(null);
    },
    [configuringTagActionId, setNodes],
  );

  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }
    try {
      const newTag = await tagsApi.create({
        name: newTagName.trim(),
        color: newTagColor,
        description: '',
      });

      // Invalidate and refetch tags query to update the Tags page
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      await tagsQ.refetch();

      toast.success('Tag created!');

      // Select the newly created tag
      handleSelectTag(newTag);
      setNewTagName('');
      setShowCreateTag(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
      toast.error('Failed to create tag');
    }
  }, [newTagName, newTagColor, handleSelectTag, tagsQ, queryClient]);

  // Update nodes with callbacks
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === 'actionSelection') {
        return {
          ...node,
          data: {
            ...node.data,
            onAddAction: addActionNode,
          },
        };
      }
      if (node.type === 'trigger') {
        return {
          ...node,
          data: {
            ...node.data,
            onConfigureTrigger: handleConfigureTrigger,
          },
        };
      }
      if (node.type === 'action') {
        return {
          ...node,
          data: {
            ...node.data,
            onUpdateMessage: handleUpdateMessage,
            onDeleteAction: handleDeleteAction,
            onChangeAction: handleChangeAction,
            onConfigureIntegration: handleConfigureIntegration,
            onConfigureTag: handleConfigureTag,
            onAddNextStep: handleAddNextStep,
            hasNextStep: edges.some((e) => e.source === node.id),
            // Only approved templates can actually be sent, so the picker never
            // offers one that Meta would reject.
            approvedTemplates,
          },
        };
      }
      if (node.type === 'claudeAI') {
        return {
          ...node,
          data: {
            ...node.data,
            onUpdatePrompt: handleUpdateMessage,
          },
        };
      }
      return node;
    });
  }, [
    nodes,
    edges,
    // Templates arrive after the first render, so without this the pickers
    // would stay empty until something else happened to invalidate the memo.
    approvedTemplates,
    addActionNode,
    handleConfigureTrigger,
    handleUpdateMessage,
    handleDeleteAction,
    handleChangeAction,
    handleConfigureIntegration,
    handleConfigureTag,
    handleAddNextStep,
  ]);

  const handleSave = async (overrideStatus) => {
    // System automation: save the Claude prompt
    if (isSystem) {
      setSaving(true);
      try {
        const claudeNode = nodes.find((n) => n.type === 'claudeAI');
        const prompt = claudeNode?.data?.prompt || '';
        if (!prompt.trim()) {
          toast.error('Prompt cannot be empty');
          setSaving(false);
          return;
        }
        await claudePromptApi.update(prompt);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        toast.success('System prompt saved!');
      } catch {
        toast.error('Failed to save prompt');
      } finally {
        setSaving(false);
      }
      return;
    }

    const saveStatus = overrideStatus || status;
    // Strip callback functions from nodes before saving (not serializable)
    const cleanNodes = nodes.map(({ data, ...rest }) => {
      const {
        onAddAction,
        onConfigureTrigger,
        onUpdateMessage,
        onDeleteAction,
        onChangeAction,
        onConfigureIntegration,
        onConfigureTag,
        onAddNextStep,
        // Derived from the edges on every render — persisting it would go stale.
        hasNextStep,
        ...cleanData
      } = data || {};
      return { ...rest, data: cleanData };
    });

    // Clean edges - ensure labels are strings, not JSX objects
    const cleanEdges = edges.map((edge) => {
      if (edge.label && typeof edge.label !== 'string') {
        // If label is an object (JSX), convert to string
        return { ...edge, label: 'Then' };
      }
      return edge;
    });

    const automationData = {
      name: automationName,
      status: saveStatus,
      nodes: cleanNodes,
      edges: cleanEdges,
      platform,
    };

    setSaving(true);
    try {
      if (automationId) {
        await automationsApi.update(automationId, automationData);
      } else {
        const result = await automationsApi.create(automationData);
        if (result?.id) {
          setAutomationId(result.id);
          // Update URL from /automations/new to /automations/:id without full reload
          window.history.replaceState(null, '', `/automations/${result.id}`);
        }
      }
      setStatus(saveStatus);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      toast.success(saveStatus === 'live' ? 'Automation is live!' : 'Automation saved');
    } catch (err) {
      toast.error('Failed to save automation');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    handleSave('live');
  };

  const handleUnpublish = () => {
    handleSave('draft');
  };

  // Custom edge styles
  const edgeOptions = {
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#9CA3AF', strokeWidth: 2 },
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/automations')} className="text-gray-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Automations</span>
            <span className="text-sm text-gray-400">›</span>
            {isSystem ? (
              <span className="text-sm font-medium text-gray-900">{automationName}</span>
            ) : isEditingName ? (
              <Input
                value={automationName}
                onChange={(e) => setAutomationName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingName(false);
                }}
                className="h-6 w-48 px-2 text-sm font-medium"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{automationName}</span>
                <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-gray-600">
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <StatusPill status={status} className="ml-2" />
          {isSystem && <Badge className="ml-1 border-purple-200 bg-purple-100 text-xs text-purple-700">System</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {isSaved && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="h-4 w-4 text-green-600" />
              <span>Saved</span>
            </div>
          )}
          {/* Sits before Save so the reading order is test → save → set live,
              which is the order it should be done in. */}
          {!isSystem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTestPanel((open) => !open)}
              className={cn('text-gray-600', showTestPanel && 'border-blue-300 bg-blue-50 text-blue-700')}
            >
              <Play className="mr-2 h-4 w-4" />
              Test
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave()} disabled={saving} className="text-gray-600">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSystem ? 'Save Prompt' : 'Save'}
          </Button>
          {!isSystem &&
            (status === 'draft' ? (
              <Button onClick={handlePublish} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                Set Live
              </Button>
            ) : (
              <Button variant="outline" onClick={handleUnpublish} disabled={saving} size="sm">
                <Pause className="mr-2 h-4 w-4" />
                Unpublish
              </Button>
            ))}
        </div>
      </div>

      {/* Canvas Area. A tinted surface so the white step cards read as objects
          sitting on the canvas rather than dissolving into it. */}
      <div className="relative flex-1 overflow-hidden bg-gray-50">
        {loadingAutomation ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">Loading automation...</span>
          </div>
        ) : (
          <>
            {/* Everything on the canvas shifts left of the test panel while it
                is open, so the zoom controls, minimap and + button stay
                reachable instead of sitting underneath it. */}
            <div
              className="absolute inset-y-0 left-0 transition-[right] duration-200"
              style={{ right: showTestPanel && !isSystem ? 400 : 0 }}
            >
            {/* Main Canvas */}
            <ReactFlow
              nodes={nodesWithCallbacks}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={edgeOptions}
              fitView
              fitViewOptions={{ padding: 0.8, maxZoom: 0.65, minZoom: 0.3 }}
              className="bg-gray-50"
              connectionLineStyle={{ stroke: '#9CA3AF', strokeWidth: 2 }}
            >
              <Background color="#D1D5DB" gap={20} size={1} />
              <Controls
                position="top-right"
                showInteractive={false}
                className="bg-white border border-gray-200 rounded-lg shadow-sm"
              />
              <MiniMap
                position="bottom-right"
                className="bg-white border border-gray-200 rounded-lg shadow-sm"
                style={{ bottom: '100px', right: '12px' }}
                nodeColor="#3B82F6"
                maskColor="rgba(0, 0, 0, 0.1)"
              />
            </ReactFlow>

            {/* Floating Add Button - Right Side. Had no handler at all, so it
                looked like the way to add a step and did nothing when clicked. */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                onClick={handleAddStepAtEnd}
                title="Add a step"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>

            {/* Create with AI Section - Bottom */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
                <span className="text-sm font-medium text-white">Create with AI</span>
                <div className="flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5">
                  <input
                    type="text"
                    placeholder="What do you want to build?"
                    className="bg-transparent text-sm text-white placeholder-white/80 outline-none w-64"
                  />
                  <button className="text-white">
                    <Plus className="h-4 w-4 rotate-45" />
                  </button>
                </div>
              </div>
            </div>

            {/* Help Icon - Bottom Right */}
            <div className="absolute bottom-6 right-6 z-10">
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors shadow-sm">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Hint Text - Top Center. A yellow panel reads as a warning; this
                is only a hint, so it sits back as a quiet pill. */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3.5 py-1.5 shadow-sm backdrop-blur">
                <MousePointerClick className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">Click any step to edit it</span>
              </div>
            </div>

            {/* Trigger Type Selection Panel */}
            {showTriggerTypePanel && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-96 rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Choose Trigger Type</h3>
                  <p className="mt-1 text-sm text-gray-500">Select the event that will start your automation</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => handleSelectTriggerType('new_message')}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">New Message</div>
                      <div className="text-xs text-gray-500">When a user sends a message</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSelectTriggerType('missed_call')}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <PhoneMissed className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Missed Call</div>
                      <div className="text-xs text-gray-500">When a call is missed</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSelectTriggerType('incoming_call')}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <PhoneIncoming className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Incoming Call</div>
                      <div className="text-xs text-gray-500">When a call is received</div>
                    </div>
                  </button>

                  {/* Instagram triggers */}
                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">Instagram</p>
                  </div>
                  <button
                    onClick={() => handleSelectTriggerType('instagram_dm')}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <Instagram className="h-5 w-5 text-purple-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Instagram DM</div>
                      <div className="text-xs text-gray-500">When a user sends a DM</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSelectTriggerType('instagram_comment')}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="h-5 w-5 text-amber-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Instagram Comment</div>
                      <div className="text-xs text-gray-500">When someone comments on a post</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSelectTriggerType('instagram_story_reply')}
                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <AtSign className="h-5 w-5 text-pink-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Story Reply / Mention</div>
                      <div className="text-xs text-gray-500">When someone replies to or mentions in a story</div>
                    </div>
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTriggerTypePanel(false);
                    setConfiguringTriggerId(null);
                    setSelectedTriggerType(null);
                  }}
                  className="mt-4 w-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Tag Selection Panel */}
            {showTagPanel && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-96 rounded-lg border border-gray-200 bg-white p-6 shadow-xl max-h-[600px] overflow-y-auto">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Select Tag</h3>
                  <p className="mt-1 text-sm text-gray-500">Choose a tag to apply to contacts</p>
                </div>
                {!showCreateTag ? (
                  <>
                    {tagsQ.isLoading ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">Loading tags...</p>
                      </div>
                    ) : tagsQ.data && tagsQ.data.length > 0 ? (
                      <div className="space-y-2">
                        {tagsQ.data.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleSelectTag(tag)}
                            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <span
                              className={`h-3 w-3 rounded-full ${
                                tag.color === 'green'
                                  ? 'bg-green-500'
                                  : tag.color === 'blue'
                                    ? 'bg-blue-500'
                                    : tag.color === 'purple'
                                      ? 'bg-purple-500'
                                      : tag.color === 'orange'
                                        ? 'bg-amber-500'
                                        : tag.color === 'red'
                                          ? 'bg-red-500'
                                          : 'bg-gray-500'
                              }`}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{tag.name}</div>
                              {tag.description && <div className="text-xs text-gray-500">{tag.description}</div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">No tags found</p>
                        <p className="mt-1 text-xs text-gray-400">Create a tag to get started</p>
                      </div>
                    )}
                    <Button variant="outline" onClick={() => setShowCreateTag(true)} className="mt-4 w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Tag
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowTagPanel(false);
                        setConfiguringTagActionId(null);
                      }}
                      className="mt-2 w-full"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Tag Name</label>
                      <Input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="e.g., VIP, Lead, Customer"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-2">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'green', cls: 'bg-green-500' },
                          { key: 'blue', cls: 'bg-blue-500' },
                          { key: 'purple', cls: 'bg-purple-500' },
                          { key: 'orange', cls: 'bg-amber-500' },
                          { key: 'red', cls: 'bg-red-500' },
                          { key: 'gray', cls: 'bg-gray-500' },
                        ].map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => setNewTagColor(c.key)}
                            className="rounded-full p-1"
                          >
                            <div
                              className={`h-7 w-7 rounded-full ${c.cls} ${
                                newTagColor === c.key ? 'ring-2 ring-black/30 ring-offset-2' : 'ring-1 ring-black/10'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCreateTag(false);
                          setNewTagName('');
                        }}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button onClick={handleCreateTag} className="flex-1">
                        Create Tag
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Integration Selection Panel */}
            {showIntegrationPanel && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-96 rounded-lg border border-gray-200 bg-white p-6 shadow-xl max-h-[600px] overflow-y-auto">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Select Integration</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose the service this step should talk to
                  </p>
                </div>
                {integrationsLoading ? (
                  <p className="py-8 text-center text-sm text-gray-500">Loading integrations…</p>
                ) : (
                  <>
                    {/* A failed lookup used to look identical to "nothing connected",
                        which sent people to Settings to fix something that was fine. */}
                    {integrationsError && (
                      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs text-amber-800">
                          Couldn&apos;t check which integrations are connected. You can still pick
                          one — verify its setup in Settings before going live.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {integrations.map((integration) => (
                        <button
                          key={integration.key}
                          type="button"
                          onClick={() => handleSelectIntegration(integration)}
                          className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 overflow-hidden">
                            {integration.logo}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-gray-900">
                                {integration.name}
                              </span>
                              {/* Unconfigured services stay selectable: the step can be
                                  built now and the credentials added before going live. */}
                              {!integration.connected && !integrationsError && (
                                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                  Not configured
                                </span>
                              )}
                            </div>
                            <div className="truncate text-xs text-gray-500">
                              {integration.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <a
                      href="/integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Add credentials in Settings
                    </a>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowIntegrationPanel(false);
                    setConfiguringActionId(null);
                  }}
                  className="mt-4 w-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Trigger Configuration Panel (for keyword) */}
            {showTriggerConfig && selectedTriggerType === 'new_message' && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-96 rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Configure Trigger</h3>
                  <p className="mt-1 text-sm text-gray-500">Choose when this automation should trigger</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trigger on</label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTriggerMode('any');
                          setTriggerKeyword('');
                        }}
                        className={cn(
                          'w-full rounded-lg border-2 p-3 text-left transition-colors',
                          triggerMode === 'any'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Any message</div>
                            <div className="text-xs text-gray-500">Triggers on any WhatsApp message</div>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTriggerMode('keyword');
                          if (!triggerKeyword) setTriggerKeyword('');
                        }}
                        className={cn(
                          'w-full rounded-lg border-2 p-3 text-left transition-colors',
                          triggerMode === 'keyword'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-orange-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Message contains keyword</div>
                            <div className="text-xs text-gray-500">
                              Triggers only when message contains specific text
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                  {triggerMode === 'keyword' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Keyword</label>
                      <Input
                        type="text"
                        placeholder="e.g., HI, Hello, Help"
                        value={triggerKeyword}
                        onChange={(e) => setTriggerKeyword(e.target.value)}
                        className="w-full"
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveTrigger} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTriggerConfig(false);
                        setConfiguringTriggerId(null);
                        setSelectedTriggerType(null);
                        setTriggerKeyword('');
                        setTriggerMode('any');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Dry run. Reads the live canvas state, so it tests exactly what is
                on screen — including edits that have not been saved yet. */}
            {showTestPanel && !isSystem && (
              <TestRunPanel nodes={nodes} edges={edges} onClose={() => setShowTestPanel(false)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AutomationBuilderPage() {
  return (
    <ReactFlowProvider>
      <AutomationBuilderContent />
    </ReactFlowProvider>
  );
}

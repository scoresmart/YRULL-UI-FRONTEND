import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FolderPlus,
  Trash2,
  Grid,
  List,
  Zap,
  Edit2,
  Loader2,
  Bot,
  MessageSquare,
  ChevronDown,
  Save,
  Eye,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { automationsApi, claudePromptApi } from '../../lib/api';
import toast from 'react-hot-toast';

export function AutomationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [expandedAutomations, setExpandedAutomations] = useState(new Set());
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [livePrompt, setLivePrompt] = useState('');

  // Built-in system automations (hardcoded — always shown)
  const systemAutomations = [
    {
      id: 'system-ai-reply',
      name: 'AI Auto-Reply (Claude)',
      description:
        'Analyzes every incoming WhatsApp message with Claude AI and sends an intelligent reply with intent detection.',
      status: 'live',
      system: true,
      trigger_types: ['new_message'],
      model: 'claude-sonnet-4-20250514',
      cooldown: '10s',
      prompt: `You are a helpful assistant for Score Smart PTE, an Australian PTE (Pearson Test of English) coaching institute.

Your job: Analyze the incoming WhatsApp message and respond helpfully.

About Score Smart PTE:
- PTE Academic coaching (online & in-person in Australia)
- Courses: 2-Week PTE Crash Course, 1-Month PTE Course, PTE Mock Tests
- Also offers NAATI CCL and IELTS preparation
- Contact: +61432198990
- Website: scoresmart.au

Respond in JSON format ONLY:
{
  "intent": "one of: inquiry, pricing, enrollment, demo_request, essay_help, complaint, greeting, spam, other",
  "confidence": 0.0 to 1.0,
  "reply": "Your friendly reply to send back via WhatsApp. Keep it concise (under 200 words). Use emojis sparingly.",
  "is_lead": true/false,
  "tags": ["list", "of", "relevant", "tags"]
}

Rules:
- Be warm, professional, and helpful
- If asking about pricing, give general info and offer to connect with a counselor
- If they want to enroll, direct them to speak with a counselor
- For essay help requests, acknowledge and say a tutor will review it
- Always respond in the same language the user wrote in
- If the message is just a greeting, respond warmly and ask how you can help`,
    },
  ];

  useEffect(() => {
    loadAutomations();
    claudePromptApi
      .get()
      .then((data) => {
        if (data?.prompt) setLivePrompt(data.prompt);
      })
      .catch(() => {});
  }, []);

  const loadAutomations = async () => {
    try {
      setLoading(true);
      const data = await automationsApi.list();
      setAutomations(data || []);
    } catch (err) {
      toast.error('Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this automation?')) return;
    try {
      await automationsApi.delete(id);
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      toast.success('Automation deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filteredAutomations = automations.filter((auto) => {
    const matchesSearch = auto.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || auto.status === statusFilter;
    const matchesTrigger = !triggerFilter || (auto.trigger_types || []).includes(triggerFilter);
    return matchesSearch && matchesStatus && matchesTrigger;
  });

  const toggleExpand = (id) => {
    setExpandedAutomations((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-AU');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Automations</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage WhatsApp automations</p>
        </div>
        <Button onClick={() => navigate('/automations/new')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search all Automations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Any Trigger</option>
          <option value="new_message">New Message</option>
          <option value="keyword_match">Keyword Match</option>
          <option value="missed_call">Missed Call</option>
          <option value="incoming_call">Incoming Call</option>
          <option value="contact_created">New Contact</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Any Status</option>
          <option value="live">Live</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      {/* Folders */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <FolderPlus className="h-4 w-4" />
          New Folder
        </button>
        <button className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50">
          <Trash2 className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded px-2 py-1 text-sm',
              viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'rounded px-2 py-1 text-sm',
              viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50',
            )}
          >
            <Grid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Automation List */}
      <div className="space-y-3">
        {/* Table Header */}
        <div className="flex items-center gap-4 border-b border-gray-200 pb-2 text-xs font-medium text-gray-500">
          <div className="w-12">
            <input type="checkbox" className="rounded border-gray-300" />
          </div>
          <div className="flex-1">Name</div>
          <div className="w-24 text-right">Runs</div>
          <div className="w-24 text-right">Triggers</div>
          <div className="w-32 text-right">Modified</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading automations...</span>
          </div>
        ) : (
          <>
            {/* System Automations */}
            {(!triggerFilter || triggerFilter === 'new_message') &&
              (!statusFilter || statusFilter === 'live') &&
              systemAutomations
                .filter((sa) => !search || sa.name.toLowerCase().includes(search.toLowerCase()))
                .map((sa) => (
                  <div key={sa.id} className="rounded-lg border border-gray-200 bg-white">
                    <div className="flex items-center gap-4 p-4">
                      <div className="w-12">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                          <Zap className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/automations/${sa.id}`)}>
                        <div className="flex items-center gap-2">
                          <Badge variant="danger" className="text-xs">
                            LIVE
                          </Badge>
                          <span className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {sa.name}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{sa.description}</p>
                      </div>
                      <div className="w-24 text-right text-sm text-gray-600">—</div>
                      <div className="w-24 text-right text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          new message
                        </span>
                      </div>
                      <div className="w-32 text-right text-sm text-gray-500">Always on</div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/automations/${sa.id}`)}
                          className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                          title="Edit in Builder"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toast.error('System automation cannot be deleted')}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => toggleExpand(sa.id)}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
                        title="Show flow preview"
                      >
                        <ChevronDown
                          className={cn(
                            'h-5 w-5 transition-transform duration-200',
                            expandedAutomations.has(sa.id) && 'rotate-180',
                          )}
                        />
                      </button>
                    </div>
                    {expandedAutomations.has(sa.id) && (
                      <div className="border-t border-gray-100">
                        {/* Visual Flow */}
                        <div className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {/* Step 1: Trigger */}
                            <div className="flex flex-col items-center">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                                <MessageSquare className="h-5 w-5 text-green-600" />
                              </div>
                              <span className="mt-1.5 text-xs font-semibold text-green-700">Trigger</span>
                              <span className="text-[10px] text-gray-500">User sends message</span>
                            </div>

                            {/* Arrow */}
                            <div className="flex flex-1 items-center">
                              <div className="h-0.5 flex-1 bg-gradient-to-r from-green-300 to-purple-300" />
                              <div className="text-purple-400">▶</div>
                            </div>

                            {/* Step 2: Claude AI */}
                            <div className="flex flex-col items-center">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4A574] text-[#1a1a1a]">
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                                  <path d="M17.304 3.541l-5.497 16.918H14.93L20.426 3.54h-3.122zm-10.608 0L1.2 20.459h3.166l1.188-3.776h5.862l1.19 3.776h3.165L10.275 3.54H6.696zM6.47 13.828l2.03-6.449h.073l2.03 6.449H6.47z" />
                                </svg>
                              </div>
                              <span className="mt-1.5 text-xs font-semibold text-gray-700">Claude AI</span>
                              <span className="text-[10px] text-gray-500">Analyze + Reply</span>
                            </div>

                            {/* Arrow */}
                            <div className="flex flex-1 items-center">
                              <div className="h-0.5 flex-1 bg-gradient-to-r from-purple-300 to-blue-300" />
                              <div className="text-blue-400">▶</div>
                            </div>

                            {/* Step 3: Send Reply */}
                            <div className="flex flex-col items-center">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                              </div>
                              <span className="mt-1.5 text-xs font-semibold text-blue-700">Reply</span>
                              <span className="text-[10px] text-gray-500">Send via WhatsApp</span>
                            </div>

                            {/* Arrow */}
                            <div className="flex flex-1 items-center">
                              <div className="h-0.5 flex-1 bg-gradient-to-r from-blue-300 to-gray-300" />
                              <div className="text-gray-400">▶</div>
                            </div>

                            {/* Step 4: Save */}
                            <div className="flex flex-col items-center">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                                <Zap className="h-5 w-5 text-gray-600" />
                              </div>
                              <span className="mt-1.5 text-xs font-semibold text-gray-700">Save</span>
                              <span className="text-[10px] text-gray-500">Intent + tags to DB</span>
                            </div>
                          </div>

                          {/* Config badges */}
                          <div className="mt-4 flex items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                              Model: {sa.model}
                            </span>
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                              Cooldown: {sa.cooldown}
                            </span>
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              Includes conversation history
                            </span>
                          </div>
                        </div>

                        {/* System Prompt */}
                        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-gray-500" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                System Prompt
                              </span>
                            </div>
                            {editingPrompt ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    setSavingPrompt(true);
                                    try {
                                      await claudePromptApi.update(systemPrompt);
                                      toast.success('Prompt saved!');
                                      setLivePrompt(systemPrompt);
                                      setEditingPrompt(false);
                                    } catch {
                                      toast.error('Failed to save prompt');
                                    } finally {
                                      setSavingPrompt(false);
                                    }
                                  }}
                                  disabled={savingPrompt}
                                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                  {savingPrompt ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Save className="h-3 w-3" />
                                  )}
                                  Save Prompt
                                </button>
                                <button
                                  onClick={() => setEditingPrompt(false)}
                                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingPrompt(true);
                                  setSystemPrompt(livePrompt || sa.prompt);
                                }}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit Prompt
                              </button>
                            )}
                          </div>
                          {editingPrompt ? (
                            <textarea
                              value={systemPrompt}
                              onChange={(e) => setSystemPrompt(e.target.value)}
                              className="w-full min-h-[256px] max-h-[400px] rounded-lg border border-gray-300 bg-white p-4 font-mono text-xs leading-relaxed text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                            />
                          ) : (
                            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 font-mono text-xs leading-relaxed text-gray-700">
                              {livePrompt || sa.prompt}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

            {/* User Automations */}
            {filteredAutomations.map((automation) => {
              const triggerTypes = automation.trigger_types || [];
              // Parse nodes to extract trigger/action info for visual flow
              let parsedNodes = [];
              try {
                parsedNodes =
                  typeof automation.nodes === 'string'
                    ? JSON.parse(automation.nodes)
                    : Array.isArray(automation.nodes)
                      ? automation.nodes
                      : [];
              } catch {
                /* ignore */
              }
              const triggerNode = parsedNodes.find((n) => n.type === 'trigger');
              const actionNodes = parsedNodes.filter((n) => n.type === 'action');

              return (
                <div key={automation.id} className="rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-12">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                        <Zap className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/automations/${automation.id}`)}>
                      <div className="flex items-center gap-2">
                        <Badge variant={automation.status === 'live' ? 'danger' : 'muted'} className="text-xs">
                          {(automation.status || 'draft').toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {automation.name}
                        </span>
                        {automation.platform === 'whatsapp' && (
                          <span className="text-xs text-gray-500">📱 WhatsApp</span>
                        )}
                      </div>
                      {automation.description && <p className="mt-1 text-xs text-gray-500">{automation.description}</p>}
                    </div>
                    <div className="w-24 text-right text-sm text-gray-600">{automation.total_runs ?? 0}</div>
                    <div className="w-24 text-right text-sm text-gray-600">
                      {triggerTypes.length > 0 ? triggerTypes.map((t) => t.replace('_', ' ')).join(', ') : 'None'}
                    </div>
                    <div className="w-32 text-right text-sm text-gray-600">{formatDate(automation.updated_at)}</div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/automations/${automation.id}`)}
                        className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        title="Edit in Builder"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, automation.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => toggleExpand(automation.id)}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
                      title="Show flow preview"
                    >
                      <ChevronDown
                        className={cn(
                          'h-5 w-5 transition-transform duration-200',
                          expandedAutomations.has(automation.id) && 'rotate-180',
                        )}
                      />
                    </button>
                  </div>

                  {/* Expanded Visual Flow */}
                  {expandedAutomations.has(automation.id) && (
                    <div className="border-t border-gray-100">
                      <div className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {/* Trigger Step */}
                          <div className="flex flex-col items-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
                              {triggerNode?.data?.triggerType === 'missed_call' ? (
                                <Zap className="h-5 w-5 text-green-600" />
                              ) : triggerNode?.data?.triggerType === 'incoming_call' ? (
                                <Zap className="h-5 w-5 text-green-600" />
                              ) : (
                                <MessageSquare className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            <span className="mt-1.5 text-xs font-semibold text-green-700">When...</span>
                            <span className="text-[10px] text-gray-500">
                              {triggerNode?.data?.triggerType === 'new_message'
                                ? 'User sends message'
                                : triggerNode?.data?.triggerType === 'missed_call'
                                  ? 'Call is missed'
                                  : triggerNode?.data?.triggerType === 'incoming_call'
                                    ? 'Call received'
                                    : 'Trigger'}
                            </span>
                            {triggerNode?.data?.keyword && (
                              <span className="mt-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                contains "{triggerNode.data.keyword}"
                              </span>
                            )}
                          </div>

                          {actionNodes.length > 0 ? (
                            actionNodes.map((actionNode, i) => (
                              <div key={actionNode.id} className="flex items-center gap-3">
                                {/* Arrow */}
                                <div className="flex flex-1 items-center">
                                  <div className="h-0.5 w-16 bg-gradient-to-r from-green-300 to-blue-300" />
                                  <div className="text-blue-400">▶</div>
                                </div>

                                {/* Action Step */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className={cn(
                                      'flex h-12 w-12 items-center justify-center rounded-xl',
                                      actionNode.data?.actionType === 'send_message'
                                        ? 'bg-blue-100'
                                        : actionNode.data?.actionType === 'delay'
                                          ? 'bg-purple-100'
                                          : 'bg-orange-100',
                                    )}
                                  >
                                    {actionNode.data?.actionType === 'send_message' ? (
                                      <MessageSquare className="h-5 w-5 text-blue-600" />
                                    ) : actionNode.data?.actionType === 'delay' ? (
                                      <Zap className="h-5 w-5 text-purple-600" />
                                    ) : (
                                      <Zap className="h-5 w-5 text-orange-600" />
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      'mt-1.5 text-xs font-semibold',
                                      actionNode.data?.actionType === 'send_message'
                                        ? 'text-blue-700'
                                        : actionNode.data?.actionType === 'delay'
                                          ? 'text-purple-700'
                                          : 'text-orange-700',
                                    )}
                                  >
                                    {actionNode.data?.actionType === 'send_message'
                                      ? 'WhatsApp'
                                      : actionNode.data?.actionType === 'delay'
                                        ? 'Delay'
                                        : actionNode.data?.actionType === 'add_tag'
                                          ? 'Add Tag'
                                          : actionNode.data?.actionType === 'assign'
                                            ? 'Assign'
                                            : 'Action'}
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    {actionNode.data?.actionType === 'send_message'
                                      ? 'Send Message'
                                      : actionNode.data?.actionType === 'delay'
                                        ? `Wait ${actionNode.data?.duration || 60}s`
                                        : actionNode.data?.actionType?.replace('_', ' ')}
                                  </span>
                                  {actionNode.data?.actionType === 'send_message' && actionNode.data?.message && (
                                    <span className="mt-0.5 max-w-[120px] truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">
                                      "{actionNode.data.message}"
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <>
                              {/* Arrow */}
                              <div className="flex flex-1 items-center">
                                <div className="h-0.5 w-16 bg-gradient-to-r from-green-300 to-gray-300" />
                                <div className="text-gray-400">▶</div>
                              </div>
                              {/* No action configured */}
                              <div className="flex flex-col items-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                                  <Plus className="h-5 w-5 text-gray-400" />
                                </div>
                                <span className="mt-1.5 text-xs font-semibold text-gray-400">No action</span>
                                <span className="text-[10px] text-gray-400">Add a step</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Edit in Builder link */}
                      <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Zap className="h-3 w-3" />
                          {triggerTypes.length} trigger{triggerTypes.length !== 1 ? 's' : ''} · {actionNodes.length}{' '}
                          action{actionNodes.length !== 1 ? 's' : ''}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/automations/${automation.id}`);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit in Builder
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

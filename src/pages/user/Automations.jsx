import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowUpDown,
  Trash2,
  Zap,
  Edit2,
  Loader2,
  Bot,
  MessageSquare,
  ChevronDown,
  Save,
  Workflow,
  Activity,
  PauseCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { StatusPill } from '../../components/ui/status-pill';
import { Switch } from '../../components/ui/switch';
import { cn } from '../../lib/utils';
import { automationsApi, claudePromptApi } from '../../lib/api';
import toast from 'react-hot-toast';

// ── Small presentational pieces ───────────────────────────────────────────

const TILE_TONES = {
  slate: 'bg-gray-100 text-gray-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
};

function StatTile({ label, value, icon, tone }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', TILE_TONES[tone])}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{value}</div>
    </div>
  );
}

// Defined at module level, not inside the page: a component re-created on every
// render remounts its button, so the heading would lose keyboard focus on click.
function SortHeader({ column, label, className, activeColumn, onSort }) {
  const isActive = activeColumn === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
        isActive ? 'text-gray-700' : 'text-gray-400 hover:text-gray-600',
        className,
      )}
    >
      {label}
      <ArrowUpDown
        className={cn('h-3 w-3 transition-opacity', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')}
      />
    </button>
  );
}

export function AutomationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedAutomations, setExpandedAutomations] = useState(new Set());
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [sortDir, setSortDir] = useState('desc');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [systemAutoActive, setSystemAutoActive] = useState(
    () => localStorage.getItem('systemAutoActive') !== 'false',
  );
  const [togglingId, setTogglingId] = useState(null);
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

  const handleToggle = async (automation) => {
    const newStatus = automation.status === 'live' ? 'paused' : 'live';
    setTogglingId(automation.id);
    // Optimistic update
    setAutomations((prev) => prev.map((a) => (a.id === automation.id ? { ...a, status: newStatus } : a)));
    try {
      await automationsApi.update(automation.id, { status: newStatus });
      toast.success(newStatus === 'live' ? 'Automation activated' : 'Automation paused', { id: 'auto-toggle' });
    } catch (err) {
      // Rollback
      setAutomations((prev) => prev.map((a) => (a.id === automation.id ? { ...a, status: automation.status } : a)));
      toast.error('Failed to update automation');
    } finally {
      setTogglingId(null);
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

  const filteredAutomations = automations
    .filter((auto) => {
      const matchesSearch = auto.name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || (auto.status || 'draft') === statusFilter;
      const matchesTrigger = !triggerFilter || (auto.trigger_types || []).includes(triggerFilter);
      return matchesSearch && matchesStatus && matchesTrigger;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return dir * (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'runs') return dir * ((a.total_runs ?? 0) - (b.total_runs ?? 0));
      return dir * (new Date(a.updated_at || 0) - new Date(b.updated_at || 0));
    });

  // Clicking a heading sorts by it; clicking the active one flips direction.
  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'name' ? 'asc' : 'desc');
    }
  };

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

  const liveCount = automations.filter((a) => a.status === 'live').length + (systemAutoActive ? 1 : 0);
  const draftCount = automations.filter((a) => (a.status || 'draft') === 'draft').length;
  const pausedCount = automations.filter((a) => a.status === 'paused').length;
  const totalRuns = automations.reduce((sum, a) => sum + (a.total_runs ?? 0), 0);
  const isFiltered = Boolean(search || statusFilter || triggerFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Automations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every workflow that runs on your behalf — triggers, steps and results in one place.
          </p>
        </div>
        <Button onClick={() => navigate('/automations/new')} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* At-a-glance figures. The page used to open straight into a bare list,
          with no sense of how much was running or how often it fired. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Total"
          value={automations.length + systemAutomations.length}
          icon={<Workflow className="h-4 w-4" />}
          tone="slate"
        />
        <StatTile label="Live" value={liveCount} icon={<Activity className="h-4 w-4" />} tone="emerald" />
        <StatTile
          label="Drafts"
          value={draftCount + pausedCount}
          icon={<PauseCircle className="h-4 w-4" />}
          tone="amber"
        />
        <StatTile label="Total runs" value={totalRuns.toLocaleString()} icon={<Zap className="h-4 w-4" />} tone="blue" />
      </div>

      {/* Status as a segmented control with counts, the pattern every serious
          automation tool settles on — the state of the account is readable
          without opening a dropdown, and each tab is one click away. */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { value: '', label: 'All', count: automations.length },
          { value: 'live', label: 'Live', count: automations.filter((a) => a.status === 'live').length },
          { value: 'draft', label: 'Drafts', count: draftCount },
          { value: 'paused', label: 'Paused', count: pausedCount },
        ].map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              statusFilter === tab.value
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                statusFilter === tab.value ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500',
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search automations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Any trigger</option>
          <option value="new_message">New Message</option>
          <option value="keyword_match">Keyword Match</option>
          <option value="missed_call">Missed Call</option>
          <option value="incoming_call">Incoming Call</option>
          <option value="contact_created">New Contact</option>
        </select>
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('');
              setTriggerFilter('');
            }}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Automation List */}
      <div className="space-y-3">
        {/* Column headings, aligned to the same track widths the rows use. */}
        <div className="hidden items-center gap-4 px-4 pb-2 lg:flex">
          <div className="w-9" />
          <SortHeader column="name" label="Automation" className="flex-1" activeColumn={sortBy} onSort={toggleSort} />
          <SortHeader column="runs" label="Runs" className="w-20 justify-end" activeColumn={sortBy} onSort={toggleSort} />
          <div className="w-36 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Trigger</div>
          <SortHeader column="updated" label="Modified" className="w-24 justify-end" activeColumn={sortBy} onSort={toggleSort} />
          <div className="w-[132px] text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Actions
          </div>
          <div className="w-7" />
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
                  <div
                    key={sa.id}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center gap-4 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D4A574]/15 text-[#B4823C]">
                        <Bot className="h-4.5 w-4.5" />
                      </div>
                      <div
                        className="min-w-[180px] flex-1 cursor-pointer"
                        onClick={() => navigate(`/automations/${sa.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {sa.name}
                          </span>
                          <StatusPill status={systemAutoActive ? 'live' : 'paused'} />
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            Built in
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-gray-500">{sa.description}</p>
                      </div>
                      <div className="w-20 text-right text-sm tabular-nums text-gray-400">—</div>
                      <div className="w-36 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3 text-gray-400" />
                          New message
                        </span>
                      </div>
                      <div className="w-24 text-right text-sm text-gray-400">—</div>
                      <div className="flex w-[132px] items-center justify-end gap-1">
                        <Switch
                          checked={systemAutoActive}
                          onCheckedChange={(checked) => {
                            setSystemAutoActive(checked);
                            localStorage.setItem('systemAutoActive', String(checked));
                            toast.success(checked ? 'AI Auto-Reply activated' : 'AI Auto-Reply paused', { id: 'sys-auto-toggle' });
                          }}
                        />
                        <button
                          onClick={() => navigate(`/automations/${sa.id}`)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Edit in builder"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toast.error('Built-in automations cannot be deleted')}
                          className="rounded-lg p-2 text-gray-300"
                          title="Built-in automations cannot be deleted"
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
                <div
                  key={automation.id}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-4 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div
                      className="min-w-[180px] flex-1 cursor-pointer"
                      onClick={() => navigate(`/automations/${automation.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-gray-900 transition-colors hover:text-blue-600">
                          {automation.name}
                        </span>
                        <StatusPill status={automation.status || 'draft'} />
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                        {automation.description ||
                          `${actionNodes.length} step${actionNodes.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="w-20 text-right text-sm tabular-nums text-gray-700">
                      {(automation.total_runs ?? 0).toLocaleString()}
                    </div>
                    <div className="w-36">
                      {triggerTypes.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                          <MessageSquare className="h-3 w-3 shrink-0 text-gray-400" />
                          <span className="truncate capitalize">
                            {triggerTypes.map((t) => t.replace(/_/g, ' ')).join(', ')}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not set</span>
                      )}
                    </div>
                    <div className="w-24 text-right text-xs text-gray-500">{formatDate(automation.updated_at)}</div>
                    <div className="flex w-[132px] items-center justify-end gap-1">
                      <Switch
                        checked={automation.status === 'live'}
                        disabled={togglingId === automation.id}
                        onCheckedChange={() => handleToggle(automation)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => navigate(`/automations/${automation.id}`)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="Edit in builder"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, automation.id)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
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

            {/* The list simply rendered nothing when empty, which read as a
                broken page rather than a starting point. */}
            {filteredAutomations.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                  <Workflow className="h-5 w-5 text-gray-400" />
                </div>
                {isFiltered ? (
                  <>
                    <p className="mt-3 text-sm font-medium text-gray-900">No automations match those filters</p>
                    <p className="mt-1 text-sm text-gray-500">Try a different search or clear the filters.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setStatusFilter('');
                        setTriggerFilter('');
                      }}
                      className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-medium text-gray-900">No automations yet</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Build one to reply, tag or update the CRM without lifting a finger.
                    </p>
                    <Button
                      onClick={() => navigate('/automations/new')}
                      className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Automation
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

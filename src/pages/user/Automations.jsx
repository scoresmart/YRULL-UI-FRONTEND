import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpDown,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Folder,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Workflow,
  XCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatRelativeTime } from '../../lib/utils';
import { automationsApi } from '../../lib/api';
import { Switch } from '../../components/ui/switch';
import { StatusPill } from '../../components/ui/status-pill';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { ACTIONS_BY_TYPE, TRIGGERS, TRIGGERS_BY_TYPE } from '../../components/automations/builder/catalog';
import { loadGraph, toPayload } from '../../components/automations/builder/graph';

// Its own key: useAutomations() caches a different shape under ['automations'].
const LIST_KEY = ['automations', 'list'];
const asList = (d) => (Array.isArray(d) ? d : d?.automations ?? d?.data ?? []);
const parse = (v) => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

/** Ready-made starting points; each opens as a draft to finish in the builder. */
const RECIPES = [
  {
    key: 'lead-welcome',
    title: 'Welcome new leads',
    description: 'Send a template the moment a lead lands in the CRM, then follow up a day later.',
    icon: Sparkles,
    trigger: { triggerType: 'lead_created' },
    steps: [
      { actionType: 'send_template' },
      { actionType: 'delay', duration: 1, unit: 'days' },
      { actionType: 'send_message', message: 'Hi {first_name}, did you get a chance to look at the course details? Reply here with any questions.' },
    ],
  },
  {
    key: 'keyword-reply',
    title: 'Keyword auto-reply',
    description: 'Reply instantly when someone asks about pricing, and tag them for follow-up.',
    icon: Zap,
    trigger: { triggerType: 'new_message', keyword: 'price' },
    steps: [
      { actionType: 'send_message', message: 'Hi {first_name}! Our course options and prices are here: https://scoresmart.au — want a counsellor to call you?' },
      { actionType: 'add_tag', tag: 'Pricing enquiry', tagName: 'Pricing enquiry' },
    ],
  },
  {
    key: 'missed-call',
    title: 'Missed call follow-up',
    description: 'A few minutes after a missed WhatsApp call, send a button so they can call back.',
    icon: Clock,
    trigger: { triggerType: 'missed_call' },
    steps: [
      { actionType: 'delay', duration: 5, unit: 'minutes' },
      { actionType: 'send_call_button', message: 'Sorry we missed your call, {first_name}! Tap below to call us back.', displayText: 'Call us back' },
    ],
  },
  {
    key: 'ig-dm',
    title: 'Instagram DM reply',
    description: 'Answer Instagram direct messages right away, day or night.',
    icon: Bot,
    trigger: { triggerType: 'instagram_dm' },
    steps: [{ actionType: 'send_ig_dm', message: 'Thanks for your message! A member of our team will reply shortly.' }],
  },
];

function recipePayload(recipe) {
  const nodes = [{ id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: recipe.trigger }];
  const edges = [];
  let prev = 'trigger';
  recipe.steps.forEach((data, i) => {
    const id = `step-${i + 1}`;
    nodes.push({ id, type: 'action', position: { x: 0, y: 0 }, data });
    edges.push({ source: prev, target: id });
    prev = id;
  });
  const graph = loadGraph(nodes, edges);
  return { name: recipe.title, description: recipe.description, status: 'draft', platform: recipe.trigger.triggerType.startsWith('instagram') ? 'instagram' : 'whatsapp', ...toPayload(graph.nodes, graph.edges) };
}

/* ── Presentational pieces ─────────────────────────────────────────────── */

function KpiTile({ label, value, sub, icon, tone = 'slate', loading }) {
  const Icon = icon;
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-500">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-gray-900 tabular-nums">
        {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-gray-100" /> : value}
      </div>
      <div className="mt-1.5 h-4 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

/** Runs per day, completed and failed stacked, with a hover tooltip per day. */
function RunsChart({ days, loading }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.runs));
  const ticks = [max, Math.round(max / 2), 0];
  const label = (iso, opts) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', opts);

  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-gray-50" />;
  if (!days.length) {
    return <div className="flex h-48 items-center justify-center text-sm text-gray-400">No activity data yet</div>;
  }
  return (
    <div className="relative">
      <div className="flex h-48 gap-3">
        <div className="flex w-6 flex-col justify-between text-right text-[11px] tabular-nums text-gray-400">
          {ticks.map((t, i) => (
            <span key={i} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {[0, 50, 100].map((p) => (
            <div key={p} className="absolute inset-x-0 border-t border-dashed border-gray-100" style={{ top: `${p}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[3px]">
            {days.map((d, i) => {
              const ok = Math.max(d.runs - d.errors, 0);
              return (
                <div
                  key={d.date}
                  className="group relative flex h-full flex-1 cursor-default flex-col justify-end"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className={cn('flex w-full flex-col justify-end gap-[2px]', hover !== null && hover !== i && 'opacity-50')}>
                    {d.errors ? <div className="w-full rounded-t-[3px] bg-red-500" style={{ height: `${(d.errors / max) * 176}px` }} /> : null}
                    {ok ? (
                      <div className={cn('w-full bg-[#25D366]', !d.errors && 'rounded-t-[3px]')} style={{ height: `${(ok / max) * 176}px` }} />
                    ) : null}
                  </div>
                  {hover === i ? (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <div className="font-medium text-gray-900">{label(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                      <div className="mt-1 flex justify-between text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-sm bg-[#25D366]" />
                          Completed
                        </span>
                        <span className="tabular-nums text-gray-900">{ok}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-sm bg-red-500" />
                          Failed
                        </span>
                        <span className="tabular-nums text-gray-900">{d.errors}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-9 mt-2 flex justify-between text-[11px] text-gray-400">
        <span>{label(days[0].date, { day: 'numeric', month: 'short' })}</span>
        <span>{label(days[days.length - 1].date, { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  );
}

function SortButton({ column, label, sort, onSort, className }) {
  const active = sort.column === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn('group inline-flex items-center gap-1 font-medium', active ? 'text-gray-700' : 'text-gray-500 hover:text-gray-700', className)}
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')} />
    </button>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function AutomationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(30);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [sort, setSort] = useState({ column: 'updated', dir: 'desc' });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [creating, setCreating] = useState(null);

  const listQ = useQuery({ queryKey: LIST_KEY, queryFn: () => automationsApi.list(), select: asList });
  const statsQ = useQuery({
    queryKey: ['automation_stats', period],
    queryFn: () => automationsApi.stats(period),
    retry: false,
    refetchInterval: 60_000,
  });

  const automations = useMemo(
    () =>
      (listQ.data || []).map((a) => {
        const nodes = parse(a.nodes) || [];
        const trigger = nodes.find((n) => n.type === 'trigger');
        const steps = nodes.filter((n) => n.type === 'action');
        return {
          ...a,
          triggerType: trigger?.data?.triggerType || (a.trigger_types || [])[0] || '',
          stepTypes: steps.map((s) => s.data?.actionType),
        };
      }),
    [listQ.data],
  );
  const perAutomation = useMemo(() => statsQ.data?.per_automation || {}, [statsQ.data]);

  const counts = useMemo(
    () => ({
      all: automations.length,
      live: automations.filter((a) => a.status === 'live').length,
      paused: automations.filter((a) => a.status === 'paused').length,
      draft: automations.filter((a) => !a.status || a.status === 'draft').length,
    }),
    [automations],
  );
  const folders = useMemo(() => [...new Set(automations.map((a) => a.folder).filter(Boolean))].sort(), [automations]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = automations.filter(
      (a) =>
        (tab === 'all' || (tab === 'draft' ? !a.status || a.status === 'draft' : a.status === tab)) &&
        (!triggerFilter || a.triggerType === triggerFilter) &&
        (!folderFilter || a.folder === folderFilter) &&
        (!q || `${a.name} ${a.description || ''} ${a.folder || ''}`.toLowerCase().includes(q)),
    );
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = {
      name: (a) => (a.name || '').toLowerCase(),
      runs: (a) => perAutomation[a.id]?.runs ?? a.total_runs ?? 0,
      lastRun: (a) => new Date(perAutomation[a.id]?.last_run_at || a.last_run_at || 0).getTime(),
      updated: (a) => new Date(a.updated_at || a.created_at || 0).getTime(),
    }[sort.column];
    return [...list].sort((a, b) => (key(a) > key(b) ? dir : key(a) < key(b) ? -dir : 0));
  }, [automations, tab, search, triggerFilter, folderFilter, sort, perAutomation]);

  const onSort = (column) =>
    setSort((s) => (s.column === column ? { column, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { column, dir: column === 'name' ? 'asc' : 'desc' }));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['automations'] });
    queryClient.invalidateQueries({ queryKey: ['automation_stats'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => automationsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      const prev = queryClient.getQueryData(LIST_KEY);
      queryClient.setQueryData(LIST_KEY, (old) => {
        const list = asList(old);
        return list.map((a) => (a.id === id ? { ...a, status } : a));
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      queryClient.setQueryData(LIST_KEY, ctx?.prev);
      toast.error(err.message || 'Could not change the status');
    },
    onSuccess: (_d, { status }) => toast.success(status === 'live' ? 'Automation is live' : 'Automation paused'),
    onSettled: refresh,
  });

  const duplicate = async (a) => {
    try {
      const copy = await automationsApi.duplicate(a.id);
      toast.success('Duplicated as a draft');
      refresh();
      if (copy?.id) navigate(`/automations/${copy.id}`);
    } catch (err) {
      toast.error(err.message || 'Could not duplicate');
    }
  };

  const confirmDelete = async () => {
    const a = pendingDelete;
    setPendingDelete(null);
    try {
      await automationsApi.delete(a.id);
      toast.success(`Deleted “${a.name}”`);
      refresh();
    } catch (err) {
      toast.error(err.message || 'Could not delete');
    }
  };

  const createFromRecipe = async (recipe) => {
    setCreating(recipe.key);
    try {
      const created = await automationsApi.create(recipePayload(recipe));
      refresh();
      navigate(`/automations/${created.id}`);
    } catch (err) {
      toast.error(err.message || 'Could not create the automation');
    } finally {
      setCreating(null);
    }
  };

  const runs = statsQ.data?.runs;
  const statsReady = Boolean(statsQ.data);
  const topAutomations = useMemo(
    () =>
      automations
        .map((a) => ({ ...a, periodRuns: perAutomation[a.id]?.runs || 0, periodErrors: perAutomation[a.id]?.errors || 0 }))
        .filter((a) => a.periodRuns > 0)
        .sort((a, b) => b.periodRuns - a.periodRuns)
        .slice(0, 5),
    [automations, perAutomation],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Automations</h1>
          <p className="mt-1 text-sm text-gray-500">Reply, follow up and update your CRM automatically across WhatsApp, Instagram and email.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPeriod(d)}
                className={cn('rounded-md px-2.5 py-1 text-[13px] font-medium', period === d ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900')}
              >
                {d}d
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1fb85a]">
                <Plus className="h-4 w-4" />
                New automation
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem onSelect={() => navigate('/automations/new')} className="gap-3 py-2">
                <Workflow className="h-4 w-4 text-gray-500" />
                <span>
                  <span className="block font-medium">Start from scratch</span>
                  <span className="block text-xs text-gray-500">Pick a trigger and build the steps</span>
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {RECIPES.map((r) => (
                <DropdownMenuItem key={r.key} onSelect={() => createFromRecipe(r)} className="gap-3 py-2">
                  <r.icon className="h-4 w-4 text-gray-500" />
                  <span className="min-w-0">
                    <span className="block font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-gray-500">{r.description}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label="Live automations" icon={Zap} tone="green" value={counts.live} sub={`${counts.paused} paused · ${counts.draft} draft`} loading={listQ.isLoading} />
        <KpiTile label={`Runs · ${period} days`} icon={Activity} tone="blue" value={statsReady ? runs.period.toLocaleString() : '—'} sub={statsReady ? `${runs.completed.toLocaleString()} completed` : statsQ.isError ? 'Stats unavailable' : ''} loading={statsQ.isLoading} />
        <KpiTile
          label="Success rate"
          icon={CheckCircle2}
          tone="green"
          value={statsReady && runs.success_rate !== null ? `${Math.round(runs.success_rate * 100)}%` : '—'}
          sub={statsReady ? 'of finished runs' : ''}
          loading={statsQ.isLoading}
        />
        <KpiTile label="Active now" icon={Clock} tone="amber" value={statsReady ? runs.active : '—'} sub="running or waiting" loading={statsQ.isLoading} />
        <KpiTile label="Failed runs" icon={XCircle} tone="red" value={statsReady ? runs.errors : '—'} sub={statsReady && runs.errors ? 'open an automation’s Activity' : statsReady ? 'no failures' : ''} loading={statsQ.isLoading} />
      </div>

      {/* Activity */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Runs per day</h2>
              <p className="text-xs text-gray-500">Last {period} days</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#25D366]" />
                Completed
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                Failed
              </span>
            </div>
          </div>
          {statsQ.isError ? (
            <div className="flex h-48 items-center justify-center text-center text-sm text-gray-500">
              Activity stats aren&apos;t available yet.
              <br />
              They appear once the backend update is deployed.
            </div>
          ) : (
            <RunsChart days={statsQ.data?.by_day || []} loading={statsQ.isLoading} />
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Most active</h2>
          <p className="text-xs text-gray-500">By runs in the last {period} days</p>
          <div className="mt-4 space-y-3">
            {statsQ.isLoading ? (
              [0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-50" />)
            ) : topAutomations.length ? (
              topAutomations.map((a) => (
                <button key={a.id} type="button" onClick={() => navigate(`/automations/${a.id}`)} className="block w-full text-left">
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium text-gray-800">{a.name}</span>
                    <span className="shrink-0 tabular-nums text-gray-600">{a.periodRuns}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-[#25D366]" style={{ width: `${(a.periodRuns / topAutomations[0].periodRuns) * 100}%` }} />
                  </div>
                </button>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No runs in this period</p>
            )}
          </div>
        </div>
      </div>

      {/* Built-in */}
      <button
        type="button"
        onClick={() => navigate('/automations/system-ai-reply')}
        className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4EBE1] text-[#B07A4B]">
          <Bot className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">AI auto-reply</span>
            <span className="rounded bg-gray-100 px-1.5 py-px text-[10.5px] font-medium uppercase tracking-wide text-gray-500">Built-in</span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-gray-500">Claude reads every incoming WhatsApp message and replies with your instructions.</span>
        </span>
        <span className="hidden items-center gap-1 text-[13px] font-medium text-gray-600 sm:flex">
          Edit instructions
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
          <div className="flex gap-1">
            {[
              ['all', 'All'],
              ['live', 'Live'],
              ['paused', 'Paused'],
              ['draft', 'Drafts'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium', tab === value ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-800')}
              >
                {label}
                <span className="ml-1.5 tabular-nums text-gray-400">{counts[value]}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search automations"
                className="h-9 w-56 rounded-lg border border-gray-200 pl-8 pr-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
              />
            </div>
            <select value={triggerFilter} onChange={(e) => setTriggerFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 focus:outline-none">
              <option value="">All triggers</option>
              {TRIGGERS.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
            {folders.length ? (
              <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 focus:outline-none">
                <option value="">All folders</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        {listQ.isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading automations…
          </div>
        ) : listQ.isError ? (
          <div className="py-16 text-center text-sm text-red-600">{listQ.error?.message || 'Could not load automations'}</div>
        ) : !automations.length ? (
          <div className="px-6 py-12">
            <div className="text-center">
              <Workflow className="mx-auto h-8 w-8 text-gray-300" />
              <h3 className="mt-3 text-base font-semibold text-gray-900">Create your first automation</h3>
              <p className="mt-1 text-sm text-gray-500">Start from a template or build one from scratch.</p>
            </div>
            <div className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {RECIPES.map((r) => (
                <button key={r.key} type="button" disabled={Boolean(creating)} onClick={() => createFromRecipe(r)} className="rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-[#25D366] disabled:opacity-60">
                  {creating === r.key ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <r.icon className="h-5 w-5 text-[#25D366]" />}
                  <div className="mt-2 text-sm font-semibold text-gray-900">{r.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-gray-500">{r.description}</div>
                </button>
              ))}
            </div>
          </div>
        ) : !rows.length ? (
          <div className="py-16 text-center text-sm text-gray-500">No automations match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="px-4 py-2.5">
                    <SortButton column="name" label="Automation" sort={sort} onSort={onSort} />
                  </th>
                  <th className="px-4 py-2.5 font-medium">Trigger</th>
                  <th className="px-4 py-2.5 font-medium">Steps</th>
                  <th className="px-4 py-2.5 text-right">
                    <SortButton column="runs" label={`Runs · ${period}d`} sort={sort} onSort={onSort} className="flex-row-reverse" />
                  </th>
                  <th className="px-4 py-2.5">
                    <SortButton column="lastRun" label="Last run" sort={sort} onSort={onSort} />
                  </th>
                  <th className="px-4 py-2.5">
                    <SortButton column="updated" label="Updated" sort={sort} onSort={onSort} />
                  </th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((a) => {
                  const trig = TRIGGERS_BY_TYPE[a.triggerType];
                  const TrigIcon = trig?.icon || Zap;
                  const stat = perAutomation[a.id];
                  const lastRun = stat?.last_run_at || a.last_run_at;
                  const toggleable = a.status === 'live' || a.status === 'paused';
                  return (
                    <tr key={a.id} onClick={() => navigate(`/automations/${a.id}`)} className="cursor-pointer transition-colors hover:bg-gray-50/80">
                      <td className="max-w-[320px] px-4 py-3">
                        <div className="truncate font-medium text-gray-900">{a.name || 'Untitled automation'}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                          {a.folder ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-gray-100 px-1.5 py-px text-gray-600">
                              <Folder className="h-3 w-3" />
                              {a.folder}
                            </span>
                          ) : null}
                          <span className="truncate">{a.description || ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-gray-700">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                            <TrigIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="whitespace-nowrap">{trig?.label || a.triggerType || 'No trigger'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center -space-x-1">
                          {a.stepTypes.slice(0, 5).map((t, i) => {
                            const def = ACTIONS_BY_TYPE[t];
                            const Icon = def?.icon || Zap;
                            return (
                              <span key={i} title={def?.label || t} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-600">
                                <Icon className="h-3 w-3" />
                              </span>
                            );
                          })}
                          {a.stepTypes.length > 5 ? <span className="pl-2 text-xs text-gray-500">+{a.stepTypes.length - 5}</span> : null}
                          {!a.stepTypes.length ? <span className="text-xs text-gray-400">None</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="text-gray-900">{stat ? stat.runs.toLocaleString() : (a.total_runs ?? 0).toLocaleString()}</span>
                        {stat?.errors ? <span className="ml-1.5 text-xs text-red-600">{stat.errors} failed</span> : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{lastRun ? formatRelativeTime(lastRun) : <span className="text-gray-400">Never</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">{a.updated_at ? formatRelativeTime(a.updated_at) : '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {toggleable ? (
                          <label className="inline-flex items-center gap-2">
                            <Switch
                              checked={a.status === 'live'}
                              disabled={statusMutation.isPending}
                              onCheckedChange={(on) => statusMutation.mutate({ id: a.id, status: on ? 'live' : 'paused' })}
                              aria-label={a.status === 'live' ? 'Pause automation' : 'Resume automation'}
                            />
                            <StatusPill status={a.status} />
                          </label>
                        ) : (
                          <StatusPill status="draft" />
                        )}
                      </td>
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="Automation actions" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onSelect={() => navigate(`/automations/${a.id}`)}>
                              <Pencil className="mr-2 h-4 w-4 text-gray-500" />
                              Edit
                            </DropdownMenuItem>
                            {a.status === 'live' ? (
                              <DropdownMenuItem onSelect={() => statusMutation.mutate({ id: a.id, status: 'paused' })}>
                                <Pause className="mr-2 h-4 w-4 text-gray-500" />
                                Pause
                              </DropdownMenuItem>
                            ) : a.status === 'paused' ? (
                              <DropdownMenuItem onSelect={() => statusMutation.mutate({ id: a.id, status: 'live' })}>
                                <Play className="mr-2 h-4 w-4 text-gray-500" />
                                Resume
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onSelect={() => duplicate(a)}>
                              <Copy className="mr-2 h-4 w-4 text-gray-500" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setPendingDelete(a)} className="text-red-600 focus:text-red-700">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="w-[min(92vw,26rem)]">
          <DialogHeader>
            <DialogTitle>Delete this automation?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.name}” and its run history will be removed. Contacts part-way through it won&apos;t receive the remaining steps.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setPendingDelete(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BadgeDollarSign,
  CircleDollarSign,
  GraduationCap,
  RefreshCw,
  Target,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { adsApi } from '../../lib/api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { cn } from '../../lib/utils';

/* ── Dates ─────────────────────────────────────────────────────────────── */

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const PRESETS = [
  { key: '7d', label: '7 days', range: () => ({ since: iso(daysAgo(6)), until: iso(new Date()) }) },
  { key: '30d', label: '30 days', range: () => ({ since: iso(daysAgo(29)), until: iso(new Date()) }) },
  { key: '90d', label: '90 days', range: () => ({ since: iso(daysAgo(89)), until: iso(new Date()) }) },
  {
    key: 'month',
    label: 'This month',
    range: () => {
      const now = new Date();
      return { since: iso(new Date(now.getFullYear(), now.getMonth(), 1)), until: iso(now) };
    },
  },
  {
    key: 'last-month',
    label: 'Last month',
    range: () => {
      const now = new Date();
      return {
        since: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        until: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
];

/* ── Formatting ────────────────────────────────────────────────────────── */

function useFormatters(currency = 'AUD') {
  return useMemo(() => {
    const money0 = new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 0 });
    const money2 = new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 2 });
    const count = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 });
    return {
      money: (v) => (v == null ? '—' : Math.abs(v) >= 1000 ? money0.format(v) : money2.format(v)),
      count: (v) => (v == null ? '—' : count.format(v)),
      pct: (v) => (v == null ? '—' : `${(v * 100).toFixed(v < 0.1 ? 2 : 1)}%`),
      roas: (v) => (v == null ? '—' : `${v.toFixed(2)}×`),
    };
  }, [currency]);
}

const shortDate = (isoDate, opts = { day: 'numeric', month: 'short' }) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-AU', opts);

/* ── Pieces ────────────────────────────────────────────────────────────── */

function Kpi({ label, value, sub, icon, loading }) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-500">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-tight text-gray-900 tabular-nums">
        {loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-gray-100" /> : value}
      </div>
      <div className="mt-1.5 min-h-4 text-xs text-gray-500">{loading ? '' : sub}</div>
    </div>
  );
}

/** One measure per day as bars, with a tooltip per day. */
function DailyBars({ days, value, format, color, loading, empty }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(0, ...days.map(value));
  if (loading) return <div className="h-44 animate-pulse rounded-lg bg-gray-50" />;
  if (!days.length || max === 0) {
    return <div className="flex h-44 items-center justify-center text-sm text-gray-400">{empty}</div>;
  }
  const ticks = [max, max / 2, 0];
  return (
    <div>
      <div className="flex h-44 gap-3">
        <div className="flex w-12 flex-col justify-between text-right text-[11px] tabular-nums text-gray-400">
          {ticks.map((t, i) => (
            <span key={i}>{format(t)}</span>
          ))}
        </div>
        <div className="relative flex-1">
          {[0, 50, 100].map((p) => (
            <div key={p} className="absolute inset-x-0 border-t border-dashed border-gray-100" style={{ top: `${p}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d, i) => {
              const v = value(d);
              return (
                <div
                  key={d.date}
                  className="relative flex h-full flex-1 flex-col justify-end"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  {v > 0 ? (
                    <div
                      className={cn('w-full rounded-t-[3px]', hover !== null && hover !== i && 'opacity-50')}
                      style={{ height: `${(v / max) * 100}%`, background: color, minHeight: 2 }}
                    />
                  ) : null}
                  {hover === i ? (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-36 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <div className="font-medium text-gray-900">
                        {shortDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="mt-1 tabular-nums text-gray-700">{format(v)}</div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="ml-[60px] mt-2 flex justify-between text-[11px] text-gray-400">
        <span>{shortDate(days[0].date)}</span>
        <span>{shortDate(days[days.length - 1].date)}</span>
      </div>
    </div>
  );
}

function Panel({ title, sub, children, className }) {
  return (
    <section className={cn('rounded-xl border border-gray-200 bg-white p-5', className)}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Table({ columns, rows, empty }) {
  if (!rows.length) return <div className="py-8 text-center text-sm text-gray-400">{empty}</div>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
            {columns.map((c) => (
              <th key={c.key} className={cn('whitespace-nowrap px-5 py-2 font-medium', c.align === 'right' && 'text-right')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key ?? i} className="border-b border-gray-50 last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'whitespace-nowrap px-5 py-2.5 text-gray-700',
                    c.align === 'right' && 'text-right tabular-nums',
                    c.strong && 'font-medium text-gray-900',
                  )}
                >
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export function AdsDashboard() {
  useDocumentTitle('Ads dashboard', 'Ad spend, cost per lead, revenue and ROAS across Meta and TikTok.');
  const [preset, setPreset] = useState('30d');
  const range = useMemo(() => PRESETS.find((p) => p.key === preset).range(), [preset]);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const q = useQuery({
    queryKey: ['ads-overview', range.since, range.until],
    queryFn: () => adsApi.overview(range),
    staleTime: 5 * 60 * 1000,
  });
  const data = q.data;
  const f = useFormatters(data?.currency);
  const t = data?.totals;
  const loading = q.isLoading;

  async function refresh() {
    setRefreshing(true);
    try {
      const fresh = await adsApi.overview({ ...range, refresh: true });
      queryClient.setQueryData(['ads-overview', range.since, range.until], fresh);
    } finally {
      setRefreshing(false);
    }
  }

  const channelColumns = [
    {
      key: 'label',
      label: 'Channel',
      strong: true,
      render: (r) => (
        <span className="flex items-center gap-2">
          {r.label}
          {r.connected === false ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-normal text-gray-500">Not connected</span>
          ) : r.error ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-normal text-amber-700" title={r.error}>
              Couldn&apos;t load
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'spend', label: 'Spend', align: 'right', render: (r) => (r.key === 'other' ? '—' : f.money(r.spend)) },
    { key: 'clicks', label: 'Clicks', align: 'right', render: (r) => (r.key === 'other' ? '—' : f.count(r.clicks)) },
    { key: 'ctr', label: 'CTR', align: 'right', render: (r) => f.pct(r.ctr) },
    { key: 'platform_leads', label: 'Platform leads', align: 'right', render: (r) => (r.key === 'other' ? '—' : f.count(r.platform_leads)) },
    { key: 'crm_leads', label: 'CRM leads', align: 'right', render: (r) => f.count(r.crm_leads) },
    { key: 'cpl', label: 'CPL', align: 'right', render: (r) => f.money(r.cpl) },
    { key: 'enrolments', label: 'Enrolled', align: 'right', render: (r) => f.count(r.enrolments) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => f.money(r.revenue) },
    { key: 'roas', label: 'ROAS', align: 'right', strong: true, render: (r) => f.roas(r.roas) },
  ];

  const campaignColumns = [
    {
      key: 'name',
      label: 'Campaign',
      strong: true,
      render: (r) => (
        <span className="flex max-w-[280px] items-center gap-2">
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
            {r.channel}
          </span>
          <span className="truncate" title={r.name}>
            {r.name}
          </span>
        </span>
      ),
    },
    { key: 'spend', label: 'Spend', align: 'right', render: (r) => f.money(r.spend) },
    { key: 'impressions', label: 'Impressions', align: 'right', render: (r) => f.count(r.impressions) },
    { key: 'ctr', label: 'CTR', align: 'right', render: (r) => f.pct(r.ctr) },
    { key: 'cpc', label: 'CPC', align: 'right', render: (r) => f.money(r.cpc) },
    { key: 'platform_leads', label: 'Platform leads', align: 'right', render: (r) => f.count(r.platform_leads) },
    { key: 'platform_cpl', label: 'Platform CPL', align: 'right', render: (r) => f.money(r.platform_cpl) },
    { key: 'crm_leads', label: 'CRM leads', align: 'right', render: (r) => f.count(r.crm_leads) },
    { key: 'enrolments', label: 'Enrolled', align: 'right', render: (r) => f.count(r.enrolments) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => f.money(r.revenue) },
    { key: 'roas', label: 'ROAS', align: 'right', strong: true, render: (r) => f.roas(r.roas) },
  ];

  const sourceColumns = [
    { key: 'source', label: 'Source in CRM', strong: true },
    { key: 'leads', label: 'Leads', align: 'right', render: (r) => f.count(r.leads) },
    { key: 'enrolments', label: 'Enrolled', align: 'right', render: (r) => f.count(r.enrolments) },
    { key: 'rate', label: 'Conversion', align: 'right', render: (r) => f.pct(r.leads ? r.enrolments / r.leads : null) },
    { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => f.money(r.revenue) },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header + filters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Ads dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Spend from Meta{data?.channels?.find((c) => c.key === 'tiktok')?.connected ? ' and TikTok' : ''}; leads, enrolments
            and revenue from your CRM for leads created in this period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  preset === p.key ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {q.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load the dashboard: {q.error?.message}
        </div>
      ) : null}

      {(data?.notes || []).concat(
        (data?.channels || []).filter((c) => c.error).map((c) => `${c.label}: ${c.error}`),
      ).map((note) => (
        <div key={note} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {note}
        </div>
      ))}

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Ad spend" icon={CircleDollarSign} loading={loading} value={f.money(t?.spend)}
          sub={t ? `${f.count(t.impressions)} impressions · CTR ${f.pct(t.ctr)}` : ''} />
        <Kpi label="Leads (CRM)" icon={UserPlus} loading={loading} value={f.count(t?.crm_leads)}
          sub={t ? `${f.count(t.platform_leads)} counted by the ad platforms` : ''} />
        <Kpi label="Cost per lead" icon={Target} loading={loading} value={f.money(t?.cpl)}
          sub={t ? `Platform CPL ${f.money(t.platform_cpl)}` : ''} />
        <Kpi label="Enrolments" icon={GraduationCap} loading={loading} value={f.count(t?.enrolments)}
          sub={t ? `${f.pct(t.conversion_rate)} of leads · ${f.money(t.cost_per_enrolment)} each` : ''} />
        <Kpi label="Revenue" icon={BadgeDollarSign} loading={loading} value={f.money(t?.revenue)}
          sub={data?.revenue_field ? `From “${data.revenue_field}” in the CRM` : 'No amount field found'} />
        <Kpi label="ROAS" icon={TrendingUp} loading={loading} value={f.roas(t?.roas)}
          sub="Revenue ÷ ad spend" />
      </div>

      {/* Trends */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Ad spend per day" sub={`${shortDate(range.since)} – ${shortDate(range.until)}`}>
          <DailyBars days={data?.daily || []} value={(d) => d.spend} format={f.money} color="#2563EB"
            loading={loading} empty="No ad spend in this period" />
        </Panel>
        <Panel title="New leads per day" sub="Leads added to the CRM, every source">
          <DailyBars days={data?.daily || []} value={(d) => d.crm_leads} format={f.count} color="#25D366"
            loading={loading} empty="No leads in this period" />
        </Panel>
      </div>

      <Panel title="By channel" sub="CPL and ROAS use CRM leads and revenue; platform leads are what Meta or TikTok report">
        <Table columns={channelColumns} rows={(data?.channels || []).map((c) => ({ ...c, key: c.key }))}
          empty={loading ? 'Loading…' : 'No data'} />
      </Panel>

      <Panel title="Campaigns" sub="CRM leads are matched to a campaign by the Campaign ID or Campaign Name saved on the lead">
        <Table columns={campaignColumns}
          rows={(data?.campaigns || []).map((c) => ({ ...c, key: `${c.channel}-${c.id}` }))}
          empty={loading ? 'Loading…' : 'No campaigns spent money in this period'} />
      </Panel>

      <Panel title="Lead sources" sub="Every lead in the CRM for this period, by its SOURCE field">
        <Table columns={sourceColumns} rows={(data?.sources || []).map((s) => ({ ...s, key: s.source }))}
          empty={loading ? 'Loading…' : 'No leads in this period'} />
      </Panel>

      {data ? (
        <p className="text-xs text-gray-400">
          {data.meta_accounts?.length ? `Meta ad accounts: ${data.meta_accounts.join(', ')}. ` : ''}
          Updated {new Date(data.generated_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}; figures are
          kept for 5 minutes, Refresh fetches them again.
        </p>
      ) : null}
    </div>
  );
}

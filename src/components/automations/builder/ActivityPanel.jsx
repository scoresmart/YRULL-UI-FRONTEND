import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Loader2, Play, RefreshCw, Square, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatPhone, formatRelativeTime } from '../../../lib/utils';
import { automationsApi } from '../../../lib/api';
import { useContacts } from '../../../lib/dataHooks';
import { ACTIONS_BY_TYPE, TRIGGERS_BY_TYPE } from './catalog';

const RUN_STATUS = {
  running: { label: 'Running', icon: Loader2, cls: 'bg-blue-50 text-blue-700', spin: true },
  waiting: { label: 'Waiting', icon: Clock, cls: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700' },
  error: { label: 'Failed', icon: XCircle, cls: 'bg-red-50 text-red-700' },
  stopped: { label: 'Stopped', icon: Square, cls: 'bg-gray-100 text-gray-600' },
};

const LOG_DOT = { success: 'bg-emerald-500', error: 'bg-red-500', skipped: 'bg-gray-300' };

const asList = (data, key) => (Array.isArray(data) ? data : data?.[key] ?? data?.data ?? []);

function RunLogs({ automationId, runId, nodes }) {
  const logsQ = useQuery({
    queryKey: ['automation_logs', automationId],
    queryFn: () => automationsApi.getLogs(automationId, 300),
    select: (d) => asList(d, 'logs'),
    staleTime: 10_000,
  });
  const labelFor = (log) => {
    const node = nodes.find((n) => n.id === log.node_id);
    if (log.node_type === 'trigger' || node?.type === 'trigger') {
      return TRIGGERS_BY_TYPE[node?.data?.triggerType]?.label || 'Trigger';
    }
    return ACTIONS_BY_TYPE[log.action_type || node?.data?.actionType]?.label || log.action_type || 'Step';
  };
  const logs = (logsQ.data || [])
    .filter((l) => l.run_id === runId)
    .sort((a, b) => new Date(a.executed_at) - new Date(b.executed_at));

  if (logsQ.isLoading) return <div className="px-4 pb-3 text-xs text-gray-400">Loading steps…</div>;
  if (!logs.length) return <div className="px-4 pb-3 text-xs text-gray-400">No step details recorded.</div>;
  return (
    <ol className="space-y-2 px-4 pb-3">
      {logs.map((log) => (
        <li key={log.id} className="flex gap-2.5">
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', LOG_DOT[log.status] || 'bg-gray-300')} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-gray-800">
              {labelFor(log)}
              {log.status !== 'success' ? <span className="ml-1.5 text-xs font-normal capitalize text-gray-500">· {log.status}</span> : null}
            </div>
            {log.detail ? <div className="break-words text-xs text-gray-500">{log.detail}</div> : null}
            {log.error ? <div className="break-words text-xs text-red-600">{log.error}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Recent runs of this automation, their step-by-step log, and a manual run. */
export function ActivityPanel({ automationId, status, nodes, onClose }) {
  const queryClient = useQueryClient();
  const contactsQ = useContacts();
  const [openRun, setOpenRun] = useState(null);
  const [runFor, setRunFor] = useState('');
  const [starting, setStarting] = useState(false);

  const runsQ = useQuery({
    queryKey: ['automation_runs', automationId],
    queryFn: () => automationsApi.getRuns(automationId, 50),
    select: (d) => asList(d, 'runs'),
    enabled: Boolean(automationId),
    refetchInterval: 15_000,
  });

  const nameOf = useMemo(() => {
    const map = new Map((contactsQ.data || []).map((c) => [c.wa_id, c.name]));
    return (waId) => map.get(waId) || (String(waId).includes('@') ? waId : formatPhone(waId));
  }, [contactsQ.data]);

  const stopRun = async (runId) => {
    try {
      await automationsApi.stopRun(runId);
      toast.success('Run stopped');
      queryClient.invalidateQueries({ queryKey: ['automation_runs', automationId] });
    } catch (err) {
      toast.error(err.message || 'Could not stop the run');
    }
  };

  const runNow = async () => {
    if (!runFor) return;
    const who = nameOf(runFor);
    if (!window.confirm(`Run this automation for ${who} now? Real messages will be sent.`)) return;
    setStarting(true);
    try {
      await automationsApi.trigger(automationId, runFor);
      toast.success(`Started for ${who}`);
      setRunFor('');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['automation_runs', automationId] });
        queryClient.invalidateQueries({ queryKey: ['automation_logs', automationId] });
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Could not start the run');
    } finally {
      setStarting(false);
    }
  };

  const runs = runsQ.data || [];

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Automation</div>
          <div className="text-base font-semibold text-gray-900">Activity</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              runsQ.refetch();
              queryClient.invalidateQueries({ queryKey: ['automation_logs', automationId] });
            }}
            aria-label="Refresh"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <RefreshCw className={cn('h-4 w-4', runsQ.isFetching && 'animate-spin')} />
          </button>
          <button type="button" onClick={onClose} aria-label="Close activity" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!automationId ? (
        <div className="p-6 text-center text-sm text-gray-500">Save this automation to see its activity.</div>
      ) : (
        <>
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="text-[13px] font-medium text-gray-700">Run for a contact</div>
            {status === 'live' ? (
              <div className="mt-2 flex gap-2">
                <select
                  value={runFor}
                  onChange={(e) => setRunFor(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#25D366] focus:outline-none focus:ring-2 focus:ring-[#25D366]/20"
                >
                  <option value="">Choose a contact</option>
                  {(contactsQ.data || []).map((c) => (
                    <option key={c.wa_id} value={c.wa_id}>
                      {c.name ? `${c.name} · ${formatPhone(c.wa_id)}` : formatPhone(c.wa_id)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={runNow}
                  disabled={!runFor || starting}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
                >
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-500">Set the automation live to run it for a real contact. Use Test for a dry run.</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {runsQ.isLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading runs…
              </div>
            ) : runsQ.isError ? (
              <div className="m-5 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {runsQ.error?.message || 'Could not load runs'}
              </div>
            ) : !runs.length ? (
              <div className="px-6 py-12 text-center">
                <div className="text-sm font-medium text-gray-700">No runs yet</div>
                <div className="mt-1 text-xs text-gray-500">Runs appear here each time this automation is triggered.</div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {runs.map((run) => {
                  const st = RUN_STATUS[run.status] || RUN_STATUS.completed;
                  const Icon = st.icon;
                  const open = openRun === run.id;
                  return (
                    <li key={run.id}>
                      <button type="button" onClick={() => setOpenRun(open ? null : run.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-50">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">{nameOf(run.wa_id)}</div>
                          <div className="text-xs text-gray-500">
                            {formatRelativeTime(run.started_at)}
                            {run.status === 'waiting' && run.resume_at ? ` · resumes ${formatRelativeTime(run.resume_at)}` : ''}
                          </div>
                        </div>
                        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', st.cls)}>
                          <Icon className={cn('h-3 w-3', st.spin && 'animate-spin')} />
                          {st.label}
                        </span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
                      </button>
                      {open ? (
                        <div className="bg-gray-50/60 pt-2">
                          <RunLogs automationId={automationId} runId={run.id} nodes={nodes} />
                          {['running', 'waiting'].includes(run.status) ? (
                            <div className="px-4 pb-3">
                              <button type="button" onClick={() => stopRun(run.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">
                                <Square className="h-3 w-3" />
                                Stop this run
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

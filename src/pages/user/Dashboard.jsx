import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MessageCircle, Zap, BarChart3, Users, ArrowUpRight, ArrowDownRight,
  Plug, Reply, Workflow, UserPlus, CheckCircle2, Circle, Instagram,
  Phone, ExternalLink, TrendingUp,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { useContacts, useAutomations, useActivityLogs } from '../../lib/dataHooks';
import { analyticsApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatRelativeTime, cn } from '../../lib/utils';
import { ENV } from '../../lib/env';

function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </Card>
  );
}

function StatCard({ label, value, delta, deltaLabel, icon: Icon, accent }) {
  const isUp = delta > 0;
  const isDown = delta < 0;
  return (
    <Card className={cn('p-5 transition-transform duration-150 hover:scale-[1.01]', accent && 'border-green-100')}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">{value ?? '—'}</div>
          {deltaLabel && (
            <div className="mt-1 flex items-center gap-1 text-xs">
              {isUp && <ArrowUpRight className="h-3 w-3 text-green-500" />}
              {isDown && <ArrowDownRight className="h-3 w-3 text-red-500" />}
              <span className={isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-gray-500'}>{deltaLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <Icon className="h-5 w-5 text-gray-500" />
          </div>
        )}
      </div>
    </Card>
  );
}

const EVENT_ICONS = {
  message: MessageCircle,
  automation: Zap,
  comment: Reply,
  contact: Users,
  call: Phone,
  default: Circle,
};

function ActivityItem({ item }) {
  const navigate = useNavigate();
  const Icon = EVENT_ICONS[item.event_type] || EVENT_ICONS.default;
  const text = item.description || item.message || `${item.event_type} event`;

  return (
    <button
      type="button"
      onClick={() => {
        if (item.link) navigate(item.link);
      }}
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
    >
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
        <Icon className="h-3.5 w-3.5 text-gray-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700 line-clamp-2">{text}</p>
        <p className="mt-0.5 text-[11px] text-gray-400">{formatRelativeTime(item.created_at || item.timestamp)}</p>
      </div>
    </button>
  );
}

function GettingStartedChecklist({ contacts, automations, profile }) {
  const hasChannel = Boolean(profile?.workspace?.onboarded);
  const hasConversation = (contacts ?? []).length > 0;
  const hasAutomation = (automations ?? []).length > 0;
  const hasTeam = false; // would need member count

  const items = [
    { done: hasChannel, label: 'Connect your first channel', link: '/integrations', icon: Plug },
    { done: hasConversation, label: 'Reply to your first message', link: '/whatsapp', icon: Reply },
    { done: hasAutomation, label: 'Create your first automation', link: '/automations', icon: Workflow },
    { done: hasTeam, label: 'Invite a team member', link: '/settings', icon: UserPlus },
  ];

  const completed = items.filter((i) => i.done).length;
  if (completed >= items.length) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">Getting started</div>
        <Badge variant="muted">{completed}/{items.length}</Badge>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(completed / items.length) * 100}%` }} />
      </div>
      <div className="mt-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.link}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                item.done ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 flex-shrink-0 text-gray-300" />
              )}
              <span className={item.done ? 'line-through' : ''}>{item.label}</span>
              {!item.done && (
                <span className="ml-auto text-xs font-medium text-green-600">Do it now</span>
              )}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);

  const contactsQ = useContacts();
  const automationsQ = useAutomations();
  const activityQ = useActivityLogs({ limit: 20 });

  const dashQ = useQuery({
    queryKey: ['dashboard_analytics'],
    queryFn: () => ENV.USE_MOCK
      ? {
          conversations_today: contactsQ.data?.length ?? 0,
          messages_today: 0,
          active_automations: (automationsQ.data ?? []).filter((a) => a.is_active).length,
          response_rate: 0,
          delta_conversations: 0,
          delta_messages: 0,
        }
      : analyticsApi.getDashboard().catch(() => null),
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (dashQ.data) return dashQ.data;
    const contacts = contactsQ.data?.length ?? 0;
    const activeAutos = (automationsQ.data ?? []).filter((a) => a.is_active).length;
    return {
      conversations_today: contacts,
      messages_today: 0,
      active_automations: activeAutos,
      response_rate: 0,
      delta_conversations: 0,
      delta_messages: 0,
    };
  }, [dashQ.data, contactsQ.data, automationsQ.data]);

  const topAutomations = useMemo(() => {
    return (automationsQ.data ?? [])
      .filter((a) => a.is_active)
      .slice(0, 5);
  }, [automationsQ.data]);

  const isLoading = contactsQ.isLoading && automationsQ.isLoading;
  const hasData = (contactsQ.data?.length ?? 0) > 0 || (automationsQ.data?.length ?? 0) > 0;
  const isNew = (contactsQ.data?.length ?? 0) < 3;

  if (contactsQ.error && automationsQ.error) {
    return <ErrorState title="Failed to load dashboard" description="We couldn't fetch your data." onRetry={() => { contactsQ.refetch(); automationsQ.refetch(); }} />;
  }

  if (!isLoading && !hasData) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Plug}
          title="Welcome to Yrull! Let's get your inbox running."
          description="Connect your first channel to start receiving and managing customer conversations."
          actionLabel="Connect your first channel"
          actionHref="/integrations"
        />
        <GettingStartedChecklist contacts={contactsQ.data} automations={automationsQ.data} profile={profile} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>{[1,2,3,4].map((i) => <StatCardSkeleton key={i} />)}</>
        ) : (
          <>
            <StatCard
              label="Conversations today"
              value={stats.conversations_today}
              delta={stats.delta_conversations}
              deltaLabel={stats.delta_conversations ? `${stats.delta_conversations > 0 ? '+' : ''}${stats.delta_conversations} vs yesterday` : 'vs yesterday'}
              icon={MessageCircle}
            />
            <StatCard
              label="Messages sent today"
              value={stats.messages_today}
              delta={stats.delta_messages}
              deltaLabel={stats.delta_messages ? `${stats.delta_messages > 0 ? '+' : ''}${stats.delta_messages}% vs yesterday` : 'vs yesterday'}
              icon={TrendingUp}
            />
            <StatCard
              label="Active automations"
              value={stats.active_automations}
              icon={Zap}
              accent
            />
            <StatCard
              label="Response rate (7d)"
              value={stats.response_rate ? `${stats.response_rate}%` : '—'}
              icon={BarChart3}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main column */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {/* Getting started checklist for new workspaces */}
          {isNew && (
            <GettingStartedChecklist contacts={contactsQ.data} automations={automationsQ.data} profile={profile} />
          )}

          {/* Top automations */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Top Automations</div>
              <Link to="/automations" className="text-xs font-medium text-green-600 hover:text-green-700">View all</Link>
            </div>
            {automationsQ.isLoading ? (
              <div className="mt-4 space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : topAutomations.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={Workflow}
                  title="No automations yet"
                  description="Create your first automation to save time on repetitive tasks."
                  actionLabel="Create automation"
                  actionHref="/automations"
                />
              </div>
            ) : (
              <div className="mt-4 divide-y divide-gray-100">
                {topAutomations.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate(`/automations/${a.id}`)}
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                        <Zap className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{a.name}</div>
                        <div className="text-xs text-gray-400">{a.trigger_type || 'Manual trigger'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.is_active ? 'success' : 'muted'}>{a.is_active ? 'Active' : 'Paused'}</Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-gray-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column — Activity */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="p-5">
            <div className="text-sm font-semibold text-gray-900">Recent Activity</div>
            <div className="mt-1 text-xs text-gray-400">Latest events in your workspace</div>

            {activityQ.isLoading ? (
              <div className="mt-4 space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !activityQ.data?.length ? (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 p-6 text-center">
                <Circle className="mx-auto h-6 w-6 text-gray-300" />
                <p className="mt-2 text-xs text-gray-400">No activity yet. Events will appear here as you use Yrull.</p>
              </div>
            ) : (
              <div className="mt-3 -mx-3 max-h-[400px] space-y-0.5 overflow-y-auto">
                {(activityQ.data ?? []).slice(0, 20).map((item, i) => (
                  <ActivityItem key={item.id || i} item={item} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

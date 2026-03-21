import { useMemo } from 'react';
import { Badge } from '../../components/ui/badge';
import { StatCard } from '../../components/dashboard/StatCard';
import { AutomationsTable } from '../../components/dashboard/AutomationsTable';
import { RulesTable } from '../../components/dashboard/RulesTable';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { useActivityLogs, useAutomations, useContacts, useRules } from '../../lib/dataHooks';

export function DashboardPage() {
  const contactsQ = useContacts();
  const automationsQ = useAutomations();
  const rulesQ = useRules();
  const activityQ = useActivityLogs({ limit: 20 });

  const stats = useMemo(() => {
    const contacts = contactsQ.data?.length ?? 0;
    const openConversations = contacts; // Using contacts count as placeholder
    const needsAttention = 0; // placeholder - can be calculated from unread messages if needed
    const runningAutos = (automationsQ.data ?? []).filter((a) => a.is_active).length;
    const sentToday = 147; // placeholder per spec
    return { contacts, openConversations, needsAttention, runningAutos, sentToday };
  }, [contactsQ.data, automationsQ.data]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 grid grid-cols-4 gap-6">
        <StatCard
          label="Active Automations"
          value={stats.runningAutos}
          subLabel="Running"
          right={<Badge variant="success">● Running</Badge>}
          accent
        />
        <StatCard label="Total Contacts" value={stats.contacts} subLabel="+12 this week" />
        <StatCard label="Messages Sent Today" value={stats.sentToday} subLabel="↑ 8% vs yesterday" />
        <StatCard
          label="Open Conversations"
          value={stats.openConversations}
          subLabel={stats.needsAttention > 0 ? `${stats.needsAttention} need attention` : 'All caught up'}
        />
      </div>

      <div className="col-span-8 space-y-6">
        <AutomationsTable data={automationsQ.data} isLoading={automationsQ.isLoading} />
        <RulesTable data={rulesQ.data} isLoading={rulesQ.isLoading} />
      </div>

      <div className="col-span-4">
        <ActivityFeed data={activityQ.data} isLoading={activityQ.isLoading} />
      </div>
    </div>
  );
}


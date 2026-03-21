import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { StatCard } from '../../components/dashboard/StatCard';
import { useActivityLogs, useAutomations, useProfiles } from '../../lib/dataHooks';

export function AdminDashboardPage() {
  const profilesQ = useProfiles({ limit: 10 });
  const activityQ = useActivityLogs({ limit: 15 });
  const automationsQ = useAutomations();

  const stats = useMemo(() => {
    const totalUsers = profilesQ.data?.length ?? 0;
    const activeConvos = 0; // placeholder - can be calculated from whatsapp_contacts if needed
    const messagesToday = 892; // placeholder
    const activeAutomations = (automationsQ.data ?? []).filter((a) => a.is_active).length;
    return { totalUsers, activeConvos, messagesToday, activeAutomations };
  }, [profilesQ.data, automationsQ.data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Active Conversations" value={stats.activeConvos} />
        <StatCard label="Messages Today" value={stats.messagesToday} />
        <StatCard label="Active Automations" value={stats.activeAutomations} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900">Recent Users</div>
              <div className="mt-1 text-sm text-gray-500">Latest profiles in this workspace.</div>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          {profilesQ.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(profilesQ.data ?? []).map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === 'admin' ? 'success' : 'muted'}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.is_active ? 'success' : 'muted'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" type="button" aria-label="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="col-span-4">
          <ActivityFeed data={activityQ.data} isLoading={activityQ.isLoading} />
        </div>
      </div>
    </div>
  );
}


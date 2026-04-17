import { useMemo, useState } from 'react';
import { PhoneIncoming, PhoneOutgoing, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { whatsappApi } from '../../lib/api';
import { useContacts } from '../../lib/dataHooks';
import { formatPhone, formatRelativeTime, cn, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/EmptyState';

const CALL_TYPES = {
  all: 'All Calls',
  incoming: 'Incoming',
  outgoing: 'Outgoing',
  missed: 'Missed',
};

export function CallLogsPage() {
  const [filter, setFilter] = useState('all');
  const contactsQ = useContacts();

  // Fetch all call history
  const callsQ = useQuery({
    queryKey: ['whatsapp_calls_all', filter],
    queryFn: () => whatsappApi.getCallHistory({ limit: 100 }),
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Filter and sort calls
  const filteredCalls = useMemo(() => {
    if (!callsQ.data) return [];

    let calls = [...callsQ.data];

    // Apply filter
    if (filter === 'incoming') {
      calls = calls.filter((c) => c.direction === 'USER_INITIATED');
    } else if (filter === 'outgoing') {
      calls = calls.filter((c) => c.direction === 'BUSINESS_INITIATED');
    } else if (filter === 'missed') {
      calls = calls.filter(
        (c) =>
          c.direction === 'USER_INITIATED' &&
          (c.status === 'MISSED' || c.event === 'missed' || (c.status !== 'ACCEPTED' && c.event !== 'connect'))
      );
    }

    // Sort by most recent first
    return calls.sort(
      (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0)
    );
  }, [callsQ.data, filter]);

  // Get contact info for a phone number
  const getContactInfo = (phoneNumber) => {
    return (contactsQ.data ?? []).find((c) => c.wa_id === phoneNumber || c.phone === phoneNumber) ?? null;
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Get call status badge
  const getCallStatus = (call) => {
    if (call.status === 'MISSED' || call.event === 'missed') {
      return { label: 'Missed', variant: 'destructive' };
    }
    if (call.status === 'ACCEPTED' || call.event === 'connect') {
      return { label: 'Connected', variant: 'success' };
    }
    if (call.status === 'RINGING' || call.event === 'ringing') {
      return { label: 'Ringing', variant: 'default' };
    }
    if (call.status === 'ENDED' || call.event === 'disconnect') {
      return { label: 'Ended', variant: 'default' };
    }
    return { label: call.status || call.event || 'Unknown', variant: 'default' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold text-gray-900">Call Logs</div>
          <div className="mt-1 text-sm text-gray-500">View all incoming, outgoing, and missed calls</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {Object.entries(CALL_TYPES).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              filter === key
                ? 'border-brand-accent text-brand-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Calls Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {callsQ.isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Phone}
              title={filter === 'all' ? 'No calls yet' : `No ${CALL_TYPES[filter].toLowerCase()} calls`}
              description="WhatsApp call logs will appear here when customers call your business number."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCalls.map((call) => {
                  const isIncoming = call.direction === 'USER_INITIATED';
                  const phoneNumber = isIncoming ? call.from_number : call.to_number;
                  const contact = getContactInfo(phoneNumber);
                  const contactName = contact?.name || formatPhone(phoneNumber) || 'Unknown';
                  const contactPhone = formatPhone(phoneNumber);
                  const avatarCls = pastelClassFromString(phoneNumber || '');
                  const status = getCallStatus(call);
                  const isMissed = call.status === 'MISSED' || call.event === 'missed';

                  return (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold', avatarCls)}>
                            {initialsFromName(contactName)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{contactName}</div>
                            <div className="text-xs text-gray-500">{contactPhone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isIncoming ? (
                            <PhoneIncoming className={cn('h-4 w-4', isMissed ? 'text-red-500' : 'text-blue-500')} />
                          ) : (
                            <PhoneOutgoing className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm text-gray-900">{isIncoming ? 'Incoming' : 'Outgoing'}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge variant={status.variant === 'success' ? 'success' : status.variant === 'destructive' ? 'danger' : 'default'}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatRelativeTime(call.created_at || call.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {callsQ.data && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Total Calls</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{callsQ.data.length}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Incoming</div>
            <div className="mt-1 text-2xl font-semibold text-blue-600">
              {callsQ.data.filter((c) => c.direction === 'USER_INITIATED').length}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Outgoing</div>
            <div className="mt-1 text-2xl font-semibold text-green-600">
              {callsQ.data.filter((c) => c.direction === 'BUSINESS_INITIATED').length}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm text-gray-500">Missed</div>
            <div className="mt-1 text-2xl font-semibold text-red-600">
              {callsQ.data.filter(
                (c) =>
                  c.direction === 'USER_INITIATED' &&
                  (c.status === 'MISSED' || c.event === 'missed' || (c.status !== 'ACCEPTED' && c.event !== 'connect'))
              ).length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

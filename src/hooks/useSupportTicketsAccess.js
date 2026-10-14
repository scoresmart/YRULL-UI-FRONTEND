import { useQuery } from '@tanstack/react-query';
import { supportTicketsApi } from '../lib/supportTicketsApi';

/** Whether the signed-in user is an LMS admin and can work the LMS support queue. */
export function useSupportTicketsAccess() {
  const q = useQuery({
    queryKey: ['support-tickets-access'],
    queryFn: supportTicketsApi.access,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  return { allowed: Boolean(q.data?.allowed), loading: q.isLoading };
}

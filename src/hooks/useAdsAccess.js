import { useQuery } from '@tanstack/react-query';
import { adsApi } from '../lib/api';

/** Whether this workspace gets the ads dashboard (only Score Smart's does). */
export function useAdsAccess() {
  const q = useQuery({
    queryKey: ['ads-access'],
    queryFn: adsApi.access,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  return { allowed: Boolean(q.data?.allowed), loading: q.isLoading };
}

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { session, profile, status, hydrate, fetchProfile, logout } = useAuthStore();

  useEffect(() => {
    if (status === 'idle') {
      hydrate();
    }
  }, [status, hydrate]);

  useEffect(() => {
    if (status === 'authed' && !profile) {
      fetchProfile();
    }
  }, [status, profile, fetchProfile]);

  return { session, profile, status, logout };
}

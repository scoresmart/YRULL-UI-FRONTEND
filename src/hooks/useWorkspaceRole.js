import { useAuthStore } from '../store/authStore';

export function useWorkspaceRole() {
  const profile = useAuthStore((s) => s.profile);
  const role = profile?.role || 'user';

  return {
    role,
    isOwner: role === 'owner' || role === 'admin',
    isAdmin: role === 'admin' || role === 'owner',
    isAgent: role === 'user' || role === 'agent',
    canManageTeam: role === 'admin' || role === 'owner',
    canManageBilling: role === 'owner',
    canDeleteWorkspace: role === 'owner',
  };
}

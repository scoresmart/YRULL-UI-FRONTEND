import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, Users, Tags, Target, Settings, LogOut, Phone, Workflow, Plug, Instagram } from 'lucide-react';
import { cn, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/instagram', label: 'Instagram', icon: Instagram },
  { to: '/call-logs', label: 'Call Logs', icon: Phone },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/tags', label: 'Tags', icon: Tags },
  { to: '/audiences', label: 'Audiences', icon: Target },
  { to: '/automations', label: 'Automations', icon: Workflow },
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);

  const name = profile?.full_name ?? 'Team Member';
  const email = profile?.email ?? 'user@company.com';
  const avatarCls = pastelClassFromString(email);

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-brand-sidebar text-brand-sidebarText">
      <div className="flex h-full flex-col">
        <div className="px-5 pt-6">
          <div className="text-lg font-bold tracking-tight text-white">FlowDesk</div>
          <div className="mt-1 text-xs text-gray-400">{profile?.workspace?.name ?? 'My Workspace'}</div>
        </div>

        <nav className="mt-6 flex-1 space-y-1 px-2">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#E5E5E5] transition-colors duration-150 hover:bg-[#1A1A1A]',
                    isActive && 'bg-[#1A1A1A] text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={cn(
                        'h-8 w-1 rounded-full',
                        isActive ? 'bg-white' : 'bg-transparent group-hover:bg-white/20',
                      )}
                    />
                    <Icon className="h-4 w-4 opacity-90" />
                    <span className="font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold', avatarCls)}>
              {initialsFromName(name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{name}</div>
              <div className="truncate text-xs text-gray-400">{email}</div>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-[#1A1A1A] hover:text-red-400"
              aria-label="Logout"
              type="button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}


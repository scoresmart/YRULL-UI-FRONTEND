import { NavLink } from 'react-router-dom';
import { Activity, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import { BrandMark } from '../brand/BrandMark';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin?tab=users', label: 'Users', icon: Users },
  { to: '/admin?tab=activity', label: 'Activity Log', icon: Activity },
  { to: '/admin?tab=settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-brand-sidebar text-brand-sidebarText">
      <div className="flex h-full flex-col">
        <div className="px-5 pt-6">
          <BrandMark variant="dark" className="text-lg" />
          <div className="mt-1 text-xs text-gray-400">Admin</div>
        </div>

        <nav className="mt-6 flex-1 space-y-1 px-2">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
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
          <button
            onClick={logout}
            type="button"
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-200 transition-colors hover:bg-[#1A1A1A] hover:text-red-400"
          >
            <span>Logout</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}


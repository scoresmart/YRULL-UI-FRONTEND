import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, MessageSquare, Users, Tags, Target, Settings, LogOut, Phone, Workflow, Plug, Instagram, Loader2, Megaphone, X } from 'lucide-react';
import { BrandMark } from '../brand/BrandMark';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useSidebar } from './SidebarContext';
import { cn, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useIsDesktop } from '../../hooks/useMediaQuery';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/instagram', label: 'Instagram', icon: Instagram },
  { to: '/comments', label: 'Comments', icon: MessageSquare },
  { to: '/call-logs', label: 'Call Logs', icon: Phone },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/tags', label: 'Tags', icon: Tags },
  { to: '/audiences', label: 'Audiences', icon: Target },
  { to: '/automations', label: 'Automations', icon: Workflow },
  { to: '/broadcasts', label: 'Broadcasts', icon: Megaphone },
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const { open, close } = useSidebar();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (!isDesktop) close();
  }, [location.pathname, isDesktop, close]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  }

  const name = profile?.full_name ?? 'Team Member';
  const email = profile?.email ?? 'user@company.com';
  const avatarCls = pastelClassFromString(email);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-6">
        <BrandMark variant="dark" className="text-lg" />
        {!isDesktop && (
          <button type="button" onClick={close} className="rounded-lg p-2 text-gray-400 hover:bg-[#1A1A1A] hover:text-white lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="mt-2 px-2">
        <WorkspaceSwitcher />
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-2">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => { if (!isDesktop) close(); }}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#E5E5E5] transition-colors duration-150 hover:bg-[#1A1A1A]',
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
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-[#1A1A1A] hover:text-red-400 disabled:opacity-50"
            aria-label="Logout"
            type="button"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-[260px] bg-brand-sidebar text-brand-sidebarText">
        {sidebarContent}
      </aside>
    );
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity" onClick={close} />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-[280px] bg-brand-sidebar text-brand-sidebarText transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

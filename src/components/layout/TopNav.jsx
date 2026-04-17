import { Bell, ChevronDown, LogOut, Settings as SettingsIcon, User, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSidebar } from './SidebarContext';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { initialsFromName, pastelClassFromString, cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { usePageTitle } from './PageWrapper';

export function TopNav() {
  const title = usePageTitle();
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const { toggle } = useSidebar();
  const isDesktop = useIsDesktop();

  const name = profile?.full_name ?? 'Team Member';
  const email = profile?.email ?? 'user@company.com';
  const avatarCls = pastelClassFromString(email);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-brand-border bg-white sm:h-16">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {!isDesktop && (
            <button type="button" onClick={toggle} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="truncate text-base font-semibold text-gray-900 sm:text-lg">{title}</div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-accent" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold', avatarCls)}>
                  {initialsFromName(name)}
                </div>
                <div className="hidden max-w-[200px] text-left sm:block">
                  <div className="truncate text-sm font-medium text-gray-900">{name}</div>
                  <div className="truncate text-xs text-gray-500">{email}</div>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-gray-500 sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <User className="h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <SettingsIcon className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={(e) => {
                  e.preventDefault();
                  logout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

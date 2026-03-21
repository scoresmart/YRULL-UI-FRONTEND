import { Bell, ChevronDown, LogOut, Settings as SettingsIcon, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
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

  const name = profile?.full_name ?? 'Team Member';
  const email = profile?.email ?? 'user@company.com';
  const avatarCls = pastelClassFromString(email);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-brand-border bg-white">
      <div className="flex h-full items-center justify-between px-8">
        <div className="text-lg font-semibold text-gray-900">{title}</div>

        <div className="flex items-center gap-3">
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
                <div className="max-w-[200px] text-left">
                  <div className="truncate text-sm font-medium text-gray-900">{name}</div>
                  <div className="truncate text-xs text-gray-500">{email}</div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
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


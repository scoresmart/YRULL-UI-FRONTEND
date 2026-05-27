import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { cn } from '../../lib/utils';

function UserLayoutContent() {
  const { collapsed } = useSidebar();
  return (
    <div className={cn('min-h-screen transition-all duration-300', collapsed ? 'lg:ml-16' : 'lg:ml-[260px]')}>
      <TopNav />
      <main className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function UserLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <UserLayoutContent />
      </div>
    </SidebarProvider>
  );
}

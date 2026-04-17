import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { SidebarProvider } from './SidebarContext';

export function UserLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="min-h-screen lg:ml-[260px]">
          <TopNav />
          <main className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

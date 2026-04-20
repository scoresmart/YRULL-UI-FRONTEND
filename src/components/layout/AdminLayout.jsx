import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { TopNav } from './TopNav';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar />
      <div className="ml-[260px] min-h-screen">
        <TopNav />
        <main className="px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

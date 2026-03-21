import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function UserLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="ml-[260px] min-h-screen">
        <TopNav />
        <main className="px-8 py-8">{<Outlet />}</main>
      </div>
    </div>
  );
}


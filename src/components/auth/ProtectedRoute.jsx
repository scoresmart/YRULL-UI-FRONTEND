import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Skeleton } from '../ui/skeleton';

export function ProtectedRoute({ children, requiredRole }) {
  const { status, session, profile } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-64" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  // Allow access even if profile is null (prevents infinite skeleton)
  // Profile might not exist yet, but we can still render the page
  // The useAuth hook will keep trying to fetch it
  const role = profile?.role ?? 'user';

  // Role-gated routes
  if (requiredRole === 'admin' && role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (requiredRole === 'user' && role === 'admin') return <Navigate to="/admin" replace />;

  return children;
}

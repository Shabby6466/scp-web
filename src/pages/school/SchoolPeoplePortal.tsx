import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_REDIRECT: Record<string, string> = {
  '/school/students': '/admin/students',
  '/school/staff': '/admin/staff',
  '/school/parents': '/admin/parents',
  '/school/branch-directors': '/admin/branch-directors',
};

const LoadingSpinner = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
  </div>
);

/**
 * Shell for school directory pages (/school/students|staff|parents|branch-directors).
 * Only directors and branch directors; admins are sent to the equivalent /admin/* routes.
 */
export default function SchoolPeoplePortal() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (user.role === 'ADMIN') {
    const target = ADMIN_REDIRECT[location.pathname];
    if (target) {
      return <Navigate to={target} replace />;
    }
    return <Navigate to="/admin" replace />;
  }

  if (user.role !== 'DIRECTOR' && user.role !== 'BRANCH_DIRECTOR') {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold mb-1">School directory</h1>
        <p className="text-muted-foreground text-sm">
          Manage students, staff, parents, and branch directors for your school. Use the sidebar to
          switch lists.
        </p>
      </div>
      <Outlet />
    </div>
  );
}

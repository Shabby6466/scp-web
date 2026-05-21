import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SCHOOL_TO_ADMIN_PEOPLE } from '@/routes/appRoutes';

const LoadingSpinner = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
  </div>
);

/**
 * Shell for school directory pages (/school/people/*).
 * Only directors and branch directors; admins are sent to the equivalent /admin/people/* routes.
 */
export default function SchoolPeoplePortal() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const pathKey = location.pathname.replace(/\/$/, '') || '/';

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (user.role === 'ADMIN') {
    const target = SCHOOL_TO_ADMIN_PEOPLE[pathKey];
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

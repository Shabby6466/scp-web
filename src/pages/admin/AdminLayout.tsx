import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const TAB_REDIRECTS: Record<string, string> = {
  overview: '/admin',
  students: '/admin/students',
  parents: '/admin/parents',
  teachers: '/admin/staff',
  schools: '/admin/schools',
  directors: '/admin/directors',
  'branch-directors': '/admin/branch-directors',
  documents: '/admin/documents',
  reminders: '/admin/reminders',
};

/**
 * Shared chrome for platform admin area; child routes render in the outlet.
 */
const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onOverview =
      location.pathname === '/admin' || location.pathname === '/admin/';
    if (!onOverview) return;
    const tab = new URLSearchParams(location.search).get('tab');
    if (!tab) return;
    const target = TAB_REDIRECTS[tab];
    if (target) {
      navigate(target, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const hideOverviewChrome = location.pathname === '/admin/settings';

  return (
    <div className="p-6 space-y-6">
      {!hideOverviewChrome && (
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Manage schools, users, documents, and platform settings. Use the sidebar for
            compliance, privacy, and settings.
          </p>
        </div>
      )}

      <Outlet />
    </div>
  );
};

export default AdminLayout;

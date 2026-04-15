import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Settings } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const TAB_REDIRECTS: Record<string, string> = {
  overview: '/admin',
  students: '/admin/students',
  parents: '/admin/parents',
  teachers: '/admin/staff',
  schools: '/admin/schools',
  directors: '/admin/directors',
  documents: '/admin/documents',
  reminders: '/admin/reminders',
};

/**
 * Shared chrome for platform admin area; child routes render in the outlet.
 */
const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (!tab) return;
    const target = TAB_REDIRECTS[tab];
    if (target) {
      navigate(target, { replace: true });
    }
  }, [location.search, navigate]);

  const hideOverviewChrome = location.pathname === '/admin/settings';

  return (
    <div className="p-6 space-y-6">
      {!hideOverviewChrome && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold mb-1">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Manage schools, users, documents, and platform settings
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/compliance-center')}
              className="gap-2"
            >
              <ClipboardCheck className="h-4 w-4" />
              Compliance Center
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/settings')}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            )}
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
};

export default AdminLayout;

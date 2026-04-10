import { useLocation, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Bell, Search, HelpCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/hooks/useUserRole";
interface DashboardTopbarProps {
  schoolName?: string;
  userRole: UserRole;
  notificationCount?: number;
}

// Route to breadcrumb label mapping
const routeLabels: Record<string, string> = {
  '/admin': 'Admin Dashboard',
  '/director-dashboard': 'Director Dashboard',
  '/school-dashboard': 'School Dashboard',
  '/dashboard': 'Parent Dashboard',
  '/compliance-center': 'Compliance Center',
  '/compliance-center/doh': 'DOH Compliance',
  '/compliance-center/facility': 'Facility & Safety',
  '/compliance-center/certifications': 'Certifications',
  '/school/pending-documents': 'Pending Documents',
  '/school/expiring-documents': 'Expiring Documents',
  '/school/settings': 'School Settings',
  '/school/branches': 'Branches',
  '/school/teacher-compliance': 'Teacher Compliance',
  '/admin/required-documents': 'Required Documents',
  '/admin/staff-requirements': 'Staff Requirements',
  '/admin/settings': 'Admin Settings',
  '/admin/reminders': 'Reminders'
};
export function DashboardTopbar({
  schoolName,
  userRole,
  notificationCount = 0
}: DashboardTopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const getDashboardPath = () => {
    switch (userRole) {
      case 'admin':
      case 'school_staff':
        return '/admin';
      case 'director':
        return '/director-dashboard';
      case 'school':
        return '/school-dashboard';
      default:
        return '/dashboard';
    }
  };
  const getDashboardLabel = () => {
    switch (userRole) {
      case 'admin':
      case 'school_staff':
        return 'Admin';
      case 'director':
        return 'Director';
      case 'school':
        return 'School';
      default:
        return 'Dashboard';
    }
  };

  // Build breadcrumbs from current path
  const buildBreadcrumbs = () => {
    const path = location.pathname;
    const dashboardPath = getDashboardPath();

    // Start with dashboard
    const breadcrumbs = [{
      label: getDashboardLabel(),
      path: dashboardPath,
      isHome: true
    }];

    // If we're on the dashboard itself, just show it
    if (path === dashboardPath) {
      return breadcrumbs;
    }

    // Get the current page label
    const currentLabel = routeLabels[path] || path.split('/').pop()?.replace(/-/g, ' ') || 'Page';

    // Add parent paths if needed
    if (path.startsWith('/compliance-center/')) {
      breadcrumbs.push({
        label: 'Compliance',
        path: '/compliance-center',
        isHome: false
      });
    } else if (path.startsWith('/school/')) {
      breadcrumbs.push({
        label: 'School',
        path: '/school-dashboard',
        isHome: false
      });
    } else if (path.startsWith('/admin/') && path !== '/admin') {
      breadcrumbs.push({
        label: 'Admin',
        path: '/admin',
        isHome: false
      });
    }

    // Add current page
    breadcrumbs.push({
      label: currentLabel,
      path: path,
      isHome: false
    });
    return breadcrumbs;
  };
  const breadcrumbs = buildBreadcrumbs();
  return <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      {/* Sidebar Toggle */}
      <SidebarTrigger className="-ml-1 h-8 w-8" />
      
      <Separator orientation="vertical" className="h-4" />

      {/* Breadcrumbs */}
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => <BreadcrumbItem key={crumb.path}>
              {index === breadcrumbs.length - 1 ? <BreadcrumbPage className="text-sm font-medium">{crumb.label}
                </BreadcrumbPage> : <>
                  <BreadcrumbLink href={crumb.path} onClick={e => {
              e.preventDefault();
              navigate(crumb.path);
            }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {crumb.label}
                  </BreadcrumbLink>
                  <BreadcrumbSeparator className="[&>svg]:size-3.5" />
                </>}
            </BreadcrumbItem>)}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Search button */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-4 min-w-4 text-[10px] px-1 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Help</span>
        </Button>
      </div>
    </header>;
}
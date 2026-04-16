import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCircle,
  FileText,
  Clock,
  AlertTriangle,
  Shield,
  Settings,
  MapPin,
  Activity,
  Flame,
  Award,
  ChevronRight,
  LogOut,
  School,
  UserCog,
  Bell,
  Search,
  ClipboardCheck,
  Briefcase,
  LayoutGrid,
  Scale,
  MessageSquare,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import logoImage from "@/assets/logo-nobg.png";

interface NavigationItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  isUrgent?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

interface DashboardSidebarProps {
  schoolId?: string;
  schoolName?: string;
  stats?: {
    pendingDocs?: number;
    expiringDocs?: number;
    studentCount?: number;
    teacherCount?: number;
    parentCount?: number;
  };
}

export function DashboardSidebar({
  schoolId,
  schoolName,
  stats = {},
}: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const { isAdmin, isDirector, isBranchDirector, isTeacher, getDashboardPath, getSettingsPath, getRoleDisplayName } = useUserRole();
  const collapsed = state === "collapsed";

  const dashboardPath = getDashboardPath();

  const pathFromNavUrl = (url: string) => url.split('?')[0];

  const isActive = (path: string) => {
    const base = pathFromNavUrl(path);
    const { pathname } = location;
    if (path === dashboardPath) {
      if (path === '/admin') {
        return pathname === '/admin' || pathname === '/admin/';
      }
      return pathname === base || pathname === `${base}/`;
    }
    if (base === '/school-dashboard') {
      return pathname === '/school-dashboard' || pathname === '/school-dashboard/';
    }
    // Hub page only — not active on /compliance-center/doh etc.
    if (base === '/compliance-center') {
      return pathname === '/compliance-center' || pathname === '/compliance-center/';
    }
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  const getInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const complianceGroupOpen =
    location.pathname.startsWith('/compliance-center') ||
    location.pathname.startsWith('/eligibility');

  const documentsGroupOpen =
    location.pathname.startsWith('/school/pending-documents') ||
    location.pathname.startsWith('/school/expiring-documents') ||
    location.pathname.startsWith('/school/teacher-compliance') ||
    location.pathname === '/all-documents';

  const buildNavigation = (): NavigationGroup[] => {
    const groups: NavigationGroup[] = [];

    // --- ADMIN-only sections ---
    if (isAdmin) {
      groups.push({
        label: "Main",
        items: [{ title: "Overview", url: dashboardPath, icon: LayoutDashboard }],
      });

      groups.push({
        label: "Platform",
        items: [
          { title: "Schools", url: '/admin/schools', icon: School },
          { title: "Directors", url: '/admin/directors', icon: UserCog },
          { title: "Documents", url: '/admin/documents', icon: FileText },
          { title: "Audit Logs", url: '/admin/audit-logs', icon: Shield },
          { title: "Reminders", url: '/admin/reminders', icon: Bell },
          { title: "Privacy & policy", url: '/admin/privacy-settings', icon: Scale },
          { title: "Settings", url: '/admin/settings', icon: Settings },
        ],
        collapsible: true,
        defaultOpen: true,
      });

      groups.push({
        label: "People",
        items: [
          { title: "Students", url: '/admin/students', icon: Users, badge: stats.studentCount },
          { title: "Staff", url: '/admin/staff', icon: GraduationCap, badge: stats.teacherCount },
          { title: "Parents", url: '/admin/parents', icon: UserCircle, badge: stats.parentCount },
        ],
        collapsible: true,
        defaultOpen: true,
      });

      return groups;
    }

    // --- DIRECTOR sections ---
    if (isDirector) {
      groups.push({
        label: "Main",
        items: [
          { title: "School dashboard", url: dashboardPath, icon: LayoutDashboard },
          { title: "Director dashboard", url: '/director-dashboard', icon: Briefcase },
        ],
      });

      groups.push({
        label: "Compliance center",
        items: [
          { title: "Overview", url: '/compliance-center', icon: LayoutGrid },
          { title: "DOH", url: '/compliance-center/doh', icon: Activity },
          { title: "Facility & safety", url: '/compliance-center/facility', icon: Flame },
          { title: "Certifications", url: '/compliance-center/certifications', icon: Award },
          { title: "Staff eligibility", url: '/eligibility', icon: ClipboardCheck },
        ],
        collapsible: true,
        defaultOpen: complianceGroupOpen,
      });

      groups.push({
        label: "Document tracking",
        items: [
          { title: "Pending review", url: '/school/pending-documents', icon: Clock, badge: stats.pendingDocs, isUrgent: (stats.pendingDocs ?? 0) > 0 },
          { title: "Expiring soon", url: '/school/expiring-documents', icon: AlertTriangle, badge: stats.expiringDocs, isUrgent: (stats.expiringDocs ?? 0) > 0 },
          { title: "Staff compliance", url: '/school/teacher-compliance', icon: Users },
          { title: "All documents", url: '/all-documents', icon: FileText },
        ],
        collapsible: true,
        defaultOpen: documentsGroupOpen,
      });

      groups.push({
        label: "People",
        items: [
          { title: "Students", url: '/school-dashboard?tab=students', icon: Users, badge: stats.studentCount },
          { title: "Staff", url: '/school-dashboard?tab=teachers', icon: GraduationCap, badge: stats.teacherCount },
          { title: "Parents", url: '/school-dashboard?tab=parents', icon: UserCircle, badge: stats.parentCount },
        ],
        collapsible: true,
        defaultOpen: true,
      });

      groups.push({
        label: "Settings",
        items: [
          { title: "Branches", url: '/school/branches', icon: MapPin },
          { title: "Requirements", url: '/admin/required-documents', icon: Shield },
          { title: "School settings", url: '/school/settings', icon: Settings },
        ],
        collapsible: true,
        defaultOpen: location.pathname.includes('/settings') || location.pathname.includes('/branches'),
      });

      return groups;
    }

    // --- BRANCH_DIRECTOR sections ---
    if (isBranchDirector) {
      groups.push({
        label: "Main",
        items: [{ title: "School dashboard", url: dashboardPath, icon: LayoutDashboard }],
      });

      groups.push({
        label: "Compliance center",
        items: [
          { title: "Overview", url: '/compliance-center', icon: LayoutGrid },
          { title: "DOH", url: '/compliance-center/doh', icon: Activity },
          { title: "Facility & safety", url: '/compliance-center/facility', icon: Flame },
          { title: "Certifications", url: '/compliance-center/certifications', icon: Award },
          { title: "Staff eligibility", url: '/eligibility', icon: ClipboardCheck },
        ],
        collapsible: true,
        defaultOpen: complianceGroupOpen,
      });

      groups.push({
        label: "Document tracking",
        items: [
          { title: "Pending review", url: '/school/pending-documents', icon: Clock, badge: stats.pendingDocs, isUrgent: (stats.pendingDocs ?? 0) > 0 },
          { title: "Expiring soon", url: '/school/expiring-documents', icon: AlertTriangle, badge: stats.expiringDocs, isUrgent: (stats.expiringDocs ?? 0) > 0 },
          { title: "Staff compliance", url: '/school/teacher-compliance', icon: Users },
          { title: "All documents", url: '/all-documents', icon: FileText },
        ],
        collapsible: true,
        defaultOpen: documentsGroupOpen,
      });

      groups.push({
        label: "People",
        items: [
          { title: "Students", url: '/school-dashboard?tab=students', icon: Users, badge: stats.studentCount },
          { title: "Staff", url: '/school-dashboard?tab=teachers', icon: GraduationCap, badge: stats.teacherCount },
        ],
        collapsible: true,
        defaultOpen: true,
      });

      groups.push({
        label: "Settings",
        items: [
          { title: "School settings", url: '/school/settings', icon: Settings },
        ],
        collapsible: true,
        defaultOpen: false,
      });

      return groups;
    }

    // --- TEACHER sections ---
    if (isTeacher) {
      groups.push({
        label: "Main",
        items: [
          { title: "Eligibility portal", url: '/eligibility', icon: ClipboardCheck },
          { title: "My documents", url: '/all-documents', icon: FileText },
        ],
      });

      groups.push({
        label: "Messages",
        items: [{ title: "Message center", url: '/admin/messages', icon: MessageSquare }],
      });

      return groups;
    }

    // Fallback
    groups.push({
      label: "Main",
      items: [{ title: "Dashboard", url: dashboardPath, icon: LayoutDashboard }],
    });

    return groups;
  };

  const navigation = buildNavigation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderNavItem = (item: NavigationItem) => {
    const active = isActive(item.url);
    const Icon = item.icon;

    const content = (
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={collapsed ? item.title : undefined}
        className={cn(
          "h-10 rounded-lg transition-all duration-200 group/item",
          active
            ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20"
            : "hover:bg-white/10 text-white/70 hover:text-white"
        )}
      >
        <a
          href={item.url}
          onClick={(e) => { e.preventDefault(); navigate(item.url); }}
          className="flex items-center gap-3 px-3"
        >
          <Icon className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200 group-hover/item:scale-110",
            active && "text-secondary-foreground"
          )} />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-sm">{item.title}</span>
              {item.badge !== undefined && item.badge !== 0 && (
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center transition-colors",
                  item.isUrgent
                    ? "bg-error/15 text-error animate-pulse-glow"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}>
                  {item.badge}
                </span>
              )}
            </>
          )}
        </a>
      </SidebarMenuButton>
    );

    if (collapsed && item.badge) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.badge}</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background">
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-border/50">
        <a
          href={dashboardPath}
          onClick={(e) => { e.preventDefault(); navigate(dashboardPath); }}
          className="flex items-center gap-3 group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105">
            <img src={logoImage} alt="Logo" className="w-6 h-6 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">Compli-ed</span>
              </div>
              {schoolName && (
                <span className="text-xs text-white/60 truncate">{schoolName}</span>
              )}
            </div>
          )}
        </a>
      </SidebarHeader>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border/50">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white/70 transition-colors group cursor-text">
            <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="text-sm flex-1 text-left">Quick search...</span>
            <kbd className="text-[10px] bg-background/80 px-1.5 py-0.5 rounded border border-border/50 font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Navigation */}
      <SidebarContent className="px-2 py-3 scrollbar-thin">
        {navigation.map((group) => (
          <SidebarGroup key={group.label} className="mb-2">
            {group.collapsible ? (
              <Collapsible defaultOpen={group.defaultOpen}>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold text-white/70 uppercase tracking-wider hover:text-white transition-colors">
                    {!collapsed && (
                      <>
                        <span>{group.label}</span>
                        <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                      </>
                    )}
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-0.5">
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.title}>{renderNavItem(item)}</SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <>
                {!collapsed && (
                  <SidebarGroupLabel className="px-3 py-2 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-0.5">
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>{renderNavItem(item)}</SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 w-full rounded-xl p-2.5 bg-primary text-primary-foreground transition-all duration-200 group shadow-lg shadow-primary/20",
              collapsed && "justify-center"
            )}>
              <div className="relative">
                <Avatar className="h-9 w-9 ring-2 ring-primary-foreground/20 shadow-sm transition-transform duration-200 group-hover:scale-105">
                  <AvatarFallback className="bg-primary-foreground text-primary text-xs font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-primary animate-pulse" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-primary-foreground truncate leading-none mb-1">
                    {user?.name || user?.email?.split('@')[0]}
                  </p>
                  <span className="text-[10px] font-bold text-primary-foreground/90 bg-white/20 px-2 py-0.5 rounded-full border border-white/20">
                    {getRoleDisplayName()}
                  </span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side={collapsed ? "right" : "top"} className="w-48">
            <div className="px-2 py-1.5 border-b border-border">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => navigate(getSettingsPath())} className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

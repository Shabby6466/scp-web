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
  const { role, isAdmin, isDirector, isBranchDirector, isTeacher, isStudent, isParent, getDashboardPath, getRoleDisplayName } = useUserRole();
  const collapsed = state === "collapsed";

  const dashboardPath = getDashboardPath();

  const isActive = (path: string) => {
    if (path === dashboardPath) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const getInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const buildNavigation = (): NavigationGroup[] => {
    const canManageSchool = isAdmin || isDirector || isBranchDirector || isTeacher;
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
          { title: "Schools", url: '/admin?tab=schools', icon: School },
          { title: "Directors", url: '/admin?tab=directors', icon: UserCog },
          { title: "Audit Logs", url: '/admin/audit-logs', icon: Shield },
          { title: "Reminders", url: '/admin/reminders', icon: Bell },
          { title: "Settings", url: '/admin/settings', icon: Settings },
        ],
        collapsible: true,
        defaultOpen: true,
      });

      groups.push({
        label: "People",
        items: [
          { title: "Students", url: '/admin?tab=students', icon: Users, badge: stats.studentCount },
          { title: "Staff", url: '/admin?tab=teachers', icon: GraduationCap, badge: stats.teacherCount },
          { title: "Parents", url: '/admin?tab=parents', icon: UserCircle, badge: stats.parentCount },
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
        items: [{ title: "School Dashboard", url: dashboardPath, icon: LayoutDashboard }],
      });

      groups.push({
        label: "Compliance",
        items: [
          { title: "DOH", url: '/compliance-center/doh', icon: Activity },
          { title: "Facility & Safety", url: '/compliance-center/facility', icon: Flame },
          { title: "Certifications", url: '/compliance-center/certifications', icon: Award },
          { title: "Staff Eligibility", url: '/eligibility', icon: ClipboardCheck },
        ],
        collapsible: true,
        defaultOpen: location.pathname.includes('/compliance') || location.pathname.includes('/eligibility'),
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
          { title: "Settings", url: '/school/settings', icon: Settings },
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
        items: [{ title: "School Dashboard", url: dashboardPath, icon: LayoutDashboard }],
      });

      groups.push({
        label: "Compliance",
        items: [
          { title: "DOH", url: '/compliance-center/doh', icon: Activity },
          { title: "Facility & Safety", url: '/compliance-center/facility', icon: Flame },
          { title: "Certifications", url: '/compliance-center/certifications', icon: Award },
          { title: "Staff Eligibility", url: '/eligibility', icon: ClipboardCheck },
        ],
        collapsible: true,
        defaultOpen: location.pathname.includes('/compliance') || location.pathname.includes('/eligibility'),
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
          { title: "Settings", url: '/school/settings', icon: Settings },
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
          { title: "Eligibility Portal", url: '/eligibility', icon: ClipboardCheck },
          { title: "My Documents", url: '/all-documents', icon: FileText },
        ],
      });

      return groups;
    }

    // --- STUDENT sections ---
    if (isStudent) {
      groups.push({
        label: "Main",
        items: [
          { title: "Dashboard", url: dashboardPath, icon: LayoutDashboard },
          { title: "My Documents", url: '/all-documents', icon: FileText },
        ],
      });

      return groups;
    }

    // --- PARENT sections ---
    if (isParent) {
      groups.push({
        label: "Main",
        items: [
          { title: "Dashboard", url: dashboardPath, icon: LayoutDashboard },
          { title: "My Children", url: '/dashboard/children', icon: Users },
        ],
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
            ? "bg-secondary text-secondary-foreground font-medium shadow-sm"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
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
                <span className="font-semibold text-foreground text-sm">SCP</span>
              </div>
              {schoolName && (
                <span className="text-xs text-muted-foreground truncate">{schoolName}</span>
              )}
            </div>
          )}
        </a>
      </SidebarHeader>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border/50">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground transition-colors group">
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
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
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
                  <SidebarGroupLabel className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
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
              "flex items-center gap-3 w-full rounded-lg p-2 hover:bg-muted transition-all duration-200 group",
              collapsed && "justify-center"
            )}>
              <div className="relative">
                <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-background animate-pulse" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name || user?.email?.split('@')[0]}
                  </p>
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
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
            <DropdownMenuItem onClick={() => navigate('/school/settings')} className="gap-2">
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

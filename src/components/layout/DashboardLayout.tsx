import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { api } from "@/lib/api";
import { TooltipProvider } from "@/components/ui/tooltip";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface DashboardStats {
  pendingDocs: number;
  expiringDocs: number;
  studentCount: number;
  teacherCount: number;
  parentCount: number;
  branchCount: number;
  directorCount: number;
  branchDirectorCount: number;
  /** Admin only: schools in platform */
  schoolCount: number;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, schoolId, loading: roleLoading, isParent, isAdmin } = useUserRole();
  const [schoolName, setSchoolName] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats>({
    pendingDocs: 0,
    expiringDocs: 0,
    studentCount: 0,
    teacherCount: 0,
    parentCount: 0,
    branchCount: 0,
    directorCount: 0,
    branchDirectorCount: 0,
    schoolCount: 0,
  });

  useEffect(() => {
    if (!authLoading && !roleLoading && isParent) {
      navigate('/dashboard');
    }
  }, [authLoading, roleLoading, isParent, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      if (isAdmin) {
        try {
          const data = await api.get<{
            schoolCount: number;
            branchCount: number;
            studentCount: number;
            teacherCount: number;
            parentCount: number;
            directorCount: number;
            branchDirectorCount: number;
          }>('/schools/navigation-counts');
          if (data) {
            setSchoolName('');
            setStats({
              pendingDocs: 0,
              expiringDocs: 0,
              studentCount: data.studentCount ?? 0,
              teacherCount: data.teacherCount ?? 0,
              parentCount: data.parentCount ?? 0,
              branchCount: data.branchCount ?? 0,
              directorCount: data.directorCount ?? 0,
              branchDirectorCount: data.branchDirectorCount ?? 0,
              schoolCount: data.schoolCount ?? 0,
            });
          }
        } catch (error) {
          console.error('Error fetching admin navigation counts:', error);
        }
        return;
      }

      if (!schoolId) return;

      try {
        const data = await api.get<{ name: string; stats: Partial<DashboardStats> }>(
          `/schools/${schoolId}/dashboard-summary`
        );
        if (data) {
          setSchoolName(data.name ?? "");
          const s = data.stats ?? {};
          setStats({
            studentCount: s.studentCount ?? 0,
            teacherCount: s.teacherCount ?? 0,
            pendingDocs: s.pendingDocs ?? 0,
            expiringDocs: s.expiringDocs ?? 0,
            parentCount: s.parentCount ?? 0,
            branchCount: s.branchCount ?? 0,
            directorCount: s.directorCount ?? 0,
            branchDirectorCount: s.branchDirectorCount ?? 0,
            schoolCount: 0,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, [user, schoolId, isAdmin]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          <DashboardSidebar
            schoolId={schoolId || undefined}
            schoolName={schoolName}
            stats={stats}
          />
          <SidebarInset className="flex flex-col flex-1">
            <DashboardTopbar
              schoolName={schoolName}
              userRole={role}
              notificationCount={stats.pendingDocs}
            />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}

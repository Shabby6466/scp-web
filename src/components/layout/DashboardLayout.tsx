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
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, schoolId, loading: roleLoading, isParent } = useUserRole();
  const [schoolName, setSchoolName] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats>({
    pendingDocs: 0,
    expiringDocs: 0,
    studentCount: 0,
    teacherCount: 0,
    parentCount: 0,
  });

  useEffect(() => {
    if (!authLoading && !roleLoading && isParent) {
      navigate('/dashboard');
    }
  }, [authLoading, roleLoading, isParent, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !schoolId) return;

      try {
        const data = await api.get<{ name: string; stats: DashboardStats }>(
          `/schools/${schoolId}/dashboard-summary`
        );
        if (data) {
          setSchoolName(data.name ?? "");
          setStats({
            studentCount: data.stats?.studentCount ?? 0,
            teacherCount: data.stats?.teacherCount ?? 0,
            pendingDocs: data.stats?.pendingDocs ?? 0,
            expiringDocs: data.stats?.expiringDocs ?? 0,
            parentCount: data.stats?.parentCount ?? 0,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, [user, schoolId]);

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

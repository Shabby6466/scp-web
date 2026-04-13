import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "./DashboardLayout";
import { AuthenticatedThemeProvider } from "@/components/AuthenticatedThemeProvider";

/**
 * AppShellLayout - The single source of truth for authenticated app pages.
 */
export function AppShellLayout() {
  const { user, loading } = useAuth();

  if (loading) {
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
    return <Navigate to="/auth" replace />;
  }

  return (
    <AuthenticatedThemeProvider>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </AuthenticatedThemeProvider>
  );
}

export default AppShellLayout;

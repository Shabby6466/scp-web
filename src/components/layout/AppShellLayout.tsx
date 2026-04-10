import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "./DashboardLayout";

/**
 * AppShellLayout - The single source of truth for authenticated app pages.
 * 
 * This component wraps all authenticated routes with DashboardLayout,
 * ensuring the sidebar persists across all navigation.
 * 
 * Uses React Router's <Outlet /> to render nested routes.
 */
export function AppShellLayout() {
  const { user, loading } = useAuth();

  // Show loading state while checking auth
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

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Render the DashboardLayout with nested route content
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

export default AppShellLayout;

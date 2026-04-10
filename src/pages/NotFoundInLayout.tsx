import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, FileQuestion } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * NotFoundInLayout - A 404 page that renders INSIDE the DashboardLayout.
 * The sidebar remains visible, maintaining app navigation context.
 */
const NotFoundInLayout = () => {
  const location = useLocation();
  const { getDashboardPath } = useUserRole();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-4xl font-bold">404</CardTitle>
          <CardDescription className="text-base">
            Page not found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The page <code className="bg-muted px-1 py-0.5 rounded text-xs">{location.pathname}</code> doesn't exist or you don't have access to it.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to={getDashboardPath()}>
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFoundInLayout;

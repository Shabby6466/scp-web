import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const NotAuthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, getDashboardPath } = useUserRole();

  const handleGoBack = () => {
    if (user && role) {
      navigate(getDashboardPath());
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-serif">Access Denied</CardTitle>
          <CardDescription className="text-base">
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {user 
              ? "This page is restricted to users with different permissions. Please contact your administrator if you believe this is an error."
              : "Please sign in to access this page."
            }
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleGoBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {user ? 'Go to My Dashboard' : 'Go to Home'}
            </Button>
            {!user && (
              <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                Sign In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotAuthorized;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import { invitationService } from "@/services/invitationService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, CheckCircle, UserPlus } from "lucide-react";
import TeacherInviteDialog from "@/components/admin/TeacherInviteDialog";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employment_status: string;
}

interface Invitation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  created_at: string;
}

const SetupStaff = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canManageSchool, isParent, schoolId, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (isParent) { navigate('/dashboard', { replace: true }); return; }
    if (!canManageSchool) { navigate('/not-authorized', { replace: true }); return; }
    
    fetchData();
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate]);

  const fetchData = async () => {
    if (!schoolId) {
      navigate('/school-register');
      return;
    }

    try {
      const [teachersData, invitationsData] = await Promise.all([
        userService.listTeachers(schoolId),
        invitationService.list(schoolId),
      ]);

      setTeachers(teachersData || []);
      setInvitations(invitationsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || roleLoading || loading) {
    return <LoadingSpinner />;
  }

  const isComplete = teachers.length >= 1;
  const pendingInvites = invitations.filter(i => i.status === 'pending');

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 pt-20 pb-12">
        <div className="container px-4 max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/school-dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              Add Your Staff
            </h1>
            <p className="text-muted-foreground">
              Invite teachers and administrators to join your school.
              {isComplete && (
                <Badge className="ml-2 bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Step Complete
                </Badge>
              )}
            </p>
          </div>

          {/* Invite Staff */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Invite Staff Members
              </CardTitle>
              <CardDescription>
                Send email invitations to teachers and staff
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeacherInviteDialog 
                schoolId={schoolId!} 
                onInviteSent={fetchData}
              />
            </CardContent>
          </Card>

          {/* Current Staff */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Current Staff ({teachers.length})
              </CardTitle>
              <CardDescription>
                {teachers.length === 0 
                  ? 'No staff members yet. Send invitations above.'
                  : 'Staff members who have accepted their invitations'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {teachers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No staff members yet
                </p>
              ) : (
                teachers.map(teacher => (
                  <div 
                    key={teacher.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {teacher.first_name} {teacher.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    </div>
                    <Badge variant={teacher.employment_status === 'active' ? 'default' : 'secondary'}>
                      {teacher.employment_status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {pendingInvites.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Pending Invitations ({pendingInvites.length})</CardTitle>
                <CardDescription>
                  Staff members who haven't accepted their invitations yet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingInvites.map(invite => (
                  <div 
                    key={invite.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20"
                  >
                    <div>
                      <p className="font-medium">
                        {invite.first_name} {invite.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{invite.email}</p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-200">
                      Pending
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => navigate('/school/setup/required-documents')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => navigate('/school/setup/students')}>
              Continue to Students
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SetupStaff;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, GraduationCap, CheckCircle, Upload, UserPlus } from "lucide-react";
import StudentRosterUpload from "@/components/school/StudentRosterUpload";

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  grade_level: string | null;
}

const SetupStudents = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { canManageSchool, isParent, schoolId, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);

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
      const data = await userService.listStudents(schoolId);
      setStudents(data || []);
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

  const isComplete = students.length >= 1;

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
              Add Your Students
            </h1>
            <p className="text-muted-foreground">
              Import your student roster or add students individually.
              {isComplete && (
                <Badge className="ml-2 bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Step Complete
                </Badge>
              )}
            </p>
          </div>

          <Tabs defaultValue="import" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Roster
              </TabsTrigger>
              <TabsTrigger value="current" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Current Students ({students.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="import">
              <StudentRosterUpload 
                schoolId={schoolId!} 
                onSuccess={fetchData}
              />
            </TabsContent>

            <TabsContent value="current">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Enrolled Students ({students.length})
                  </CardTitle>
                  <CardDescription>
                    {students.length === 0 
                      ? 'No students enrolled yet. Use the Import tab to add students.'
                      : 'Students currently enrolled at your school'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {students.length === 0 ? (
                    <div className="text-center py-12">
                      <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No students enrolled yet
                      </p>
                      <Button variant="outline" onClick={() => {
                        const tabList = document.querySelector('[data-state="inactive"][value="import"]');
                        if (tabList) (tabList as HTMLButtonElement).click();
                      }}>
                        <Upload className="h-4 w-4 mr-2" />
                        Import Student Roster
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {students.map(student => (
                        <div 
                          key={student.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              DOB: {new Date(student.date_of_birth).toLocaleDateString()}
                              {student.grade_level && ` · ${student.grade_level}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => navigate('/school/setup/staff')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => navigate('/school/setup/invitations')}>
              Continue to Invitations
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SetupStudents;

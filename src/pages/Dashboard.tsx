import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { api } from '@/lib/api';
import { mapDocumentFromNest, mapStudentFromParentLink } from '@/lib/nestMappers';
import { studentParentService } from '@/services/studentParentService';
import { documentService } from '@/services/documentService';
import Header from '@/components/Header';
import StudentRegistrationDialog from '@/components/StudentRegistrationDialog';
import { BatchUploadDialog } from '@/components/BatchUploadDialog';
import DocumentsList from '@/components/DocumentsList';
import ExpirationAlerts from '@/components/dashboard/ExpirationAlerts';
import ConsentDialog from '@/components/ConsentDialog';
import RequiredDocuments from '@/components/dashboard/RequiredDocuments';
import DocumentChecklistCard from '@/components/dashboard/DocumentChecklistCard';
import ProgressBar from '@/components/dashboard/ProgressBar';
import ChildCard from '@/components/dashboard/ChildCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Users, CheckCircle, Clock, AlertCircle, FileCheck2, Shield, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChildrenGridSkeleton, DocumentStatsGridSkeleton } from '@/components/dashboard/DashboardSkeletons';

/**
 * Dashboard - Parent Dashboard
 *
 * PARENT-ONLY PAGE: Only role='parent' users can access this.
 * Admin, Director, School, School Staff users are redirected to their dashboards.
 */

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
);

interface DocumentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
}

function mapStudentLink(link: any, parentId: string) {
  return mapStudentFromParentLink(link, parentId);
}

function mapApiDocument(d: any) {
  return mapDocumentFromNest(d as Record<string, unknown>) as any;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isDirector, isParent, loading: roleLoading, getDashboardPath } = useUserRole();
  const navigate = useNavigate();
  const [students, setStudents] = useState<ReturnType<typeof mapStudentLink>[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [requiredByStudent, setRequiredByStudent] = useState<Record<string, number>>({});

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!isParent) {
      const dashboardPath = getDashboardPath();
      navigate(dashboardPath, { replace: true });
      return;
    }
  }, [user, authLoading, roleLoading, isParent, getDashboardPath, navigate]);

  const checkOnboarding = useCallback(async () => {
    if (!user?.id || !isParent || roleLoading) return;
    try {
      const links = await studentParentService.getStudentsOfParent(user.id);
      const list = Array.isArray(links) ? links : [];
      if (list.length === 0) {
        navigate('/onboarding');
      }
    } catch (e) {
      console.error(e);
    }
  }, [user?.id, isParent, roleLoading, navigate]);

  useEffect(() => {
    if (!user || !isParent || roleLoading) return;
    checkOnboarding();
  }, [user, isParent, roleLoading, checkOnboarding]);

  const fetchStudents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const links = await studentParentService.getStudentsOfParent(user.id);
      const list = Array.isArray(links) ? links : [];
      const rows = list
        .map((l: any) => mapStudentLink(l, user.id))
        .filter(Boolean) as NonNullable<ReturnType<typeof mapStudentLink>>[];
      setStudents(rows);
    } catch (e) {
      console.error(e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchDocuments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const links = await studentParentService.getStudentsOfParent(user.id);
      const list = Array.isArray(links) ? links : [];
      const studentIds = list.map((l: any) => l.student?.id).filter(Boolean);
      const docLists = await Promise.all(
        studentIds.map((sid: string) => documentService.listByOwner(sid).catch(() => [])),
      );
      const flat = docLists.flat().map(mapApiDocument);
      setDocuments(flat);
      const newStats: DocumentStats = {
        total: flat.length,
        pending: flat.filter((d) => d.status === 'pending').length,
        approved: flat.filter((d) => d.status === 'approved').length,
        rejected: flat.filter((d) => d.status === 'rejected').length,
        expired: flat.filter((d) => d.status === 'expired').length,
      };
      setStats(newStats);
    } catch (e) {
      console.error(e);
      setDocuments([]);
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchConsent = async () => {
      if (!user?.id || roleLoading || !isParent) return;

      if (isAdmin || isDirector) {
        setConsentGiven(true);
        return;
      }

      try {
        const raw = await api.get('/user-consent');
        const list = Array.isArray(raw) ? raw : (raw as any)?.data ?? [];
        const row = list.find((c: any) => (c.user_id || c.userId) === user.id);
        if (row?.consent_given) {
          setConsentGiven(true);
        } else {
          setShowConsentDialog(true);
        }
      } catch {
        setConsentGiven(true);
      }
    };

    fetchConsent();
  }, [user?.id, isAdmin, isDirector, isParent, roleLoading]);

  useEffect(() => {
    if (!user?.id) return;
    fetchStudents();
    fetchDocuments();
  }, [user?.id, refreshTrigger, fetchStudents, fetchDocuments]);

  useEffect(() => {
    if (students.length === 0) {
      setRequiredByStudent({});
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        students.map(async (s) => {
          try {
            const sum = await documentService.getSummary(s.id);
            const n = (sum as { assignedCount?: number })?.assignedCount;
            return [s.id, typeof n === 'number' && n > 0 ? n : 1] as const;
          } catch {
            return [s.id, 1] as const;
          }
        }),
      );
      if (!cancelled) setRequiredByStudent(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [students]);

  const handleConsentAccept = async () => {
    if (!user?.id) return;

    try {
      await api.post('/user-consent', {
        user_id: user.id,
        consent_given: true,
        privacy_policy_version: '1.0',
      });
    } catch {
      /* endpoint may be absent in some deployments */
    }
    setConsentGiven(true);
  };

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (authLoading || roleLoading) {
    return <LoadingSpinner />;
  }

  if (!user || !isParent) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <ConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onAccept={handleConsentAccept}
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                Welcome back, {user.name || 'Parent'}!
              </h1>
              <p className="text-lg text-muted-foreground">
                Manage your children's documents and enrollment information
              </p>
            </div>
            {!isAdmin && !isDirector && (
              <Button variant="outline" size="sm" onClick={() => setShowConsentDialog(true)} className="gap-2">
                <Shield className="h-4 w-4" />
                Privacy Policy
              </Button>
            )}
          </div>
        </div>

        {!consentGiven && !isAdmin && !isDirector && (
          <Alert className="mb-6 border-primary/50 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Privacy Notice:</strong> Please review and accept our privacy policy to continue using the
              platform. This is required for FERPA and NYC DOH compliance.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-8">
          <ExpirationAlerts refreshTrigger={refreshTrigger} />
        </div>

        <Tabs defaultValue="children" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="children">
              <Users className="h-4 w-4 mr-2" />
              My Children
            </TabsTrigger>
            <TabsTrigger value="checklist">
              <FileCheck2 className="h-4 w-4 mr-2" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              All Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="children" className="space-y-6">
            <ProgressBar refreshTrigger={refreshTrigger} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">My Children</h2>
                <div className="flex gap-2">
                  <BatchUploadDialog students={students} onComplete={handleRefresh} />
                  <StudentRegistrationDialog onStudentAdded={handleRefresh} />
                </div>
              </div>

              {loading ? (
                <ChildrenGridSkeleton count={2} />
              ) : students.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Students Yet</h3>
                    <p className="text-muted-foreground text-center mb-6 max-w-sm">
                      Add your first child to get started with document management
                    </p>
                    <StudentRegistrationDialog onStudentAdded={handleRefresh}>
                      <Button size="lg">
                        <Users className="h-5 w-5 mr-2" />
                        Add Your First Child
                      </Button>
                    </StudentRegistrationDialog>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {students.map((student) => (
                    <ChildCard
                      key={student.id}
                      student={student}
                      documents={documents}
                      requiredCount={requiredByStudent[student.id] ?? 1}
                      onDocumentUploaded={handleRefresh}
                      onClick={() => navigate(`/child/${student.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            <ExpirationAlerts refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="checklist" className="space-y-6">
            <DocumentChecklistCard refreshTrigger={refreshTrigger} onRefresh={handleRefresh} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            {loading ? (
              <DocumentStatsGridSkeleton />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-2xl font-bold">{stats.total}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </CardContent>
                </Card>

                <Card className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <span className="text-2xl font-bold">{stats.pending}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </CardContent>
                </Card>

                <Card className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="text-2xl font-bold">{stats.approved}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </CardContent>
                </Card>

                <Card className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <span className="text-2xl font-bold">{stats.rejected}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Needs Action</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Documents</CardTitle>
                    <CardDescription>View and manage all uploaded documents</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {documents.length > 0 && <Badge variant="outline">{documents.length} total</Badge>}
                    <BatchUploadDialog students={students} onComplete={handleRefresh} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DocumentsList refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;

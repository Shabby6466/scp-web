import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { schoolService } from '@/services/schoolService';
import { branchService } from '@/services/branchService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  LayoutGrid,
  Users,
  GraduationCap,
  FileText,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { useComplianceData } from '@/hooks/useComplianceData';
import { StudentComplianceBreakdown } from '@/components/compliance/StudentComplianceBreakdown';
import { TeacherComplianceBreakdown } from '@/components/compliance/TeacherComplianceBreakdown';
import { ExpiringSoonList } from '@/components/compliance/ExpiringSoonList';
import { ExpiredDocumentsList } from '@/components/compliance/ExpiredDocumentsList';
import TeacherInviteDialog from '@/components/admin/TeacherInviteDialog';
import DirectorReminderSection from '@/components/director/DirectorReminderSection';
import { RosterImportWizard } from '@/components/roster';
import { TopActionBar } from '@/components/dashboard/crm';
import type { School, Branch } from '@/types/api';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'students', label: 'Students' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'documents', label: 'Documents' },
  { id: 'reminders', label: 'Reminders' },
] as const;

type DirectorTab = (typeof TABS)[number]['id'];

const DirectorDashboard = () => {
  const { user } = useAuth();
  const { isDirector, branchId, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [school, setSchool] = useState<School | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRosterImportOpen, setIsRosterImportOpen] = useState(false);

  const rawTab = searchParams.get('tab') || 'overview';
  const activeTab: DirectorTab = TABS.some((t) => t.id === rawTab) ? (rawTab as DirectorTab) : 'overview';

  const { expiringDocs, expiredDocs, loading: complianceLoading } = useComplianceData(
    school?.id,
    branchId || undefined,
  );

  useEffect(() => {
    if (!roleLoading && !isDirector) {
      navigate('/dashboard');
      return;
    }
    if (user && isDirector) fetchSchoolData();
  }, [user, isDirector, roleLoading, branchId]);

  const fetchSchoolData = async () => {
    if (!user?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      const schoolData = await schoolService.getById(user.schoolId);
      setSchool(schoolData);

      if (branchId) {
        try {
          const branchData = await branchService.getById(branchId);
          setBranch(branchData);
        } catch {
          /* non-fatal */
        }
      }
    } catch (error) {
      console.error('DirectorDashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const setTab = (tab: DirectorTab) => {
    setSearchParams(tab === 'overview' ? {} : { tab });
  };

  if (loading || roleLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No school assigned</CardTitle>
            <CardDescription>Contact your platform administrator.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {branch && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Viewing:</span>
          <Badge variant="secondary" className="text-sm">
            {branch.name}
          </Badge>
          <span className="text-xs text-muted-foreground ml-2">Data is scoped to your branch</span>
        </div>
      )}

      <RosterImportWizard
        open={isRosterImportOpen}
        onOpenChange={setIsRosterImportOpen}
        schoolId={school.id}
        branchId={branchId || undefined}
        onComplete={() => {}}
      />

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-4">
        {TABS.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={activeTab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <TopActionBar
            schoolName={school.name}
            schoolId={school.id}
            onImportRoster={() => setIsRosterImportOpen(true)}
            onInviteParent={() => setTab('students')}
            isApproved={school.isApproved}
            isDirector
            branchName={branch?.name}
            branchId={branchId}
          />

          <Card>
            <CardHeader>
              <CardTitle>Director home</CardTitle>
              <CardDescription>
                Use the tabs above for breakdowns. Main day-to-day tools live on the school dashboard and
                compliance center.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/school-dashboard')}>
                <LayoutGrid className="h-4 w-4 mr-2 shrink-0" />
                School dashboard
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/compliance-center')}>
                <ClipboardList className="h-4 w-4 mr-2 shrink-0" />
                Compliance center
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/school/pending-documents')}>
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                Pending document review
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/school/expiring-documents')}>
                <Clock className="h-4 w-4 mr-2 shrink-0" />
                Expiring documents
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/school/teacher-compliance')}>
                <GraduationCap className="h-4 w-4 mr-2 shrink-0" />
                Staff compliance
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate('/all-documents')}>
                <Users className="h-4 w-4 mr-2 shrink-0" />
                All documents
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'students' && (
        <StudentComplianceBreakdown
          schoolId={school.id}
          branchId={branchId || undefined}
          isAdmin={false}
          onImportRoster={() => setIsRosterImportOpen(true)}
          onInviteParent={() => setTab('students')}
        />
      )}

      {activeTab === 'teachers' && (
        <>
          <div className="flex justify-end mb-4">
            <TeacherInviteDialog schoolId={school.id} branchId={branchId || undefined} />
          </div>
          <TeacherComplianceBreakdown schoolId={school.id} branchId={branchId || undefined} isAdmin={false} />
        </>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <ExpiringSoonList documents={expiringDocs} loading={complianceLoading} />
          <ExpiredDocumentsList documents={expiredDocs} loading={complianceLoading} />
        </div>
      )}

      {activeTab === 'reminders' && <DirectorReminderSection schoolId={school.id} />}
    </div>
  );
};

export default DirectorDashboard;

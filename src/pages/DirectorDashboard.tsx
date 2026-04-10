import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { schoolService } from '@/services/schoolService';
import { branchService } from '@/services/branchService';
import { documentService } from '@/services/documentService';
import { analyticsService } from '@/services/analyticsService';
import { invitationService } from '@/services/invitationService';
import { complianceService } from '@/services/complianceService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, MapPin, CheckCircle } from 'lucide-react';
import { useComplianceData } from '@/hooks/useComplianceData';
import { StudentComplianceBreakdown } from '@/components/compliance/StudentComplianceBreakdown';
import { TeacherComplianceBreakdown } from '@/components/compliance/TeacherComplianceBreakdown';
import { ExpiringSoonList } from '@/components/compliance/ExpiringSoonList';
import { ExpiredDocumentsList } from '@/components/compliance/ExpiredDocumentsList';
import TeacherInviteDialog from '@/components/admin/TeacherInviteDialog';
import DirectorReminderSection from '@/components/director/DirectorReminderSection';
import { RosterImportWizard } from '@/components/roster';
import type { School, Branch } from '@/types/api';

import {
  UrgentActionsWidget,
  PendingDocumentsWidget,
  InvitesStatusWidget,
  ComplianceSnapshotWidget,
  DirectoryCard,
  WorkInboxWidget,
  TopActionBar,
  calculatePriorityScore,
  type UrgentAction,
  type PendingDocument,
  type InviteStats,
  type InboxItem,
} from '@/components/dashboard/crm';

const DirectorDashboard = () => {
  const { user } = useAuth();
  const { isDirector, branchId, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const [school, setSchool] = useState<School | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const [isRosterImportOpen, setIsRosterImportOpen] = useState(false);

  // CRM state
  const [urgentActions, setUrgentActions] = useState<UrgentAction[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [inviteStats, setInviteStats] = useState<InviteStats>({ 
    totalInvited: 0, accepted: 0, pending: 0, notInvited: 0, last7DaysActivity: 0 
  });
  const [directoryStats, setDirectoryStats] = useState({ 
    students: { total: 0, missingDocs: 0 }, 
    parents: { total: 0, notInvited: 0 }, 
    staff: { total: 0, expiring: 0 }, 
    documents: { total: 0, pending: 0 } 
  });
  const [complianceData, setComplianceData] = useState({ 
    doh: { percentage: 0, overdueCount: 0, dueSoonCount: 0 }, 
    facility: { percentage: 0, overdueCount: 0, dueSoonCount: 0 } 
  });

  const { expiringDocs, expiredDocs, loading: complianceLoading } = useComplianceData(school?.id, branchId || undefined);

  useEffect(() => {
    if (!roleLoading && !isDirector) { navigate('/dashboard'); return; }
    if (user && isDirector) fetchSchoolData();
  }, [user, isDirector, roleLoading, branchId]);

  const fetchSchoolData = async () => {
    if (!user?.schoolId) { setLoading(false); return; }

    try {
      const schoolData = await schoolService.getById(user.schoolId);
      setSchool(schoolData);

      if (branchId) {
        try {
          const branchData = await branchService.getById(branchId);
          setBranch(branchData);
        } catch {
          // Branch not found is non-fatal
        }
      }

      setLoading(false);
      if (schoolData) fetchCRMStats(user.schoolId, branchId);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const fetchCRMStats = useCallback(async (schoolId: string, directorBranchId: string | null) => {
    setStatsLoading(true);
    try {
      const [dashboardRes, pendingDocsRes, invitationsRes, complianceStatsRes] = await Promise.all([
        analyticsService.getDashboard(schoolId),
        documentService.search({
          schoolId,
          branchId: directorBranchId ?? undefined,
          status: 'pending',
          limit: 10,
        }),
        invitationService.list(schoolId),
        analyticsService.getComplianceStats({ schoolId, branchId: directorBranchId ?? undefined }),
      ]);

      const dash = dashboardRes as any;
      const studentCount: number = dash?.studentCount ?? dash?.counts?.students ?? 0;
      const teacherCount: number = dash?.teacherCount ?? dash?.counts?.teachers ?? 0;
      const expiringStaff: number = dash?.expiringStaffCount ?? 0;

      // Pending documents
      const pendingDocsList: any[] = Array.isArray(pendingDocsRes) ? pendingDocsRes : (pendingDocsRes as any)?.data ?? [];
      const pendingCount = pendingDocsList.length;
      const pendingDocs: PendingDocument[] = pendingDocsList.map((d: any) => ({
        id: d.id,
        entityName: d.owner?.name ?? d.studentName ?? 'Unknown',
        entityType: 'student' as const,
        documentType: d.documentType?.name ?? d.category ?? 'Document',
        status: 'pending' as const,
        studentId: d.ownerUserId ?? d.studentId,
      }));

      // Build inbox items from pending docs
      const inbox: InboxItem[] = [];
      pendingDocsList.slice(0, 5).forEach((doc: any) => {
        inbox.push({
          id: `doc-${doc.id}`,
          type: 'document',
          entityName: doc.owner?.name ?? doc.studentName ?? 'Unknown',
          entityType: 'student',
          description: `${doc.documentType?.name ?? doc.category ?? 'Document'} needs review`,
          priorityScore: 80,
          ctaLabel: 'Review',
          route: `/school/pending-documents`,
          entityId: doc.ownerUserId ?? doc.studentId,
        });
      });

      // Invitations
      const allInvitations: any[] = Array.isArray(invitationsRes) ? invitationsRes : (invitationsRes as any)?.data ?? [];
      const inviteList = directorBranchId
        ? allInvitations.filter((i: any) => i.branchId === directorBranchId)
        : allInvitations;
      const acceptedInvites = inviteList.filter((i: any) => i.status === 'accepted').length;
      const pendingInvites = inviteList.filter((i: any) => i.status === 'pending').length;
      const notInvitedCount = Math.max(0, studentCount - inviteList.length);

      const last7Days = inviteList.filter((i: any) => {
        const created = new Date(i.createdAt ?? i.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }).length;

      // Stale invites for inbox
      const staleInvites = inviteList.filter((i: any) => {
        if (i.status !== 'pending') return false;
        const createdAt = new Date(i.createdAt ?? i.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return createdAt < weekAgo;
      });
      staleInvites.slice(0, 3).forEach((inv: any) => {
        inbox.push({
          id: `inv-${inv.id}`,
          type: 'invite',
          entityName: `${inv.parentFirstName ?? inv.firstName ?? ''} ${inv.parentLastName ?? inv.lastName ?? inv.email}`.trim(),
          entityType: 'parent',
          description: 'Invitation pending >7 days',
          priorityScore: 40,
          ctaLabel: 'Resend',
          route: '/director-dashboard',
        });
      });

      // Build urgent actions with priority
      const actions: UrgentAction[] = [];
      if (pendingCount > 0) {
        const action: UrgentAction = { 
          id: 'pending', 
          label: 'documents pending', 
          count: pendingCount, 
          type: 'action-needed', 
          ctaLabel: 'Review', 
          route: '/school/pending-documents', 
          icon: 'documents',
          blocksCompliance: true,
        };
        action.priorityScore = calculatePriorityScore(action);
        actions.push(action);
      }
      if (expiringStaff > 0) {
        const action: UrgentAction = {
          id: 'expiring-staff',
          label: 'staff credentials expiring',
          count: expiringStaff,
          type: 'due-soon',
          daysUntilDue: 30,
          ctaLabel: 'View',
          route: '/director-dashboard',
          icon: 'certifications',
          isLicensingRelated: true,
        };
        action.priorityScore = calculatePriorityScore(action);
        actions.push(action);
      }
      if (notInvitedCount > 0) {
        const action: UrgentAction = {
          id: 'not-invited',
          label: 'parents not invited',
          count: notInvitedCount,
          type: 'action-needed',
          ctaLabel: 'Invite',
          route: '/director-dashboard',
          icon: 'invites',
        };
        action.priorityScore = calculatePriorityScore(action);
        actions.push(action);
      }

      // Compliance stats
      const compStats = complianceStatsRes as any;
      const statsObj = Array.isArray(compStats) ? compStats[0] : compStats;
      if (statsObj) {
        setComplianceData({
          doh: {
            percentage: statsObj.studentComplianceRate ?? statsObj.student_compliance_rate ?? 0,
            overdueCount: statsObj.totalExpired ?? statsObj.total_expired ?? 0,
            dueSoonCount: statsObj.totalExpiringSoon ?? statsObj.total_expiring_soon ?? 0,
          },
          facility: {
            percentage: statsObj.teacherComplianceRate ?? statsObj.teacher_compliance_rate ?? 0,
            overdueCount: 0,
            dueSoonCount: expiringStaff,
          },
        });
      }

      setUrgentActions(actions);
      setPendingDocuments(pendingDocs);
      setInboxItems(inbox);
      setInviteStats({
        totalInvited: inviteList.length,
        accepted: acceptedInvites,
        pending: pendingInvites,
        notInvited: notInvitedCount,
        last7DaysActivity: last7Days,
      });
      setDirectoryStats({ 
        students: { total: studentCount, missingDocs: 0 }, 
        parents: { total: inviteList.length, notInvited: notInvitedCount }, 
        staff: { total: teacherCount, expiring: expiringStaff }, 
        documents: { total: 0, pending: pendingCount } 
      });
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  }, []);

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
            <CardTitle>No School Assigned</CardTitle>
            <CardDescription>Contact your administrator.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Branch Scope Indicator */}
      {branch && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Viewing:</span>
          <Badge variant="secondary" className="text-sm">{branch.name}</Badge>
          <span className="text-xs text-muted-foreground ml-2">All data is scoped to your branch</span>
        </div>
      )}
      
      <RosterImportWizard 
        open={isRosterImportOpen} 
        onOpenChange={setIsRosterImportOpen} 
        schoolId={school.id} 
        branchId={branchId || undefined} 
        onComplete={() => fetchCRMStats(school.id, branchId)} 
      />

      {/* Render content based on active tab */}
      {activeTab === 'students' && (
        <StudentComplianceBreakdown 
          schoolId={school.id} 
          branchId={branchId || undefined} 
          isAdmin={false}
          onImportRoster={() => setIsRosterImportOpen(true)}
          onInviteParent={() => navigate('/director-dashboard?tab=students')}
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

      {activeTab === 'reminders' && (
        <DirectorReminderSection schoolId={school.id} />
      )}

      {activeTab === 'overview' && (
        <>
          {/* Top Action Bar */}
          <TopActionBar
            schoolName={school.name}
            schoolId={school.id}
            onImportRoster={() => setIsRosterImportOpen(true)}
            onInviteParent={() => navigate('/director-dashboard?tab=students')}
            isApproved={school.isApproved}
            isDirector={true}
            branchName={branch?.name}
            branchId={branchId}
          />

          {/* Zone B: Today Command Center */}
          <div className="grid lg:grid-cols-2 gap-6">
            <UrgentActionsWidget 
              actions={urgentActions} 
              loading={statsLoading} 
              lastUpdated={lastUpdated}
            />
            <WorkInboxWidget 
              items={inboxItems} 
              loading={statsLoading} 
            />
            <InvitesStatusWidget 
              stats={inviteStats} 
              loading={statsLoading}
              onSendInvites={() => navigate('/director-dashboard?tab=students')}
            />
            <ComplianceSnapshotWidget
              dohCompliance={{
                name: 'Student Compliance',
                percentage: complianceData.doh.percentage,
                overdueCount: complianceData.doh.overdueCount,
                dueSoonCount: complianceData.doh.dueSoonCount,
                icon: CheckCircle,
              }}
              facilityCompliance={{
                name: 'Staff Compliance',
                percentage: complianceData.facility.percentage,
                overdueCount: complianceData.facility.overdueCount,
                dueSoonCount: complianceData.facility.dueSoonCount,
                icon: Users,
              }}
              loading={statsLoading}
            />
          </div>

          {/* Zone C: Directory Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DirectoryCard 
              type="students" 
              total={directoryStats.students.total} 
              route="/director-dashboard?tab=students" 
            />
            <DirectoryCard 
              type="parents" 
              total={directoryStats.parents.total} 
              alertCount={directoryStats.parents.notInvited}
              alertLabel="not invited"
              route="/director-dashboard?tab=students" 
            />
            <DirectoryCard 
              type="staff" 
              total={directoryStats.staff.total} 
              alertCount={directoryStats.staff.expiring}
              alertLabel="expiring"
              route="/director-dashboard?tab=teachers" 
            />
            <DirectoryCard 
              type="documents" 
              total={directoryStats.documents.pending} 
              alertCount={directoryStats.documents.pending} 
              alertLabel="pending" 
              route="/school/pending-documents" 
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DirectorDashboard;

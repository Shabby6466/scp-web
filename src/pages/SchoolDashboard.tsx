import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { schoolService } from "@/services/schoolService";
import { branchService } from "@/services/branchService";
import { documentService } from "@/services/documentService";
import { analyticsService } from "@/services/analyticsService";
import { invitationService } from "@/services/invitationService";
import { complianceService } from "@/services/complianceService";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, CheckCircle, Users, 
  GraduationCap
} from "lucide-react";
import { RosterImportWizard } from "@/components/roster";
import AdminDocuments from "@/components/admin/AdminDocuments";
import { DirectorManagement } from "@/components/school/DirectorManagement";
import TeacherInviteDialog from "@/components/admin/TeacherInviteDialog";
import SchoolSetupWizard from "@/components/school/SchoolSetupWizard";
import SchoolReminderSection from "@/components/school/SchoolReminderSection";
import type { School, Branch } from "@/types/api";

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
} from "@/components/dashboard/crm";

const SchoolDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { canManageSchool, isParent, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Core state
  const [school, setSchool] = useState<School | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // CRM Stats state
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [urgentActions, setUrgentActions] = useState<UrgentAction[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [inviteStats, setInviteStats] = useState<InviteStats>({
    totalInvited: 0,
    accepted: 0,
    pending: 0,
    notInvited: 0,
    last7DaysActivity: 0,
  });
  const [directoryStats, setDirectoryStats] = useState({
    students: { total: 0, missingDocs: 0 },
    parents: { total: 0, notInvited: 0 },
    staff: { total: 0, expiring: 0 },
    documents: { total: 0, pending: 0 },
  });
  const [complianceData, setComplianceData] = useState({
    doh: { percentage: 0, overdueCount: 0, dueSoonCount: 0 },
    facility: { percentage: 0, overdueCount: 0, dueSoonCount: 0 },
  });

  // UI state
  const [isRosterImportOpen, setIsRosterImportOpen] = useState(false);
  const [parentEmail, setParentEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  const activeTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'students') {
      navigate('/school/students', { replace: true });
      return;
    }
    if (tab === 'teachers') {
      navigate('/school/staff', { replace: true });
      return;
    }
    if (tab === 'parents') {
      navigate('/school/parents', { replace: true });
      return;
    }
  }, [searchParams, navigate]);

  // Auth and role check
  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (isParent) { navigate('/dashboard', { replace: true }); return; }
    if (!canManageSchool) { navigate('/not-authorized', { replace: true }); return; }
    fetchSchoolData();
  }, [user, authLoading, roleLoading, canManageSchool, isParent, navigate]);

  const fetchSchoolData = async () => {
    if (!user?.schoolId) {
      navigate("/school-register");
      return;
    }

    try {
      const [schoolData, branchesData] = await Promise.all([
        schoolService.getById(user.schoolId),
        branchService.listBySchool(user.schoolId),
      ]);

      setSchool(schoolData);
      const branchesList: Branch[] = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];
      setBranches(branchesList);
      setLoading(false);

      if (schoolData) {
        fetchCRMStats(user.schoolId);
      }
    } catch (error) {
      console.error("Error fetching school data:", error);
      setLoading(false);
    }
  };

  const fetchCRMStats = useCallback(async (schoolId: string) => {
    setStatsLoading(true);
    try {
      const [dashboardRes, pendingDocsRes, expiringDocsRes, invitationsRes, complianceStatsRes, requirementsRes] = await Promise.all([
        analyticsService.getDashboard(schoolId),
        documentService.search({ schoolId, status: 'pending', limit: 10 }),
        analyticsService.getExpiringDocuments({ schoolId, days: 30 }),
        invitationService.list(schoolId),
        analyticsService.getComplianceStats({ schoolId }),
        complianceService.listRequirements(schoolId),
      ]);

      const dash = dashboardRes as any;
      const studentCount: number = dash?.studentCount ?? dash?.counts?.students ?? 0;
      const teacherCount: number = dash?.teacherCount ?? dash?.counts?.teachers ?? 0;
      const totalDocs: number = dash?.documentCount ?? dash?.counts?.documents ?? 0;
      const parentCount: number = dash?.parentCount ?? dash?.counts?.parents ?? 0;
      const expiringStaff: number = dash?.expiringStaffCount ?? 0;
      const studentsWithoutDocs: number = dash?.studentsWithoutDocs ?? 0;

      const pendingDocsList: any[] = Array.isArray(pendingDocsRes) ? pendingDocsRes : (pendingDocsRes as any)?.data ?? [];
      const pendingCount = pendingDocsList.length;

      const expiringDocs: any[] = Array.isArray(expiringDocsRes) ? expiringDocsRes : (expiringDocsRes as any)?.data ?? [];
      const expiringCount = expiringDocs.length;

      const invitations: any[] = Array.isArray(invitationsRes) ? invitationsRes : (invitationsRes as any)?.data ?? [];

      const allRequirements: any[] = Array.isArray(requirementsRes) ? requirementsRes : (requirementsRes as any)?.data ?? [];
      const overdueReqs = allRequirements.filter((r: any) => r.status === 'overdue' || r.status === 'OVERDUE');

      // Build urgent actions with priority scoring
      const actions: UrgentAction[] = [];
      if (pendingCount > 0) {
        const action: UrgentAction = {
          id: 'pending-docs',
          label: 'documents pending review',
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
      if (expiringCount > 0) {
        const action: UrgentAction = {
          id: 'expiring-docs',
          label: 'documents expiring soon',
          count: expiringCount,
          type: 'due-soon',
          daysUntilDue: 14,
          ctaLabel: 'View',
          route: '/school/expiring-documents',
          icon: 'certifications',
        };
        action.priorityScore = calculatePriorityScore(action);
        actions.push(action);
      }

      if (overdueReqs.length > 0) {
        const action: UrgentAction = {
          id: 'overdue-compliance',
          label: 'compliance items overdue',
          count: overdueReqs.length,
          type: 'overdue',
          ctaLabel: 'Use sidebar',
          icon: 'compliance',
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
          route: '/school/staff',
          icon: 'certifications',
          isLicensingRelated: true,
        };
        action.priorityScore = calculatePriorityScore(action);
        actions.push(action);
      }

      // Parents not invited
      const acceptedInvites = invitations.filter((i: any) => i.status === 'accepted').length;
      const pendingInvites = invitations.filter((i: any) => i.status === 'pending').length;
      const notInvitedCount = Math.max(0, studentCount - invitations.length);
      
      if (notInvitedCount > 0) {
        const action: UrgentAction = {
          id: 'parents-not-invited',
          label: 'parents not yet invited',
          count: notInvitedCount,
          type: 'action-needed',
          ctaLabel: 'Send Invites',
          route: '/school/parents',
          icon: 'invites',
        };
        action.priorityScore = calculatePriorityScore(action);
        actions.push(action);
      }

      setUrgentActions(actions);

      // Build Work Inbox items
      const inbox: InboxItem[] = [];
      pendingDocsList.slice(0, 5).forEach((doc: any) => {
        const ownerName = doc.owner?.name ?? doc.studentName ?? doc.entityName ?? 'Unknown';
        inbox.push({
          id: `doc-${doc.id}`,
          type: 'document',
          entityName: ownerName,
          entityType: 'student',
          description: `${doc.documentType?.name ?? doc.category ?? 'Document'} needs review`,
          priorityScore: 80,
          ctaLabel: 'Review',
          route: `/school/pending-documents`,
          entityId: doc.ownerUserId ?? doc.studentId,
        });
      });

      expiringDocs.slice(0, 3).forEach((doc: any) => {
        inbox.push({
          id: `exp-${doc.id}`,
          type: 'expiring',
          entityName: doc.entityName ?? doc.ownerName ?? 'Unknown',
          entityType: (doc.entityType ?? 'student') as 'student' | 'staff',
          description: `${doc.documentType ?? 'Document'} expires soon`,
          dueDate: doc.expirationDate,
          daysOverdue: (doc.daysUntilExpiry ?? 0) < 0 ? Math.abs(doc.daysUntilExpiry) : undefined,
          priorityScore: (doc.daysUntilExpiry ?? 30) <= 7 ? 90 : 50,
          ctaLabel: 'View',
          route: '/school/expiring-documents',
        });
      });

      // Stale pending invites for inbox
      const staleInvites = invitations.filter((i: any) => {
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
          route: '/school/parents',
        });
      });

      setInboxItems(inbox);

      // Build pending documents list
      const pendingDocs: PendingDocument[] = pendingDocsList.map((doc: any) => ({
        id: doc.id,
        entityName: doc.owner?.name ?? doc.studentName ?? 'Unknown',
        entityType: 'student' as const,
        documentType: doc.documentType?.name ?? doc.category ?? 'Document',
        status: (doc.status ?? 'pending') as 'pending' | 'missing' | 'rejected',
        studentId: doc.ownerUserId ?? doc.studentId,
      }));
      setPendingDocuments(pendingDocs);

      // Invite stats
      const last7Days = invitations.filter((i: any) => {
        const created = new Date(i.createdAt ?? i.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }).length;

      setInviteStats({
        totalInvited: invitations.length,
        accepted: acceptedInvites,
        pending: pendingInvites,
        notInvited: notInvitedCount,
        last7DaysActivity: last7Days,
      });

      // Directory stats
      setDirectoryStats({
        students: { total: studentCount, missingDocs: studentsWithoutDocs },
        parents: { total: parentCount, notInvited: notInvitedCount },
        staff: { total: teacherCount, expiring: expiringStaff },
        documents: { total: totalDocs, pending: pendingCount },
      });

      // Compliance data
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
            overdueCount: overdueReqs.length,
            dueSoonCount: 0,
          },
        });
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching CRM stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !parentEmail) return;
    setSendingInvite(true);
    try {
      await invitationService.send({
        schoolId: school.id,
        email: parentEmail.trim(),
        role: 'PARENT',
      });
      toast({
        title: "Invitation sent!",
        description: `Enrollment link sent to ${parentEmail}`
      });
      setParentEmail("");
      if (school) fetchCRMStats(school.id);
    } catch (error: any) {
      toast({
        title: "Failed to send invitation",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setSendingInvite(false);
    }
  };

  // Loading state
  if (loading || authLoading || roleLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // No school found
  if (!school) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No School Found</CardTitle>
            <CardDescription>You don't have a school registered yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/school-register")}>Register Your School</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === 'documents') {
    return (
      <div className="p-6">
        <AdminDocuments />
      </div>
    );
  }

  if (activeTab === 'directors') {
    return (
      <div className="p-6">
        {school && <DirectorManagement schoolId={school.id} />}
      </div>
    );
  }

  // CRM Dashboard Overview
  return (
    <div className="p-6 space-y-6">

      {/* Roster Import Wizard */}
      <RosterImportWizard 
        open={isRosterImportOpen} 
        onOpenChange={setIsRosterImportOpen} 
        schoolId={school.id}
        onComplete={() => fetchCRMStats(school.id)}
      />

      {/* Approval Warning */}
      {!school.isApproved && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <h3 className="font-bold mb-1">Awaiting Admin Approval</h3>
                <p className="text-sm text-muted-foreground">
                  Your school registration is under review. You'll receive full access once approved.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Wizard (if applicable) */}
      {school.isApproved && <SchoolSetupWizard schoolId={school.id} schoolName={school.name} />}

      {/* Top Action Bar */}
      <TopActionBar
        schoolName={school.name}
        schoolId={school.id}
        branches={branches.map(b => ({ id: b.id, branch_name: b.name }))}
        selectedBranchId={selectedBranchId}
        onBranchChange={setSelectedBranchId}
        onImportRoster={() => setIsRosterImportOpen(true)}
        onInviteParent={() => navigate('/school/parents')}
        isApproved={school.isApproved}
      />

      {/* Zone B: Today Command Center */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Urgent Actions */}
        <UrgentActionsWidget
          actions={urgentActions}
          loading={statsLoading}
          lastUpdated={lastUpdated}
        />

        {/* Work Inbox */}
        <WorkInboxWidget
          items={inboxItems}
          loading={statsLoading}
        />

        {/* Invites Status */}
        <InvitesStatusWidget
          stats={inviteStats}
          loading={statsLoading}
          onSendInvites={() => navigate('/school/parents')}
        />

        {/* Compliance Snapshot */}
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
          alertCount={directoryStats.students.missingDocs}
          alertLabel="missing docs"
          route="/school/students"
          onClick={() => navigate('/school/students')}
        />
        <DirectoryCard
          type="parents"
          total={directoryStats.parents.total}
          alertCount={directoryStats.parents.notInvited}
          alertLabel="not invited"
          route="/school/parents"
          onClick={() => navigate('/school/parents')}
        />
        <DirectoryCard
          type="staff"
          total={directoryStats.staff.total}
          alertCount={directoryStats.staff.expiring}
          alertLabel="expiring"
          route="/school/staff"
          onClick={() => navigate('/school/staff')}
        />
        <DirectoryCard
          type="documents"
          total={directoryStats.documents.total}
          alertCount={directoryStats.documents.pending}
          alertLabel="pending"
          route="/school/pending-documents"
        />
      </div>

      {/* Invite Staff Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Invite Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherInviteDialog schoolId={school.id} />
        </CardContent>
      </Card>

      {/* Reminders Section */}
      {school.isApproved && <SchoolReminderSection schoolId={school.id} />}
    </div>
  );
};

export default SchoolDashboard;

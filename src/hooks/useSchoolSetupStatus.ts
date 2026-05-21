import { useState, useEffect, useCallback } from 'react';
import { api, unwrapList } from '@/lib/api';
import { schoolService } from '@/services/schoolService';
import { documentTypeService } from '@/services/documentTypeService';
import { documentCategoryService } from '@/services/documentCategoryService';
import { requirementService } from '@/services/requirementService';
import { addDays, isBefore } from 'date-fns';

export interface SchoolSetupStatus {
  hasRequiredDocuments: boolean;
  hasStaff: boolean;
  hasStudents: boolean;
  hasSentParentInvites: boolean;
  hasComplianceActivity: boolean;

  requiredDocumentCount: number;
  staffCount: number;
  studentCount: number;
  parentInviteCount: number;
  approvedDocumentCount: number;

  expiringStaffCount: number;
  studentsWithMissingDocs: number;
  pendingInviteCount: number;
  acceptedInviteCount: number;
  dohCompliancePercent: number;
  facilityCompliancePercent: number;

  loading: boolean;
  error: string | null;
}

function compliancePercentForTypes(
  requirements: { documentTypeId: string; status: string }[],
  typeIds: string[],
): number {
  if (typeIds.length === 0) return 100;
  const relevant = requirements.filter((r) => typeIds.includes(r.documentTypeId));
  if (relevant.length === 0) return 0;
  const approved = relevant.filter((r) => r.status === 'APPROVED').length;
  return Math.round((approved / relevant.length) * 100);
}

export const useSchoolSetupStatus = (schoolId: string | null, branchId?: string | null) => {
  const [status, setStatus] = useState<SchoolSetupStatus>({
    hasRequiredDocuments: false,
    hasStaff: false,
    hasStudents: false,
    hasSentParentInvites: false,
    hasComplianceActivity: false,
    requiredDocumentCount: 0,
    staffCount: 0,
    studentCount: 0,
    parentInviteCount: 0,
    approvedDocumentCount: 0,
    expiringStaffCount: 0,
    studentsWithMissingDocs: 0,
    pendingInviteCount: 0,
    acceptedInviteCount: 0,
    dohCompliancePercent: 0,
    facilityCompliancePercent: 0,
    loading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    if (!schoolId) {
      setStatus((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setStatus((prev) => ({ ...prev, loading: true, error: null }));

      const branchParam = branchId ? `&branchId=${branchId}` : '';

      const [
        requiredDocsData,
        staffData,
        studentsData,
        invitesData,
        approvedDocsData,
        pendingInvitesData,
        acceptedInvitesData,
        categoriesData,
        requirementsData,
      ] = await Promise.all([
        documentTypeService.list({ schoolId }),
        api
          .get(
            `/schools/${schoolId}/users?role=TEACHER${branchId ? `&branchId=${branchId}` : ''}&limit=500`,
          )
          .then(unwrapList),
        schoolService
          .listStudents(schoolId)
          .then((list) =>
            branchId
              ? (list as { branchId?: string | null }[]).filter(
                  (p) => p.branchId === branchId,
                )
              : list,
          ),
        api.get(`/invitations?schoolId=${schoolId}${branchParam}`),
        api.get(`/documents/search?schoolId=${schoolId}&status=APPROVED`),
        api.get(`/invitations?schoolId=${schoolId}${branchParam}&status=pending`),
        api.get(`/invitations?schoolId=${schoolId}${branchParam}&status=accepted`),
        documentCategoryService.list({ schoolId }),
        requirementService.list({ schoolId, ...(branchId ? { branchId } : {}) }),
      ]);

      const documentTypes = unwrapList(requiredDocsData);
      const categories = unwrapList(categoriesData);
      const requirements = unwrapList(requirementsData);

      const dohCategoryId = categories.find((c) => c.slug === 'doh')?.id;
      const facilityCategoryId = categories.find((c) => c.slug === 'facility-safety')?.id;
      const dohTypeIds = documentTypes
        .filter((t) => t.categoryId === dohCategoryId)
        .map((t) => t.id);
      const facilityTypeIds = documentTypes
        .filter((t) => t.categoryId === facilityCategoryId)
        .map((t) => t.id);

      const requiredDocumentCount = documentTypes.length;
      const staffCount = Array.isArray(staffData) ? staffData.length : 0;
      const studentCount = Array.isArray(studentsData) ? studentsData.length : 0;
      const parentInviteCount = Array.isArray(invitesData) ? invitesData.length : 0;
      const approvedDocumentCount = Array.isArray(approvedDocsData) ? approvedDocsData.length : 0;
      const pendingInviteCount = Array.isArray(pendingInvitesData) ? pendingInvitesData.length : 0;
      const acceptedInviteCount = Array.isArray(acceptedInvitesData) ? acceptedInvitesData.length : 0;

      const thirtyDaysFromNow = addDays(new Date(), 30);
      let expiringStaffCount = 0;
      if (Array.isArray(staffData)) {
        expiringStaffCount = staffData.filter((staff: { certification_expiry?: string }) => {
          if (!staff.certification_expiry) return false;
          return isBefore(new Date(staff.certification_expiry), thirtyDaysFromNow);
        }).length;
      }

      const dohCompliancePercent = compliancePercentForTypes(requirements, dohTypeIds);
      const facilityCompliancePercent = compliancePercentForTypes(requirements, facilityTypeIds);

      setStatus({
        hasRequiredDocuments: requiredDocumentCount >= 3,
        hasStaff: staffCount >= 1,
        hasStudents: studentCount >= 1,
        hasSentParentInvites: parentInviteCount >= 1,
        hasComplianceActivity: approvedDocumentCount >= 1,
        requiredDocumentCount,
        staffCount,
        studentCount,
        parentInviteCount,
        approvedDocumentCount,
        expiringStaffCount,
        studentsWithMissingDocs: 0,
        pendingInviteCount,
        acceptedInviteCount,
        dohCompliancePercent,
        facilityCompliancePercent,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.error('Error fetching school setup status:', error);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load setup status',
      }));
    }
  }, [schoolId, branchId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const completedSteps = [
    status.hasRequiredDocuments,
    status.hasStaff,
    status.hasStudents,
    status.hasSentParentInvites,
    status.hasComplianceActivity,
  ].filter(Boolean).length;

  const progress = (completedSteps / 5) * 100;
  const isComplete = completedSteps === 5;

  return {
    ...status,
    completedSteps,
    progress,
    isComplete,
    refetch: fetchStatus,
  };
};

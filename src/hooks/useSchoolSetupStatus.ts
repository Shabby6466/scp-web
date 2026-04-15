import { useState, useEffect, useCallback } from 'react';
import { api, unwrapList } from '@/lib/api';
import { schoolService } from '@/services/schoolService';
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
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));

      const branchParam = branchId ? `&branchId=${branchId}` : '';

      const [
        requiredDocsData,
        staffData,
        studentsData,
        invitesData,
        approvedDocsData,
        pendingInvitesData,
        acceptedInvitesData,
        dohTypesData,
        complianceReqsData,
        facilityTypesData,
      ] = await Promise.all([
        api.get(`/document-types?schoolId=${schoolId}`),
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
        api.get(`/documents/search?schoolId=${schoolId}&status=approved`),
        api.get(`/invitations?schoolId=${schoolId}${branchParam}&status=pending`),
        api.get(`/invitations?schoolId=${schoolId}${branchParam}&status=accepted`),
        api.get(`/schools/${schoolId}/inspection-types`),
        api.get(`/schools/${schoolId}/compliance-requirements`),
        api.get(`/schools/${schoolId}/inspection-types`),
      ]);

      const requiredDocumentCount = Array.isArray(requiredDocsData) ? requiredDocsData.length : 0;
      const staffCount = Array.isArray(staffData) ? staffData.length : 0;
      const studentCount = Array.isArray(studentsData) ? studentsData.length : 0;
      const parentInviteCount = Array.isArray(invitesData) ? invitesData.length : 0;
      const approvedDocumentCount = Array.isArray(approvedDocsData) ? approvedDocsData.length : 0;
      const pendingInviteCount = Array.isArray(pendingInvitesData) ? pendingInvitesData.length : 0;
      const acceptedInviteCount = Array.isArray(acceptedInvitesData) ? acceptedInvitesData.length : 0;

      const thirtyDaysFromNow = addDays(new Date(), 30);
      let expiringStaffCount = 0;
      if (Array.isArray(staffData)) {
        expiringStaffCount = staffData.filter((staff: any) => {
          if (!staff.certification_expiry) return false;
          return isBefore(new Date(staff.certification_expiry), thirtyDaysFromNow);
        }).length;
      }

      const dohTotal = Array.isArray(dohTypesData) ? dohTypesData.length : 1;
      const completedReqs = Array.isArray(complianceReqsData) ? complianceReqsData.length : 0;
      const dohCompliancePercent = Math.round((completedReqs / Math.max(dohTotal, 1)) * 100);
      
      const facilityTotal = Array.isArray(facilityTypesData) ? facilityTypesData.length : 1;
      const facilityCompliancePercent = Math.round((completedReqs / Math.max(facilityTotal, 1)) * 100);

      const studentsWithMissingDocs = 0;

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
        studentsWithMissingDocs,
        pendingInviteCount,
        acceptedInviteCount,
        dohCompliancePercent,
        facilityCompliancePercent,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching school setup status:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load setup status',
      }));
    }
  }, [schoolId, branchId]);

  useEffect(() => {
    fetchStatus();
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

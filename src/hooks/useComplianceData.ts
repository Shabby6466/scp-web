import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { analyticsService } from '@/services/analyticsService';
import { useUserRole } from './useUserRole';
import { useAuth } from '@/contexts/AuthContext';

interface ComplianceStats {
  total_students: number;
  compliant_students: number;
  student_compliance_rate: number;
  total_teachers: number;
  compliant_teachers: number;
  teacher_compliance_rate: number;
  total_expiring_soon: number;
  total_expired: number;
}

interface ExpiringDocument {
  id: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  school_id: string;
  school_name: string;
  expiration_date: string;
  days_until_expiry: number;
}

interface ExpiredDocument {
  id: string;
  document_type: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  school_id: string;
  school_name: string;
  expiration_date: string;
  days_expired: number;
}

export const useComplianceData = (schoolId?: string, branchId?: string) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([]);
  const [expiredDocs, setExpiredDocs] = useState<ExpiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplianceData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let targetSchoolId = schoolId;
      if (!isAdmin && !schoolId && user.schoolId) {
        targetSchoolId = user.schoolId;
      }

      const [statsData, expiringData, expiredData] = await Promise.all([
        analyticsService.complianceStats(isAdmin ? undefined : targetSchoolId),
        analyticsService.expiringDocuments(60, isAdmin ? undefined : targetSchoolId),
        analyticsService.expiredDocuments(isAdmin ? undefined : targetSchoolId),
      ]);

      if (statsData && (Array.isArray(statsData) ? statsData.length > 0 : true)) {
        setStats(Array.isArray(statsData) ? statsData[0] : statsData);
      }

      let filteredExpiring = expiringData || [];
      let filteredExpired = expiredData || [];

      if (branchId) {
        const [branchStudents, branchTeachers] = await Promise.all([
          api.get(`/users?role=STUDENT&branchId=${branchId}`),
          api.get(`/users?role=TEACHER&branchId=${branchId}`),
        ]);

        const branchStudentIds = new Set((branchStudents || []).map((s: any) => s.id));
        const branchTeacherIds = new Set((branchTeachers || []).map((t: any) => t.id));

        filteredExpiring = filteredExpiring.filter((d: ExpiringDocument) => {
          if (d.entity_type === 'student') return branchStudentIds.has(d.entity_id);
          if (d.entity_type === 'teacher') return branchTeacherIds.has(d.entity_id);
          return true;
        });

        filteredExpired = filteredExpired.filter((d: ExpiredDocument) => {
          if (d.entity_type === 'student') return branchStudentIds.has(d.entity_id);
          if (d.entity_type === 'teacher') return branchTeacherIds.has(d.entity_id);
          return true;
        });
      }

      setExpiringDocs(filteredExpiring);
      setExpiredDocs(filteredExpired);

    } catch (err: any) {
      console.error('Error fetching compliance data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, [user, schoolId, branchId, isAdmin]);

  return { 
    stats, 
    expiringDocs, 
    expiredDocs, 
    loading, 
    error,
    refresh: fetchComplianceData 
  };
};

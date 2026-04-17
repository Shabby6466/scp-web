import { useState, useEffect, useCallback } from 'react';
import { api, unwrapList } from '@/lib/api';
import { schoolService } from '@/services/schoolService';
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

function num(raw: Record<string, unknown>, snake: string, camel?: string): number {
  const v = raw[snake] ?? (camel ? raw[camel] : undefined);
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeComplianceStats(raw: Record<string, unknown>): ComplianceStats {
  return {
    total_students: num(raw, 'total_students', 'totalStudents'),
    compliant_students: num(raw, 'compliant_students', 'compliantStudents'),
    student_compliance_rate: num(raw, 'student_compliance_rate', 'studentComplianceRate'),
    total_teachers: num(raw, 'total_teachers', 'totalTeachers'),
    compliant_teachers: num(raw, 'compliant_teachers', 'compliantTeachers'),
    teacher_compliance_rate: num(raw, 'teacher_compliance_rate', 'teacherComplianceRate'),
    total_expiring_soon: num(raw, 'total_expiring_soon', 'totalExpiringSoon'),
    total_expired: num(raw, 'total_expired', 'totalExpired'),
  };
}

/**
 * @param categorySlug When set, stats are scoped to that compliance category; document lists are skipped (stats-only).
 */
export const useComplianceData = (
  schoolId?: string,
  branchId?: string,
  categorySlug?: string,
) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocument[]>([]);
  const [expiredDocs, setExpiredDocs] = useState<ExpiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComplianceData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      let targetSchoolId = schoolId;
      if (!isAdmin && !schoolId && user.schoolId) {
        targetSchoolId = user.schoolId;
      }

      if (!targetSchoolId) {
        setStats(null);
        setExpiringDocs([]);
        setExpiredDocs([]);
        setLoading(false);
        return;
      }

      const statsOnly = !!categorySlug;

      const statsRes = await analyticsService.getComplianceStats({
        schoolId: targetSchoolId,
        branchId,
        categorySlug,
      });

      const rawStats = (Array.isArray(statsRes) ? statsRes[0] : statsRes) as Record<
        string,
        unknown
      > | null;
      if (rawStats && typeof rawStats === 'object') {
        setStats(normalizeComplianceStats(rawStats));
      } else {
        setStats(null);
      }

      if (statsOnly) {
        setExpiringDocs([]);
        setExpiredDocs([]);
        return;
      }

      const [expiringData, expiredData] = await Promise.all([
        analyticsService.getExpiringDocuments({
          schoolId: targetSchoolId,
          days: 60,
        }),
        analyticsService.getExpiredDocuments({ schoolId: targetSchoolId }),
      ]);

      let filteredExpiring = expiringData || [];
      let filteredExpired = expiredData || [];

      if (branchId && targetSchoolId) {
        const [branchStudents, branchTeachers] = await Promise.all([
          schoolService
            .listStudents(targetSchoolId)
            .then((list) =>
              (list as { branchId?: string | null }[]).filter(
                (p) => p.branchId === branchId,
              ),
            ),
          api
            .get(
              `/schools/${targetSchoolId}/users?role=TEACHER&branchId=${branchId}&limit=500`,
            )
            .then(unwrapList),
        ]);

        const branchStudentIds = new Set((branchStudents || []).map((s: { id: string }) => s.id));
        const branchTeacherIds = new Set((branchTeachers || []).map((t: { id: string }) => t.id));

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
    } catch (err: unknown) {
      console.error('Error fetching compliance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, [user, schoolId, branchId, isAdmin, categorySlug]);

  useEffect(() => {
    void fetchComplianceData();
  }, [fetchComplianceData]);

  return {
    stats,
    expiringDocs,
    expiredDocs,
    loading,
    error,
    refresh: fetchComplianceData,
  };
};

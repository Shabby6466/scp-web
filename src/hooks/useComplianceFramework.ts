import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, unwrapList } from '@/lib/api';
import { complianceService } from '@/services/complianceService';
import { useUserRole } from './useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type ComplianceFrequency = 'one_time' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type ComplianceStatus = 'not_started' | 'in_progress' | 'complete' | 'overdue' | 'not_applicable';
export type EvidenceType = 'document' | 'photo' | 'log' | 'link';
export type RiskLevel = 'low' | 'medium' | 'high';

export type InspectionProgramCategory = 'doh' | 'facility_safety';

export interface InspectionType {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  /** Backend / TypeORM camelCase `category` is normalized in fetch when needed */
  category?: InspectionProgramCategory | null;
  is_system_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ComplianceRequirement {
  id: string;
  school_id: string;
  inspection_type_id: string;
  title: string;
  description: string | null;
  tags: string[];
  owner_user_id: string | null;
  frequency: ComplianceFrequency;
  interval_value: number;
  due_date: string | null;
  next_due_date: string | null;
  status: ComplianceStatus;
  last_completed_at: string | null;
  requires_review: boolean;
  evidence_required: boolean;
  risk_level: RiskLevel;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
  owner_name?: string;
}

export interface ComplianceEvidence {
  id: string;
  requirement_id: string;
  school_id: string;
  evidence_type: EvidenceType;
  document_id: string | null;
  file_path: string | null;
  url: string | null;
  note: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface InspectionStats {
  inspection_type_id: string;
  inspection_name: string;
  total_requirements: number;
  completed_count: number;
  overdue_count: number;
  due_30_days: number;
  due_60_days: number;
  due_90_days: number;
  readiness_score: number;
}

/** `/analytics/compliance/stats` returns document summary fields, not per-type rows — derive from requirements. */
function buildInspectionStats(
  inspectionTypes: InspectionType[],
  requirements: ComplianceRequirement[],
): InspectionStats[] {
  const today = new Date().toISOString().split('T')[0];
  const addDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };
  const end30 = addDays(30);
  const end60 = addDays(60);
  const end90 = addDays(90);

  return inspectionTypes.map((type) => {
    const reqs = requirements.filter((r) => r.inspection_type_id === type.id);
    const total = reqs.length;
    const completed = reqs.filter((r) => r.status === 'complete').length;
    const overdue = reqs.filter((r) => r.status === 'overdue').length;

    const incompleteWithDue = reqs.filter(
      (r) => r.status !== 'complete' && r.next_due_date,
    );
    const due30 = incompleteWithDue.filter(
      (r) => r.next_due_date! >= today && r.next_due_date! <= end30,
    ).length;
    const due60 = incompleteWithDue.filter(
      (r) => r.next_due_date! > end30 && r.next_due_date! <= end60,
    ).length;
    const due90 = incompleteWithDue.filter(
      (r) => r.next_due_date! > end60 && r.next_due_date! <= end90,
    ).length;

    return {
      inspection_type_id: type.id,
      inspection_name: type.name,
      total_requirements: total,
      completed_count: completed,
      overdue_count: overdue,
      due_30_days: due30,
      due_60_days: due60,
      due_90_days: due90,
      readiness_score: total > 0 ? Math.round((completed / total) * 100) : 100,
    };
  });
}

export const useComplianceFramework = (schoolId?: string | null) => {
  const { user } = useAuth();
  const { schoolId: userSchoolId, isAdmin } = useUserRole();
  const [inspectionTypes, setInspectionTypes] = useState<InspectionType[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetSchoolId = schoolId || userSchoolId;

  const fetchInspectionTypes = useCallback(async () => {
    if (!targetSchoolId) return;

    const raw = await complianceService.listInspectionTypes(targetSchoolId);
    const list = unwrapList<InspectionType & { category?: InspectionProgramCategory | null }>(raw);
    const normalized = list.map((row) => {
      const r = row as InspectionType & { category?: InspectionProgramCategory | null };
      const category = r.category ?? null;
      return { ...r, category };
    });
    setInspectionTypes(normalized);
    return normalized;
  }, [targetSchoolId]);

  const fetchRequirements = useCallback(async (inspectionTypeId?: string) => {
    if (!targetSchoolId) return;

    const params: Record<string, string> = {};
    if (inspectionTypeId) params.inspectionTypeId = inspectionTypeId;

    const data = await complianceService.listRequirements(targetSchoolId, params);
    const requirementsWithCount = (data || []).map((req: any) => ({
      ...req,
      evidence_count: req.evidence_count ?? req.compliance_evidence?.length ?? 0,
      compliance_evidence: undefined,
    }));

    setRequirements(requirementsWithCount);
    return requirementsWithCount;
  }, [targetSchoolId]);

  const stats = useMemo(
    () => buildInspectionStats(inspectionTypes, requirements),
    [inspectionTypes, requirements],
  );

  const fetchAll = useCallback(async () => {
    if (!user || !targetSchoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchInspectionTypes(), fetchRequirements()]);
    } catch (err: any) {
      console.error('Error fetching compliance data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, targetSchoolId, fetchInspectionTypes, fetchRequirements]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createInspectionType = async (
    data: Partial<InspectionType>,
    options?: { quiet?: boolean },
  ) => {
    if (!targetSchoolId || !user) return null;

    try {
      const newType = await complianceService.createInspectionType(targetSchoolId, {
        name: data.name!,
        description: data.description,
        category: data.category,
      });

      await fetchInspectionTypes();
      if (!options?.quiet) {
        toast({ title: 'Success', description: 'Inspection type created' });
      }
      return newType as InspectionType & { id: string };
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    }
  };

  const createRequirement = async (data: Partial<ComplianceRequirement>) => {
    if (!targetSchoolId || !user) return null;

    try {
      const newReq = await complianceService.createRequirement(targetSchoolId, {
        inspection_type_id: data.inspection_type_id!,
        title: data.title!,
        description: data.description,
        tags: data.tags || [],
        owner_user_id: data.owner_user_id,
        frequency: data.frequency || 'annual',
        interval_value: data.interval_value || 1,
        due_date: data.due_date,
        next_due_date: data.next_due_date || data.due_date,
        status: data.status || 'not_started',
        requires_review: data.requires_review || false,
        evidence_required: data.evidence_required ?? true,
        risk_level: data.risk_level || 'medium',
      });

      await fetchRequirements();
      toast({ title: 'Success', description: 'Requirement created' });
      return newReq;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    }
  };

  const updateRequirement = async (id: string, updates: Partial<ComplianceRequirement>) => {
    try {
      await complianceService.updateRequirement(id, updates);
      await fetchRequirements();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const markRequirementComplete = async (id: string) => {
    const requirement = requirements.find(r => r.id === id);
    if (!requirement) return false;

    const now = new Date().toISOString();
    let nextDueDate: string | null = null;

    if (requirement.frequency !== 'one_time') {
      const months = {
        monthly: 1,
        quarterly: 3,
        semiannual: 6,
        annual: 12,
      }[requirement.frequency] * (requirement.interval_value || 1);

      const next = new Date();
      next.setMonth(next.getMonth() + months);
      nextDueDate = next.toISOString().split('T')[0];
    }

    return updateRequirement(id, {
      status: 'complete',
      last_completed_at: now,
      next_due_date: nextDueDate,
    });
  };

  const deleteRequirement = async (id: string) => {
    try {
      await complianceService.deleteRequirement(id);
      await fetchRequirements();
      toast({ title: 'Success', description: 'Requirement deleted' });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const addEvidence = async (data: Partial<ComplianceEvidence>) => {
    if (!targetSchoolId || !user) return null;

    try {
      const newEvidence = await api.post('/compliance/evidence', {
        requirement_id: data.requirement_id!,
        school_id: targetSchoolId,
        evidence_type: data.evidence_type!,
        document_id: data.document_id,
        file_path: data.file_path,
        url: data.url,
        note: data.note,
        uploaded_by: user.id,
      });

      await fetchRequirements();
      toast({ title: 'Success', description: 'Evidence added' });
      return newEvidence;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    }
  };

  const getEvidenceForRequirement = async (requirementId: string) => {
    try {
      const data = await api.get(`/compliance/evidence?requirementId=${requirementId}`);
      return data || [];
    } catch (err) {
      console.error('Error fetching evidence:', err);
      return [];
    }
  };

  const deleteEvidence = async (id: string) => {
    try {
      await api.delete(`/compliance/evidence/${id}`);
      await fetchRequirements();
      toast({ title: 'Success', description: 'Evidence removed' });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  return {
    inspectionTypes,
    requirements,
    stats,
    loading,
    error,
    refresh: fetchAll,
    fetchRequirements,
    createInspectionType,
    createRequirement,
    updateRequirement,
    markRequirementComplete,
    deleteRequirement,
    addEvidence,
    getEvidenceForRequirement,
    deleteEvidence,
  };
};

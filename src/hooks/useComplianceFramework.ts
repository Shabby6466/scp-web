import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { complianceService } from '@/services/complianceService';
import { useUserRole } from './useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type ComplianceFrequency = 'one_time' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type ComplianceStatus = 'not_started' | 'in_progress' | 'complete' | 'overdue' | 'not_applicable';
export type EvidenceType = 'document' | 'photo' | 'log' | 'link';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface InspectionType {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
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

export const useComplianceFramework = (schoolId?: string | null) => {
  const { user } = useAuth();
  const { schoolId: userSchoolId, isAdmin } = useUserRole();
  const [inspectionTypes, setInspectionTypes] = useState<InspectionType[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [stats, setStats] = useState<InspectionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetSchoolId = schoolId || userSchoolId;

  const fetchInspectionTypes = useCallback(async () => {
    if (!targetSchoolId) return;

    const data = await complianceService.listInspectionTypes(targetSchoolId);
    setInspectionTypes(data || []);
    return data;
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

  const fetchStats = useCallback(async () => {
    if (!targetSchoolId) return;

    try {
      const data = await api.get(`/compliance/stats?schoolId=${targetSchoolId}`);
      setStats(data || []);
      return data;
    } catch (err) {
      console.error('Error fetching compliance stats:', err);
      return [];
    }
  }, [targetSchoolId]);

  const fetchAll = useCallback(async () => {
    if (!user || !targetSchoolId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchInspectionTypes(),
        fetchRequirements(),
        fetchStats(),
      ]);
    } catch (err: any) {
      console.error('Error fetching compliance data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, targetSchoolId, fetchInspectionTypes, fetchRequirements, fetchStats]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createInspectionType = async (data: Partial<InspectionType>) => {
    if (!targetSchoolId || !user) return null;

    try {
      const newType = await complianceService.createInspectionType(targetSchoolId, {
        name: data.name!,
        description: data.description,
      });

      await fetchInspectionTypes();
      toast({ title: 'Success', description: 'Inspection type created' });
      return newType;
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
      await fetchStats();
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
      await fetchStats();
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
      await fetchStats();
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

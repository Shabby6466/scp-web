import { useState, useEffect, useCallback } from 'react';
import { certificationService } from '@/services/certificationService';
import { useToast } from '@/hooks/use-toast';
import { unwrapList } from '@/lib/api';

export interface CertificationType {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  default_validity_months: number | null;
  evidence_types: string[];
  applies_to: 'staff' | 'vendor' | 'facility' | 'other';
  is_system_default: boolean;
  created_at: string;
}

export interface CertificationRecord {
  id: string;
  school_id: string;
  certification_type_id: string | null;
  applies_to: 'staff' | 'vendor' | 'facility' | 'other';
  subject_id: string | null;
  subject_name: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  status: 'active' | 'expiring' | 'expired' | 'not_applicable';
  owner_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  certification_type?: CertificationType;
  evidence_count?: number;
}

export interface CertificationEvidence {
  id: string;
  certification_record_id: string;
  school_id: string;
  evidence_type: 'document' | 'photo' | 'log' | 'link';
  document_id: string | null;
  file_path: string | null;
  url: string | null;
  note: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface CertificationStats {
  total: number;
  active: number;
  expiring: number;
  expired: number;
}

export const useCertifications = (schoolId?: string | null) => {
  const [certificationTypes, setCertificationTypes] = useState<CertificationType[]>([]);
  const [records, setRecords] = useState<CertificationRecord[]>([]);
  const [stats, setStats] = useState<CertificationStats>({ total: 0, active: 0, expiring: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCertificationTypes = useCallback(async () => {
    if (!schoolId) return [];
    try {
      const data = await certificationService.listTypes(schoolId);
      return unwrapList<CertificationType>(data);
    } catch (err) {
      console.error('Error fetching certification types:', err);
      return [];
    }
  }, [schoolId]);

  const fetchRecords = useCallback(async () => {
    if (!schoolId) return [];

    try {
      const data = await certificationService.listRecords(schoolId);
      return unwrapList<CertificationRecord>(data);
    } catch (err) {
      console.error('Error fetching certification records:', err);
      return [];
    }
  }, [schoolId]);

  const calculateStats = useCallback((records: CertificationRecord[]) => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return records.reduce(
      (acc, record) => {
        acc.total++;
        if (record.status === 'not_applicable') return acc;

        if (record.expiry_date) {
          const expiryDate = new Date(record.expiry_date);
          if (expiryDate < now) {
            acc.expired++;
          } else if (expiryDate <= thirtyDaysFromNow) {
            acc.expiring++;
          } else {
            acc.active++;
          }
        } else {
          acc.active++;
        }
        return acc;
      },
      { total: 0, active: 0, expiring: 0, expired: 0 }
    );
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [types, recordsList] = await Promise.all([
        fetchCertificationTypes(),
        fetchRecords(),
      ]);
      setCertificationTypes(types);
      setRecords(recordsList);
      setStats(calculateStats(recordsList));
    } catch (err) {
      setError('Failed to load certifications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchCertificationTypes, fetchRecords, calculateStats]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createRecord = async (record: Omit<CertificationRecord, 'id' | 'created_at' | 'updated_at' | 'certification_type' | 'evidence_count'>) => {
    try {
      const sid = record.school_id ?? schoolId;
      if (!sid) {
        toast({
          title: 'Error',
          description: 'School context is required to create a certification.',
          variant: 'destructive',
        });
        throw new Error('Missing schoolId');
      }
      const { school_id: _omitSchoolId, ...body } = record;
      const data = await certificationService.createRecord(sid, body);
      toast({ title: 'Success', description: 'Certification record created' });
      await fetchAll();
      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create certification record',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateRecord = async (id: string, updates: Partial<CertificationRecord>) => {
    if (!schoolId) {
      toast({
        title: 'Error',
        description: 'School context is required to update a certification.',
        variant: 'destructive',
      });
      throw new Error('Missing schoolId');
    }
    try {
      await certificationService.updateRecord(schoolId, id, updates);
      toast({ title: 'Success', description: 'Certification record updated' });
      await fetchAll();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update certification record',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteRecord = async (id: string) => {
    if (!schoolId) {
      toast({
        title: 'Error',
        description: 'School context is required to delete a certification.',
        variant: 'destructive',
      });
      throw new Error('Missing schoolId');
    }
    try {
      await certificationService.deleteRecord(schoolId, id);
      toast({ title: 'Success', description: 'Certification record deleted' });
      await fetchAll();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete certification record',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const addEvidence = async (evidence: Omit<CertificationEvidence, 'id' | 'created_at'>) => {
    try {
      const data = await certificationService.addEvidence(evidence.certification_record_id, evidence);
      toast({ title: 'Success', description: 'Evidence added' });
      await fetchAll();
      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add evidence',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const getEvidenceForRecord = async (recordId: string): Promise<CertificationEvidence[]> => {
    try {
      const data = await certificationService.listEvidence(recordId);
      return (data || []) as CertificationEvidence[];
    } catch (err) {
      console.error('Error fetching evidence:', err);
      return [];
    }
  };

  const deleteEvidence = async (evidenceId: string) => {
    try {
      await certificationService.deleteEvidence(evidenceId);
      toast({ title: 'Success', description: 'Evidence deleted' });
      await fetchAll();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete evidence',
        variant: 'destructive',
      });
      throw err;
    }
  };

  return {
    certificationTypes,
    records,
    stats,
    loading,
    error,
    refresh: fetchAll,
    createRecord,
    updateRecord,
    deleteRecord,
    addEvidence,
    getEvidenceForRecord,
    deleteEvidence,
  };
};

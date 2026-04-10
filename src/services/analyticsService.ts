import { api } from '@/lib/api';

export const analyticsService = {
  getComplianceStats: (params?: { schoolId?: string; branchId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.branchId) qs.set('branchId', params.branchId);
    return api.get(`/analytics/compliance/stats?${qs.toString()}`);
  },
  getExpiringDocuments: (params?: { schoolId?: string; branchId?: string; days?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.branchId) qs.set('branchId', params.branchId);
    if (params?.days) qs.set('days', String(params.days));
    if (params?.limit) qs.set('limit', String(params.limit));
    return api.get(`/analytics/documents/expiring?${qs.toString()}`);
  },
  getExpiredDocuments: (params?: { schoolId?: string; branchId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.branchId) qs.set('branchId', params.branchId);
    if (params?.limit) qs.set('limit', String(params.limit));
    return api.get(`/analytics/documents/expired?${qs.toString()}`);
  },
  getComplianceSummary: (schoolId?: string) => api.get(`/analytics/compliance${schoolId ? `?schoolId=${schoolId}` : ''}`),
  getDashboard: (schoolId?: string) => api.get(`/analytics/dashboard${schoolId ? `?schoolId=${schoolId}` : ''}`),
};

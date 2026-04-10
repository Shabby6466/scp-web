import { api } from '@/lib/api';

export const auditService = {
  list: (params?: { action?: string; userId?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.action) qs.set('action', params.action);
    if (params?.userId) qs.set('userId', params.userId);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    return api.get(`/audit-events?${qs.toString()}`);
  },
};

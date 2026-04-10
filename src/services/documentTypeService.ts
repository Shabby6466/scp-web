import { api } from '@/lib/api';

export const documentTypeService = {
  list: (params?: { schoolId?: string; targetRole?: string; includeInactive?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.targetRole) qs.set('targetRole', params.targetRole);
    if (params?.includeInactive) qs.set('includeInactive', 'true');
    return api.get(`/document-types?${qs.toString()}`);
  },
  getById: (id: string) => api.get(`/document-types/${id}`),
  create: (data: any) => api.post('/document-types', data),
  update: (id: string, data: any) => api.patch(`/document-types/${id}`, data),
  remove: (id: string) => api.delete(`/document-types/${id}`),
  assign: (documentTypeId: string, userIds: string[]) => api.post(`/document-types/${documentTypeId}/assign`, { userIds }),
  unassign: (documentTypeId: string, userIds: string[]) => api.post(`/document-types/${documentTypeId}/unassign`, { userIds }),
};

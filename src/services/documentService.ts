import { api } from '@/lib/api';

export const documentService = {
  presign: (data: { documentTypeId: string; ownerUserId: string; fileName: string; mimeType: string; sizeBytes: number }) =>
    api.post('/documents/presign', data),
  complete: (data: { documentTypeId: string; ownerUserId: string; s3Key: string; fileName: string; mimeType: string; sizeBytes: number; notes?: string }) =>
    api.post('/documents/complete', data),
  getById: (id: string) => api.get(`/documents/${id}`),
  getDownloadUrl: (id: string) => api.get(`/documents/${id}/download-url`),
  review: (id: string, data: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
    api.patch(`/documents/${id}/review`, data),
  verify: (id: string) => api.patch(`/documents/${id}/verify`),
  search: (params?: { ownerUserId?: string; documentTypeId?: string; schoolId?: string; branchId?: string; status?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
    }
    return api.get(`/documents/search?${qs.toString()}`);
  },
  listByOwner: (ownerUserId: string) => api.get(`/documents/owner/${ownerUserId}`),
  getSummary: (ownerUserId: string) => api.get(`/documents/summary/${ownerUserId}`),
  getPerFormView: (ownerUserId: string) => api.get(`/documents/per-form/${ownerUserId}`),
};

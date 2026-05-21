import { api } from '@/lib/api';
import type { Document, DocumentReviewStatus } from '@/types/api';

export const documentService = {
  presign: (data: {
    requirementId: string;
    fileName: string;
    mimeType: string;
  }) =>
    api.post<{ uploadUrl?: string; presignedUrl?: string; s3Key: string; uploadToken?: string }>(
      '/documents/presign',
      data,
    ),

  complete: (data: {
    requirementId: string;
    values?: Record<string, unknown>;
    fileName?: string;
    s3Key?: string;
    mimeType?: string;
    sizeBytes?: number;
    issuedAt?: string;
    expiresAt?: string;
  }) => api.post<Document>('/documents/complete', data),

  getById: (id: string) => api.get<Document>(`/documents/${id}`),

  getDownloadUrl: (id: string) => api.get(`/documents/${id}/download-url`),

  review: (
    id: string,
    data: { status: DocumentReviewStatus; rejectionReason?: string },
  ) => api.patch<Document>(`/documents/${id}/review`, data),

  search: (params?: {
    ownerUserId?: string;
    documentTypeId?: string;
    schoolId?: string;
    branchId?: string;
    status?: string;
    query?: string;
    ownerRole?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') qs.set(k, String(v));
      });
    }
    return api.get(`/documents/search?${qs.toString()}`);
  },

  listByOwner: (ownerUserId: string) => api.get(`/documents/owner/${ownerUserId}`),

  getSummary: (ownerUserId: string) => api.get(`/documents/summary/${ownerUserId}`),

  getPerFormView: (ownerUserId: string) => api.get(`/documents/per-form/${ownerUserId}`),

  getAssignedSummary: () => api.get('/documents/assigned-summary'),
};

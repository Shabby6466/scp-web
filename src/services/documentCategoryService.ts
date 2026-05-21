import { api } from '@/lib/api';
import type { DocumentCategory } from '@/types/api';

export const documentCategoryService = {
  list: (params?: { schoolId?: string; branchId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.branchId) qs.set('branchId', params.branchId);
    const q = qs.toString();
    return api.get<DocumentCategory[]>(`/document-categories${q ? `?${q}` : ''}`);
  },

  getById: (id: string) => api.get<DocumentCategory>(`/document-categories/${id}`),

  create: (data: {
    name: string;
    slug?: string;
    description?: string;
    sortOrder?: number;
    schoolId?: string;
    branchId?: string;
  }) => api.post<DocumentCategory>('/document-categories', data),

  update: (
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) => api.patch<DocumentCategory>(`/document-categories/${id}`, data),

  remove: (id: string) => api.delete(`/document-categories/${id}`),
};

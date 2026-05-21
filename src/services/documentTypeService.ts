import { api } from '@/lib/api';
import type { DocumentType, DocumentTypeFieldDef, UserRole } from '@/types/api';

export type CreateDocumentTypePayload = {
  categoryId: string;
  name: string;
  description?: string;
  roles: UserRole[];
  renewalMonths?: number | null;
  fields?: DocumentTypeFieldDef[];
  requiresFile?: boolean;
  sortOrder?: number;
  schoolId?: string;
  branchId?: string;
};

export const documentTypeService = {
  list: (params?: {
    schoolId?: string;
    branchId?: string;
    categoryId?: string;
    role?: UserRole | string;
    includeInactive?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.branchId) qs.set('branchId', params.branchId);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.role) qs.set('role', params.role);
    if (params?.includeInactive) qs.set('includeInactive', 'true');
    const q = qs.toString();
    return api.get<DocumentType[]>(`/document-types${q ? `?${q}` : ''}`);
  },

  getById: (id: string) => api.get<DocumentType>(`/document-types/${id}`),

  create: (data: CreateDocumentTypePayload) =>
    api.post<DocumentType>('/document-types', data),

  update: (id: string, data: Partial<CreateDocumentTypePayload & { isActive?: boolean }>) =>
    api.patch<DocumentType>(`/document-types/${id}`, data),

  remove: (id: string) => api.delete(`/document-types/${id}`),

  materializeRequirements: (id: string) =>
    api.post<{ created: number }>(`/document-types/${id}/materialize-requirements`),
};

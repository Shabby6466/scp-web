import { api } from '@/lib/api';

/** Body accepted by POST/PATCH branch APIs (matches backend DTOs). */
export type BranchWritePayload = {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  totalCapacity?: number | null;
  isPrimary?: boolean;
  notes?: string | null;
  branchDirectorUserId?: string | null;
};

export const branchService = {
  listBySchool: (schoolId: string) => api.get(`/schools/${schoolId}/branches`),
  getById: (id: string) => api.get(`/branches/${id}`),
  create: (schoolId: string, body: BranchWritePayload) =>
    api.post(`/schools/${schoolId}/branches`, body),
  update: (id: string, body: Partial<BranchWritePayload>) =>
    api.patch(`/branches/${id}`, body),
  remove: (id: string) => api.delete(`/branches/${id}`),
};

import { api } from '@/lib/api';
import type { Requirement, RequirementStatus, UserRole } from '@/types/api';

export const requirementService = {
  mine: () => api.get<Requirement[]>('/requirements/mine'),

  list: (params?: {
    branchId?: string;
    schoolId?: string;
    status?: RequirementStatus;
    userId?: string;
  }) => api.get<Requirement[]>('/requirements', { params }),

  getById: (id: string) => api.get<Requirement>(`/requirements/${id}`),

  create: (data: { userId: string; documentTypeId: string; dueDate?: string }) =>
    api.post<Requirement>('/requirements', data),

  update: (
    id: string,
    data: Partial<{
      status: RequirementStatus;
      dueDate: string | null;
      nextDueDate: string | null;
    }>,
  ) => api.patch<Requirement>(`/requirements/${id}`, data),

  waive: (id: string, reason?: string) =>
    api.post<Requirement>(`/requirements/${id}/waive`, { reason }),

  materializeForUser: (userId: string) =>
    api.post<{ created: number }>(`/requirements/materialize-for-user/${userId}`),
};

/** @deprecated use RequirementStatus from types/api */
export type AssignmentStatus = RequirementStatus;

/** @deprecated use Requirement from types/api */
export type RequirementAssignment = Requirement;

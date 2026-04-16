import { api } from '@/lib/api';

export const studentProfileService = {
  getById: (id: string) => api.get(`/student-profiles/${id}`),
  update: (
    id: string,
    data: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gradeLevel?: string | null;
      schoolId?: string | null;
      branchId?: string | null;
    },
  ) => api.patch(`/student-profiles/${id}`, data),
};

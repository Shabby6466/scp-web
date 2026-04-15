import { api } from '@/lib/api';

export const studentProfileService = {
  getById: (id: string) => api.get(`/student-profiles/${id}`),
};

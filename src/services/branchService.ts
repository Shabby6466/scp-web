import { api } from '@/lib/api';

export const branchService = {
  listBySchool: (schoolId: string) => api.get(`/branches?schoolId=${schoolId}`),
  getById: (id: string) => api.get(`/branches/${id}`),
  create: (data: any) => api.post('/branches', data),
  update: (id: string, data: any) => api.patch(`/branches/${id}`, data),
  remove: (id: string) => api.delete(`/branches/${id}`),
};

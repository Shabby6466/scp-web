import { api } from '@/lib/api';

export const branchService = {
  listBySchool: (schoolId: string) =>
    api.get(`/schools/${schoolId}/branches`),
  getById: (id: string) => api.get(`/branches/${id}`),
  create: (data: { schoolId: string; branchName?: string; name?: string }) => {
    const { schoolId, branchName, name, ...rest } = data;
    const payload = {
      name: (name ?? branchName ?? 'Location').trim(),
      ...(rest as { branchDirectorUserId?: string }),
    };
    return api.post(`/schools/${schoolId}/branches`, payload);
  },
  update: (id: string, data: any) => api.patch(`/branches/${id}`, data),
  remove: (id: string) => api.delete(`/branches/${id}`),
};

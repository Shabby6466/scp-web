import { api } from '@/lib/api';

export const userService = {
  list: (params?: { role?: string; schoolId?: string; branchId?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.role) qs.set('role', params.role);
    if (params?.schoolId) qs.set('schoolId', params.schoolId);
    if (params?.branchId) qs.set('branchId', params.branchId);
    if (params?.search) qs.set('search', params.search);
    return api.get(`/users?${qs.toString()}`);
  },
  getById: (id: string) => api.get(`/users/${id}`),
  getDetail: (id: string) => api.get(`/users/${id}/detail`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  listTeachers: (schoolId: string) => api.get(`/users?role=TEACHER&schoolId=${schoolId}`),
  listStudents: (schoolId: string) => api.get(`/users?role=STUDENT&schoolId=${schoolId}`),
  listBySchool: (schoolId: string) => api.get(`/users?schoolId=${schoolId}`),
  search: (query: string) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
};

import { api, unwrapList } from '@/lib/api';

export const schoolService = {
  list: () => api.get('/schools'),
  /** Student profiles enrolled at this school (not user accounts). */
  listStudents: async (schoolId: string) => {
    const body = await api.get(`/schools/${schoolId}/students`);
    return unwrapList(body);
  },
  getById: (id: string) => api.get(`/schools/${id}`),
  create: (data: any) => api.post('/schools', data),
  update: (id: string, data: any) => api.patch(`/schools/${id}`, data),
  approve: (id: string) => api.patch(`/schools/${id}/approve`),
  remove: (id: string) => api.delete(`/schools/${id}`),
};

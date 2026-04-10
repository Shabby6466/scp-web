import { api } from '@/lib/api';

export const schoolService = {
  list: () => api.get('/schools'),
  getById: (id: string) => api.get(`/schools/${id}`),
  create: (data: any) => api.post('/schools', data),
  update: (id: string, data: any) => api.patch(`/schools/${id}`, data),
  approve: (id: string) => api.patch(`/schools/${id}/approve`),
  remove: (id: string) => api.delete(`/schools/${id}`),
};
